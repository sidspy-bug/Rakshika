import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSOS } from '../contexts/SOSContext';

export const SOSScreen = () => {
  const { activeEmergency, cancelSOS } = useSOS();
  const [cancelling, setCancelling] = useState(false);

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
        <Text style={styles.text}>No active emergency</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.activeSOSBg]}>
      <View style={styles.pulseRing}>
        <Text style={styles.sosText}>SOS ACTIVE</Text>
      </View>
      <Text style={styles.metaText}>Triggered via: {activeEmergency.triggerType}</Text>
      <Text style={styles.metaText}>Started at: {new Date(activeEmergency.startedAt).toLocaleTimeString()}</Text>

      <View style={styles.recordingCard}>
        <View style={styles.recIndicator} />
        <Text style={styles.recordingText}>Silent Audio Recording in progress...</Text>
      </View>

      <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={cancelling}>
        {cancelling ? <ActivityIndicator color="#fff" /> : <Text style={styles.cancelText}>Cancel SOS</Text>}
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
  },
  activeSOSBg: {
    backgroundColor: '#fef2f2',
  },
  text: {
    color: '#4b5563',
    fontSize: 16,
  },
  pulseRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#fee2e2',
    borderWidth: 4,
    borderColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  sosText: {
    color: '#ef4444',
    fontSize: 24,
    fontWeight: 'bold',
  },
  metaText: {
    fontSize: 14,
    color: '#4b5563',
    marginVertical: 4,
  },
  recordingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#fee2e2',
    marginTop: 32,
    marginBottom: 48,
  },
  recIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    marginRight: 10,
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
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
