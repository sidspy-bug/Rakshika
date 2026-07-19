import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Trash2, Footprints, Car, Clock, Compass, AlertTriangle, Navigation } from "lucide-react-native";
import { useMap } from "../../core/providers/MapProvider";

export const NavigationPanel: React.FC = () => {
  const {
    waypoints,
    profile,
    route,
    isRouteLoading,
    isNavigating,
    isOnline,
    setProfile,
    removeWaypoint,
    clearWaypoints,
    startNavigation,
    stopNavigation,
  } = useMap();

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} mins`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs} hr ${remMins} mins`;
  };

  return (
    <View style={styles.container}>
      {/* Profile Toggle (Walking vs Driving) */}
      <View style={styles.toggleBar}>
        <TouchableOpacity
          onPress={() => setProfile("foot-walking")}
          disabled={isNavigating}
          style={[styles.toggleBtn, profile === "foot-walking" && styles.toggleActiveWalking]}
        >
          <Footprints width={16} height={16} color={profile === "foot-walking" ? "#fff" : "#a1a1aa"} />
          <Text style={[styles.toggleText, profile === "foot-walking" && styles.toggleTextActive]}>Safe Walk</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => setProfile("driving-car")}
          disabled={isNavigating}
          style={[styles.toggleBtn, profile === "driving-car" && styles.toggleActiveDriving]}
        >
          <Car width={16} height={16} color={profile === "driving-car" ? "#fff" : "#a1a1aa"} />
          <Text style={[styles.toggleText, profile === "driving-car" && styles.toggleTextActive]}>Driving</Text>
        </TouchableOpacity>
      </View>

      {/* Waypoints list */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Start (Live Position) */}
        <View style={styles.waypointItem}>
          <View style={[styles.indicatorDot, { backgroundColor: "#3b82f6" }]} />
          <Text style={styles.waypointText}>Your Live Location</Text>
        </View>

        {/* Targets stop segments */}
        {waypoints.map((wp, idx) => (
          <View key={wp.id} style={styles.waypointItem}>
            <View style={[styles.indicatorDot, { backgroundColor: "#f43f5e" }]} />
            <View style={styles.waypointInfo}>
              <Text style={styles.stopLabel}>STOP {idx + 1}</Text>
              <Text style={styles.waypointText} numberOfLines={1}>
                {wp.name}
              </Text>
            </View>
            {!isNavigating && (
              <TouchableOpacity onPress={() => removeWaypoint(wp.id)} style={styles.deleteBtn}>
                <Trash2 width={14} height={14} color="#f43f5e" />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Loading Status */}
      {isRouteLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#10b981" />
          <Text style={styles.loadingText}>Calculating safe paths...</Text>
        </View>
      )}

      {/* Route Metadata */}
      {route && !isRouteLoading && (
        <View style={styles.metaContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Compass width={16} height={16} color="#10b981" />
              <View style={styles.statInfo}>
                <Text style={styles.statLabel}>DISTANCE</Text>
                <Text style={styles.statValue}>{formatDistance(route.distance)}</Text>
              </View>
            </View>
            <View style={styles.statCell}>
              <Clock width={16} height={16} color="#3b82f6" />
              <View style={styles.statInfo}>
                <Text style={styles.statLabel}>DURATION</Text>
                <Text style={styles.statValue}>{formatDuration(route.duration)}</Text>
              </View>
            </View>
          </View>

          {!isOnline && (
            <View style={styles.offlineAlert}>
              <AlertTriangle width={14} height={14} color="#f59e0b" />
              <Text style={styles.offlineText}>
                Offline: Path shown is geodesic. Recalculation is locked.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Main Actions Panel */}
      <View style={styles.actionsRow}>
        {isNavigating ? (
          <TouchableOpacity onPress={stopNavigation} style={styles.stopBtn} activeOpacity={0.8}>
            <Text style={styles.btnText}>Stop Navigation</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              onPress={startNavigation}
              disabled={!route || isRouteLoading}
              style={[styles.startBtn, (!route || isRouteLoading) && styles.btnDisabled]}
              activeOpacity={0.8}
            >
              <Navigation width={16} height={16} color="#fff" />
              <Text style={styles.btnText}>Start Navigation</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={clearWaypoints} style={styles.clearBtn} activeOpacity={0.8}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(10, 10, 10, 0.95)",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 24,
    padding: 16,
    width: "100%",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  toggleBar: {
    flexDirection: "row",
    backgroundColor: "#09090b",
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#18181b",
    marginBottom: 12,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  toggleActiveWalking: {
    backgroundColor: "#059669",
  },
  toggleActiveDriving: {
    backgroundColor: "#2563eb",
  },
  toggleText: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "bold",
  },
  toggleTextActive: {
    color: "#ffffff",
  },
  scroll: {
    maxHeight: 120,
    marginBottom: 12,
  },
  scrollContent: {
    gap: 8,
  },
  waypointItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(24, 24, 27, 0.5)",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  indicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  waypointInfo: {
    flex: 1,
  },
  stopLabel: {
    fontSize: 8,
    color: "#71717a",
    fontWeight: "bold",
  },
  waypointText: {
    color: "#e4e4e7",
    fontSize: 12,
    fontWeight: "600",
  },
  deleteBtn: {
    padding: 6,
    backgroundColor: "rgba(244, 63, 94, 0.1)",
    borderRadius: 8,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 8,
  },
  loadingText: {
    color: "#a1a1aa",
    fontSize: 11,
  },
  metaContainer: {
    gap: 10,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#09090b",
    borderWidth: 1,
    borderColor: "#18181b",
    borderRadius: 12,
    padding: 12,
  },
  statCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statInfo: {
    justifyContent: "center",
  },
  statLabel: {
    fontSize: 8,
    color: "#52525b",
    fontWeight: "bold",
  },
  statValue: {
    fontSize: 12,
    color: "#e4e4e7",
    fontWeight: "bold",
  },
  offlineAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
    padding: 10,
    borderRadius: 10,
    gap: 8,
  },
  offlineText: {
    color: "#f59e0b",
    fontSize: 10,
    fontWeight: "bold",
    flex: 1,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  startBtn: {
    flex: 1,
    height: 44,
    backgroundColor: "#10b981",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnDisabled: {
    backgroundColor: "#27272a",
    opacity: 0.5,
  },
  stopBtn: {
    width: "100%",
    height: 44,
    backgroundColor: "#ef4444",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  clearBtn: {
    paddingHorizontal: 20,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#27272a",
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "black",
  },
  clearText: {
    color: "#a1a1aa",
    fontSize: 13,
    fontWeight: "black",
  },
});
export default NavigationPanel;
