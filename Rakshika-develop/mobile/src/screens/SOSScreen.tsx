import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSOS } from '../contexts/SOSContext';

export const SOSScreen = () => {
  const { activeEmergency, cancelSOS } = useSOS();
  const [cancelling, setCancelling] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Pulse animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;

  // Start pulsing when SOS is active
  useEffect(() => {
    if (!activeEmergency) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [activeEmergency]);

  // Elapsed time counter
  useEffect(() => {
    if (!activeEmergency) return;
    const interval = setInterval(() => {
      const startedAt = activeEmergency.startedAt
        ? new Date(activeEmergency.startedAt).getTime()
        : Date.now();
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeEmergency]);

  const formatElapsed = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelSOS('user_cancelled');
    } finally {
      setCancelling(false);
    }
  };

  if (!activeEmergency) {
    return (
      <View style={styles.container}>
        <Ionicons name="shield-checkmark" size={64} color="#22c55e" />
        <Text style={styles.safeText}>No active emergency</Text>
        <Text style={styles.safeSubText}>You are safe. Shake or tap SOS to trigger an alert.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.activeSOSBg]}>
      {/* Pulsing ring */}
      <View style={styles.pulseContainer}>
        <Animated.View
          style={[
            styles.pulseRingOuter,
            {
              transform: [{ scale: pulseAnim }],
              opacity: pulseOpacity,
            },
          ]}
        />
        <View style={styles.sosCircle}>
          <Text style={styles.sosText}>SOS</Text>
          <Text style={styles.sosActive}>ACTIVE</Text>
        </View>
      </View>

      {/* Timer */}
      <View style={styles.timerRow}>
        <Ionicons name="time" size={16} color="#dc2626" />
        <Text style={styles.timerText}>{formatElapsed(elapsedSeconds)}</Text>
        <Text style={styles.timerLabel}>elapsed</Text>
      </View>

      {/* Info cards */}
      <View style={styles.infoGrid}>
        <View style={styles.infoCard}>
          <Ionicons name="navigate" size={20} color="#3b82f6" />
          <Text style={styles.infoCardLabel}>Location</Text>
          <Text style={styles.infoCardValue}>Sharing</Text>
        </View>
        <View style={styles.infoCard}>
          <Ionicons name="mic" size={20} color="#ef4444" />
          <Text style={styles.infoCardLabel}>Audio</Text>
          <Text style={styles.infoCardValue}>Recording</Text>
        </View>
        <View style={styles.infoCard}>
          <Ionicons name="videocam" size={20} color="#8b5cf6" />
          <Text style={styles.infoCardLabel}>Video</Text>
          <Text style={styles.infoCardValue}>Capturing</Text>
        </View>
      </View>

      {/* Trigger info */}
      <View style={styles.metaCard}>
        <Text style={styles.metaText}>
          Triggered via <Text style={styles.metaBold}>{activeEmergency.triggerType}</Text>
        </Text>
        <Text style={styles.metaText}>
          Contacts notified · Responders alerted
        </Text>
      </View>

      {/* Recording indicator */}
      <View style={styles.recordingCard}>
        <View style={styles.recDot} />
        <Text style={styles.recordingText}>Silent recording in progress…</Text>
      </View>

      {/* Cancel */}
      <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={cancelling}>
        {cancelling ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="close-circle" size={20} color="#fff" />
            <Text style={styles.cancelText}>Cancel SOS</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
  },
  activeSOSBg: {
    backgroundColor: '#fff5f5',
  },
  safeText: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  safeSubText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  pulseContainer: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  pulseRingOuter: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#ef4444',
  },
  sosCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    borderWidth: 4,
    borderColor: '#fca5a5',
  },
  sosText: {
    color: '#ffffff',
    fontSize: 38,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  sosActive: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 4,
    marginTop: 2,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc2626',
    fontVariant: ['tabular-nums'],
  },
  timerLabel: {
    fontSize: 13,
    color: '#9ca3af',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
    elevation: 2,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  infoCardLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
  infoCardValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
  },
  metaCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  metaText: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  metaBold: {
    fontWeight: 'bold',
    color: '#374151',
    textTransform: 'capitalize',
  },
  recordingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#fee2e2',
    marginBottom: 24,
    gap: 8,
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  recordingText: {
    color: '#1f2937',
    fontSize: 13,
    fontWeight: '500',
  },
  cancelBtn: {
    width: '100%',
    height: 52,
    backgroundColor: '#111827',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cancelText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

