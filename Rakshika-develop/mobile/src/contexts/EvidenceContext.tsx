import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { CameraView, Camera } from 'expo-camera';
import * as Battery from 'expo-battery';
import * as FileSystem from 'expo-file-system';
import NetInfo from '@react-native-community/netinfo';
import { useLocation } from './LocationContext';
import { EvidenceDatabase } from '../services/evidenceDatabase';
import evidenceService from '../services/evidenceService';
import { ConnectivityMonitor } from '../mesh';

interface EvidenceContextType {
  isRecording: boolean;
  startRecording: (emergencyId: string) => Promise<void>;
  stopRecording: () => Promise<void>;
  syncEvidenceQueue: () => Promise<{ synced: number; failed: number }>;
}

const EvidenceRecordingContext = createContext<EvidenceContextType | undefined>(undefined);

export const EvidenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { location } = useLocation();
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');

  // Refs for tracking recording state across asynchronous code
  const isRecordingRef = useRef(false);
  const currentEmergencyIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioRecordingRef = useRef<Audio.Recording | null>(null);
  const videoRecordingPromiseRef = useRef<Promise<any> | null>(null);
  const limitsIntervalRef = useRef<any>(null);

  // Sync function exported and locally accessible
  const syncQueue = useCallback(async () => {
    const isOnline = await ConnectivityMonitor.isOnline();
    if (!isOnline) {
      console.log('EvidenceSync: Device offline, skipping sync');
      return { synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;

    try {
      const pending = await EvidenceDatabase.getPendingEvidence();
      if (pending.length === 0) return { synced: 0, failed: 0 };

      console.log(`EvidenceSync: Found ${pending.length} pending items to sync`);

      for (const record of pending) {
        try {
          await EvidenceDatabase.updateStatus(record.id, 'uploading');

          console.log(`EvidenceSync: Uploading ${record.type} for emergency ${record.emergencyId}`);
          await evidenceService.uploadEvidence({
            emergencyId: record.emergencyId,
            fileUri: record.fileUri,
            type: record.type,
            metadata: JSON.parse(record.metadata),
          });

          // Delete from database after successful sync
          await EvidenceDatabase.deleteEvidence(record.id);

          // Clear local cache file to preserve device storage
          try {
            await FileSystem.deleteAsync(record.fileUri, { idempotent: true });
            console.log(`EvidenceSync: Cleaned up local file ${record.fileUri}`);
          } catch (fileErr) {
            console.warn(`EvidenceSync: Failed to delete local file ${record.fileUri}`, fileErr);
          }

          synced++;
        } catch (err) {
          console.error(`EvidenceSync: Sync failed for record ${record.id}`, err);
          await EvidenceDatabase.incrementRetry(record.id);
          failed++;
        }
      }
    } catch (err) {
      console.error('EvidenceSync: Error running queue sync', err);
    }

    return { synced, failed };
  }, []);

  // Monitor storage and max duration limits
  const checkRecordingLimits = useCallback(async () => {
    if (!isRecordingRef.current) return;

    // 1. Duration check (max 5 minutes)
    const durationMs = Date.now() - startTimeRef.current;
    const maxDurationMs = 5 * 60 * 1000;
    if (durationMs >= maxDurationMs) {
      console.warn('EvidenceContext: Maximum recording duration reached. Auto-stopping.');
      await stopRecording();
      return;
    }

    // 2. Storage space check (< 100MB remaining is critical)
    if (Platform.OS !== 'web') {
      try {
        const freeSpace = await FileSystem.getFreeDiskStorageAsync();
        const criticalThreshold = 100 * 1024 * 1024; // 100 MB
        if (freeSpace < criticalThreshold) {
          console.warn('EvidenceContext: Disk storage critically low. Auto-stopping.');
          await stopRecording();
          return;
        }
      } catch (err) {
        console.warn('EvidenceContext: Storage capacity check failed', err);
      }
    }
  }, [syncQueue]);

  const startRecording = async (emergencyId: string) => {
    if (isRecordingRef.current) return;

    console.log(`EvidenceContext: Starting "black box" evidence recording for ${emergencyId}`);
    isRecordingRef.current = true;
    setIsRecording(true);
    currentEmergencyIdRef.current = emergencyId;
    startTimeRef.current = Date.now();

    // Start checking limits periodically
    limitsIntervalRef.current = setInterval(checkRecordingLimits, 5000);

    // 1. Request Permissions
    try {
      const audioPerm = await Audio.requestPermissionsAsync();
      const cameraPerm = await Camera.requestCameraPermissionsAsync();

      if (audioPerm.status === 'granted') {
        await startAudioRecording();
      } else {
        console.warn('EvidenceContext: Audio recording permission denied');
      }

      if (cameraPerm.status === 'granted') {
        setIsRecordingVideo(true); // Mounts the CameraView to start recording
      } else {
        console.warn('EvidenceContext: Camera recording permission denied');
      }
    } catch (err) {
      console.error('EvidenceContext: Failed to initialize permissions & recorders', err);
    }
  };

  const startAudioRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      audioRecordingRef.current = recording;
      console.log('EvidenceContext: Audio recording successfully started');
    } catch (err) {
      console.error('EvidenceContext: Failed starting audio recording', err);
    }
  };

  // Callback ref to start video capture when the CameraView is ready
  const onCameraReady = useCallback((camera: any) => {
    if (!camera || !isRecordingRef.current) return;

    console.log('EvidenceContext: CameraView mounted, initializing video capture');
    
    // Execute recordAsync asynchronously within a separate task context
    (async () => {
      try {
        const recordingPromise = camera.recordAsync({
          codec: 'mp4',
          quality: '480p', // standard resolution to minimize network payload size
          mute: true, // muted since we are recording audio independently via expo-av
        });

        videoRecordingPromiseRef.current = recordingPromise;
      } catch (err) {
        console.error('EvidenceContext: Error during video capture invocation', err);
      }
    })();
  }, []);

  const stopRecording = async () => {
    if (!isRecordingRef.current) return;

    console.log('EvidenceContext: Stopping evidence recording');
    isRecordingRef.current = false;
    setIsRecording(false);

    if (limitsIntervalRef.current) {
      clearInterval(limitsIntervalRef.current);
      limitsIntervalRef.current = null;
    }

    const emergencyId = currentEmergencyIdRef.current;
    currentEmergencyIdRef.current = null;

    let audioUri: string | null = null;
    let videoUri: string | null = null;

    // 1. Unload audio
    try {
      if (audioRecordingRef.current) {
        await audioRecordingRef.current.stopAndUnloadAsync();
        audioUri = audioRecordingRef.current.getURI();
        audioRecordingRef.current = null;
        console.log('EvidenceContext: Audio recording saved', audioUri);
      }
    } catch (err) {
      console.error('EvidenceContext: Failed stopping audio recording', err);
    }

    // 2. Unload video
    try {
      if (isRecordingVideo) {
        setIsRecordingVideo(false); // Unmounting triggers resolve of recordAsync
        if (videoRecordingPromiseRef.current) {
          const result = await videoRecordingPromiseRef.current;
          videoUri = result.uri;
          videoRecordingPromiseRef.current = null;
          console.log('EvidenceContext: Video recording saved', videoUri);
        }
      }
    } catch (err) {
      console.error('EvidenceContext: Failed stopping video recording', err);
    }

    // 3. Collect device metrics metadata
    let batteryLevel = -1;
    let networkType = 'unknown';
    let isOnline = false;

    try {
      batteryLevel = await Battery.getBatteryLevelAsync();
    } catch (err) {
      console.warn('EvidenceContext: Failed to obtain battery status', err);
    }

    try {
      const netState = await NetInfo.fetch();
      networkType = netState.type;
      isOnline = !!(netState.isConnected && netState.isInternetReachable);
    } catch (err) {
      console.warn('EvidenceContext: Failed to obtain network status', err);
    }

    const metadata = {
      batteryLevel,
      networkType,
      isOnline,
      timestamp: Date.now(),
      coords: location
        ? { latitude: location.coords.latitude, longitude: location.coords.longitude }
        : { latitude: 28.6139, longitude: 77.2090 }, // Delhi fallback
      durationMs: Date.now() - startTimeRef.current,
    };

    // 4. Enqueue to offline SQLite database immediately
    if (emergencyId) {
      if (audioUri) {
        await EvidenceDatabase.enqueueEvidence(emergencyId, audioUri, 'audio', metadata);
      }
      if (videoUri) {
        await EvidenceDatabase.enqueueEvidence(emergencyId, videoUri, 'video', metadata);
      }
    }

    // 5. Trigger upload queue sync
    await syncQueue();
  };

  return (
    <EvidenceRecordingContext.Provider
      value={{
        isRecording,
        startRecording,
        stopRecording,
        syncEvidenceQueue: syncQueue,
      }}
    >
      {children}

      {/* Background Camera recorder mounting */}
      {isRecordingVideo && Platform.OS !== 'web' && (
        <View style={styles.hiddenCameraContainer}>
          <CameraView
            ref={onCameraReady}
            mode="video"
            facing={cameraFacing}
            style={styles.hiddenCamera}
          />
        </View>
      )}
    </EvidenceRecordingContext.Provider>
  );
};

export const useEvidence = () => {
  const context = useContext(EvidenceRecordingContext);
  if (context === undefined) {
    throw new Error('useEvidence must be used within an EvidenceProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  hiddenCameraContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 1,
    height: 1,
    overflow: 'hidden',
    zIndex: -999,
  },
  hiddenCamera: {
    width: 1,
    height: 1,
    opacity: 0.01,
  },
});
