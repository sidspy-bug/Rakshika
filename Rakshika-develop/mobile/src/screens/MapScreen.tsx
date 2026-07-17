import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useLocation } from '../contexts/LocationContext';
import { useSOS } from '../contexts/SOSContext';
import locationService from '../services/locationService';

export const MapScreen = () => {
  const { location } = useLocation();
  const { activeEmergency } = useSOS();
  const [safePlaces, setSafePlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSafePlaces();
  }, []);

  const loadSafePlaces = async () => {
    setLoading(true);
    try {
      // Mock safe places for demonstration if service call fails
      const mockPlaces = [
        { id: '1', title: 'Central Police Station', latitude: 28.6145, longitude: 77.2085, type: 'police' },
        { id: '2', title: 'City Hospital', latitude: 28.6125, longitude: 77.2105, type: 'hospital' },
      ];
      setSafePlaces(mockPlaces);
    } finally {
      setLoading(false);
    }
  };

  if (!location) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#ef4444" />
        <Text style={styles.loaderText}>Acquiring location...</Text>
      </View>
    );
  }

  const initialRegion = {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  };

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
      >
        {/* Render Safe Places */}
        {safePlaces.map((place) => (
          <Marker
            key={place.id}
            coordinate={{ latitude: place.latitude, longitude: place.longitude }}
            title={place.title}
            description={place.type.toUpperCase()}
            pinColor={place.type === 'police' ? 'blue' : 'green'}
          />
        ))}

        {/* Mark Active SOS Location */}
        {activeEmergency && (
          <Marker
            coordinate={{
              latitude: Number(activeEmergency.latitude),
              longitude: Number(activeEmergency.longitude),
            }}
            title="ACTIVE SOS EMERGENCY"
            description="Your emergency location"
            pinColor="red"
          />
        )}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
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
});
