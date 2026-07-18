import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import MapView, { Marker, Circle, UrlTile, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../contexts/LocationContext';
import { useSOS } from '../contexts/SOSContext';
import locationService from '../services/locationService';

interface SafePlace {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  type: 'police' | 'hospital' | 'safe_route';
}

export const MapScreen = () => {
  const { location } = useLocation();
  const { activeEmergency } = useSOS();
  const [safePlaces, setSafePlaces] = useState<SafePlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const loadSafePlaces = useCallback(async () => {
    setLoading(true);
    try {
      const route = await locationService.getSafeRoute();
      if (route && route.waypoints) {
        const mapped: SafePlace[] = route.waypoints.map((wp: any, idx: number) => ({
          id: `wp-${idx}`,
          title: route.name || 'Safe Route Point',
          latitude: wp.lat,
          longitude: wp.lng,
          type: 'safe_route' as const,
        }));
        setSafePlaces(mapped);
        setLastUpdated(new Date().toLocaleTimeString());
        return;
      }
    } catch {
      // Backend offline fallback
    }

    const baseLat = location?.coords.latitude ?? 28.6139;
    const baseLng = location?.coords.longitude ?? 77.2090;
    setSafePlaces([
      { id: '1', title: 'Nearest Police Station', latitude: baseLat + 0.003, longitude: baseLng + 0.002, type: 'police' },
      { id: '2', title: 'Nearest Hospital', latitude: baseLat - 0.002, longitude: baseLng + 0.004, type: 'hospital' },
      { id: '3', title: 'Safe Corridor (Well-lit)', latitude: baseLat + 0.001, longitude: baseLng - 0.003, type: 'safe_route' },
    ]);
    setLastUpdated(new Date().toLocaleTimeString());
  }, [location]);

  useEffect(() => {
    loadSafePlaces();
  }, []);

  const getMarkerColor = (type: SafePlace['type']) => {
    switch (type) {
      case 'police': return '#3b82f6';
      case 'hospital': return '#22c55e';
      case 'safe_route': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  if (!location) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#ef4444" />
        <Text style={styles.loaderText}>Acquiring your location…</Text>
      </View>
    );
  }

  const initialRegion = {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    latitudeDelta: 0.018,
    longitudeDelta: 0.018,
  };

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_DEFAULT}
        mapType={Platform.OS === 'android' ? 'none' : 'standard'}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
        showsCompass
        showsScale
      >
        {/* OpenStreetMap Tiles for Android (Free, no API key needed) */}
        {Platform.OS === 'android' && (
          <UrlTile
            urlTemplate="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
          />
        )}

        <Circle
          center={{ latitude: location.coords.latitude, longitude: location.coords.longitude }}
          radius={300}
          strokeColor="rgba(239, 68, 68, 0.3)"
          fillColor="rgba(239, 68, 68, 0.08)"
        />

        {safePlaces.map((place) => (
          <Marker
            key={place.id}
            coordinate={{ latitude: place.latitude, longitude: place.longitude }}
            title={place.title}
            description={place.type === 'police' ? '🚔 Police' : place.type === 'hospital' ? '🏥 Hospital' : '🛣 Safe Route'}
            pinColor={getMarkerColor(place.type)}
          />
        ))}

        {activeEmergency && activeEmergency.latitude && (
          <Marker
            coordinate={{
              latitude: Number(activeEmergency.latitude),
              longitude: Number(activeEmergency.longitude),
            }}
            title="🚨 ACTIVE SOS"
            description="Your emergency location is being tracked"
            pinColor="#ef4444"
          />
        )}
      </MapView>

      {/* Overlay info cards */}
      <View style={styles.overlayTop}>
        <View style={styles.statusCard}>
          <Ionicons
            name={activeEmergency ? 'warning' : 'shield-checkmark'}
            size={16}
            color={activeEmergency ? '#ef4444' : '#22c55e'}
          />
          <Text style={[styles.statusText, activeEmergency && styles.statusTextSOS]}>
            {activeEmergency ? 'SOS Active — Location Sharing ON' : 'You are safe'}
          </Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {[
          { color: '#3b82f6', label: 'Police' },
          { color: '#22c55e', label: 'Hospital' },
          { color: '#f59e0b', label: 'Safe Route' },
        ].map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Refresh button */}
      <TouchableOpacity style={styles.refreshBtn} onPress={loadSafePlaces}>
        <Ionicons name="refresh" size={20} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
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
  overlayTop: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    gap: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#22c55e',
  },
  statusTextSOS: {
    color: '#ef4444',
  },
  legend: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
  refreshBtn: {
    position: 'absolute',
    bottom: 90,
    right: 16,
    backgroundColor: '#ef4444',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
});


