import React from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { useLocation } from '../contexts/LocationContext';
import { useSOS } from '../contexts/SOSContext';

export const MapScreen = () => {
  const { location } = useLocation();
  const { activeEmergency } = useSOS();

  if (!location) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#ef4444" />
        <Text style={styles.loaderText}>Acquiring location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapPlaceholder}>
        <Text style={styles.placeholderTitle}>Web Maps View</Text>
        <Text style={styles.placeholderDesc}>
          Interactive Maps are optimized for the mobile app (iOS/Android) using react-native-maps.
        </Text>
        <Text style={styles.placeholderData}>
          Current Lat: {location.coords.latitude.toFixed(4)}
        </Text>
        <Text style={styles.placeholderData}>
          Current Lng: {location.coords.longitude.toFixed(4)}
        </Text>

        {activeEmergency && (
          <View style={styles.emergencyBanner}>
            <Text style={styles.emergencyText}>ACTIVE SOS EMERGENCY at this location!</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loaderText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 14,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#e5e7eb',
    margin: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  placeholderDesc: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  placeholderData: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
    marginBottom: 4,
  },
  emergencyBanner: {
    marginTop: 30,
    padding: 16,
    backgroundColor: '#ef4444',
    borderRadius: 8,
  },
  emergencyText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
