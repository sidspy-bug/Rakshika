import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { useMap } from "../../core/providers/MapProvider";
import { Navigation, HardDrive } from "lucide-react-native";
import NavigationPanel from "./NavigationPanel";
import OfflineManager from "./OfflineManager";

// Bypass Mapbox Token Validation (Standard MapLibre Native requirement for 100% open-source)
MapLibreGL.setAccessToken(null);

const OSM_LIGHT_STYLE = {
  version: 8,
  sources: {
    "osm-raster-tiles": {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm-raster-layer",
      type: "raster",
      source: "osm-raster-tiles",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

const CARTODB_DARK_STYLE = {
  version: 8,
  sources: {
    "cartodb-dark-tiles": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© CartoDB, © OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "cartodb-dark-layer",
      type: "raster",
      source: "cartodb-dark-tiles",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export const ReusableMap: React.FC = () => {
  const {
    userLocation,
    permissionStatus,
    followUser,
    theme,
    error,
    waypoints,
    route,
    activeOfflineCity,
    setFollowUser,
    requestMapPermissions,
    startTracking,
  } = useMap();

  const cameraRef = useRef<MapLibreGL.Camera>(null);
  const [showOfflineManager, setShowOfflineManager] = useState(false);

  // Trigger permission check and initiate telemetry watch on load
  useEffect(() => {
    const initGPS = async () => {
      const status = await requestMapPermissions();
      if (status === "granted") {
        await startTracking();
      }
    };
    initGPS();
  }, []);

  // Fit camera bounds when route path or user location updates
  useEffect(() => {
    if (!cameraRef.current) return;

    if (route && route.geometry.length > 0) {
      // Find bounds of route geometries
      const coordinates = route.geometry;
      let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
      
      coordinates.forEach(([lng, lat]) => {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      });

      cameraRef.current.fitBounds(
        [maxLng, maxLat],
        [minLng, minLat],
        [50, 50, 50, 50], // Padding
        1000 // Animation duration
      );
    } else if (userLocation && followUser) {
      cameraRef.current.setCamera({
        centerCoordinate: [userLocation.longitude, userLocation.latitude],
        zoomLevel: 15,
        animationDuration: 800,
      });
    }
  }, [userLocation, followUser, route]);

  // Construct style JSON. If offline city is active, serve tiles from local filesystem
  const getMapStyle = () => {
    if (activeOfflineCity) {
      const localTilePath = `file://${activeOfflineCity}`; // Resolves template
      return {
        version: 8,
        sources: {
          "offline-raster-tiles": {
            type: "raster",
            tiles: [localTilePath],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "offline-raster-layer",
            type: "raster",
            source: "offline-raster-tiles",
            minzoom: 12,
            maxzoom: 15,
          },
        ],
      };
    }
    return theme === "light" ? OSM_LIGHT_STYLE : CARTODB_DARK_STYLE;
  };

  const handleRecenter = () => {
    setFollowUser(true);
  };

  const handleRegionWillChange = (event: any) => {
    if (event.gesture) {
      setFollowUser(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* MapLibre Canvas Viewport */}
      <MapLibreGL.MapView
        style={styles.map}
        styleJSON={JSON.stringify(getMapStyle())}
        onRegionWillChange={handleRegionWillChange}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <MapLibreGL.Camera
          ref={cameraRef}
          defaultSettings={{
            zoomLevel: 14,
            centerCoordinate: userLocation
              ? [userLocation.longitude, userLocation.latitude]
              : [77.209, 28.6139], // Delhi Fallback
          }}
        />

        {/* User Location Pulsing dot overlay */}
        {userLocation && (
          <MapLibreGL.PointAnnotation
            id="user-location"
            coordinate={[userLocation.longitude, userLocation.latitude]}
          >
            <View style={styles.markerContainer}>
              <View style={styles.pulseRing} />
              <View style={styles.markerDot} />
            </View>
          </MapLibreGL.PointAnnotation>
        )}

        {/* Multi-destination waypoints annotations */}
        {waypoints.map((wp, idx) => {
          const isLast = idx === waypoints.length - 1;
          return (
            <MapLibreGL.PointAnnotation
              key={wp.id}
              id={wp.id}
              coordinate={[wp.longitude, wp.latitude]}
            >
              <View style={[
                styles.waypointPin,
                { backgroundColor: isLast ? "#f43f5e" : "#8b5cf6" }
              ]}>
                <Text style={styles.waypointText}>
                  {isLast ? "🏁" : `${idx + 1}`}
                </Text>
              </View>
            </MapLibreGL.PointAnnotation>
          );
        })}

        {/* Route Polyline Layer */}
        {route && route.geometry.length > 0 && (
          <MapLibreGL.ShapeSource
            id="route-source"
            shape={{
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: route.geometry, // [[lng, lat], ...]
              },
              properties: {},
            }}
          >
            <MapLibreGL.LineLayer
              id="route-layer"
              style={{
                lineColor: "#10b981",
                lineWidth: 5,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </MapLibreGL.ShapeSource>
        )}
      </MapLibreGL.MapView>

      {/* Floating Warnings / Error Bar */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Floating Action Controls */}
      <View style={styles.floatingControls}>
        <TouchableOpacity
          onPress={() => setShowOfflineManager(true)}
          style={styles.floatingBtn}
          activeOpacity={0.8}
        >
          <HardDrive width={20} height={20} color="#10b981" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleRecenter}
          style={[
            styles.floatingBtn,
            followUser ? styles.recenterActive : styles.recenterInactive,
          ]}
          activeOpacity={0.8}
        >
          <Navigation
            width={20}
            height={20}
            color={followUser ? "#fff" : "#a1a1aa"}
            fill={followUser ? "#fff" : "transparent"}
          />
        </TouchableOpacity>
      </View>

      {/* Bottom Panel Wrapper */}
      {waypoints.length > 0 && (
        <View style={styles.bottomSheet}>
          <NavigationPanel />
        </View>
      )}

      {/* Offline Maps Modal Overlay */}
      {showOfflineManager && (
        <View style={styles.modalOverlay}>
          <OfflineManager onClose={() => setShowOfflineManager(false)} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111112",
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  markerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#3b82f6",
    borderWidth: 2,
    borderColor: "#ffffff",
    elevation: 3,
  },
  pulseRing: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(59, 130, 246, 0.35)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.1)",
  },
  waypointPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
  },
  waypointText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "bold",
  },
  errorBanner: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: "rgba(239, 68, 68, 0.95)",
    padding: 12,
    borderRadius: 16,
    zIndex: 50,
    elevation: 4,
  },
  errorText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "center",
  },
  floatingControls: {
    position: "absolute",
    right: 16,
    top: 100,
    zIndex: 40,
    gap: 12,
  },
  floatingBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderWidth: 1,
    borderColor: "#27272a",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
  },
  recenterActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  recenterInactive: {
    backgroundColor: "rgba(0, 0, 0, 0.8)",
  },
  bottomSheet: {
    position: "absolute",
    bottom: 30,
    left: 16,
    right: 16,
    zIndex: 40,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
});
export default ReusableMap;
