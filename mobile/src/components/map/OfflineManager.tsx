import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Download, Trash2, HardDrive, ShieldCheck, RefreshCw, X } from "lucide-react-native";
import { useMap } from "../../core/providers/MapProvider";
import { OFFLINE_CITIES, OfflineMapService } from "../../core/services/OfflineMapService";

interface OfflineManagerProps {
  onClose: () => void;
}

export const OfflineManager: React.FC<OfflineManagerProps> = ({ onClose }) => {
  const { activeOfflineCity, setActiveOfflineCity } = useMap();
  const [downloadedCities, setDownloadedCities] = useState<Record<string, boolean>>({});
  const [downloadProgress, setDownloadProgress] = useState<Record<string, { current: number; total: number }>>({});
  const [downloadingCity, setDownloadingCity] = useState<string | null>(null);
  const [storageSize, setStorageSize] = useState("0.0 MB");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshStatus();
  }, []);

  const refreshStatus = async () => {
    setLoading(true);
    const downloaded: Record<string, boolean> = {};
    for (const city of OFFLINE_CITIES) {
      downloaded[city.id] = await OfflineMapService.isCityDownloaded(city.id);
    }
    setDownloadedCities(downloaded);

    const size = await OfflineMapService.getOfflineStorageEstimate();
    setStorageSize(size);
    setLoading(false);
  };

  const handleDownload = async (cityId: string) => {
    if (downloadingCity) return;

    setDownloadingCity(cityId);
    setDownloadProgress((prev) => ({ ...prev, [cityId]: { current: 0, total: 100 } }));

    try {
      await OfflineMapService.downloadCity(cityId, (current, total) => {
        setDownloadProgress((prev) => ({
          ...prev,
          [cityId]: { current, total },
        }));
      });

      await refreshStatus();
      // Auto-activate downloaded city as default offline map template
      setActiveOfflineCity(cityId);
    } catch (err) {
      console.error("Failed to download city tiles:", err);
    } finally {
      setDownloadingCity(null);
    }
  };

  const handleDelete = async (cityId: string) => {
    try {
      await OfflineMapService.deleteCity(cityId);
      if (activeOfflineCity === cityId) {
        setActiveOfflineCity(null);
      }
      await refreshStatus();
    } catch (err) {
      console.error("Failed to delete city tiles:", err);
    }
  };

  const getProgressPercentage = (cityId: string) => {
    const progress = downloadProgress[cityId];
    if (!progress || progress.total === 0) return 0;
    return Math.round((progress.current / progress.total) * 100);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <HardDrive width={18} height={18} color="#10b981" />
          <Text style={styles.headerTitle}>Offline Map Packages</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <X width={16} height={16} color="#71717a" />
        </TouchableOpacity>
      </View>

      {/* Footprint metrics */}
      <View style={styles.storageSummary}>
        <Text style={styles.summaryLabel}>Total Offline Footprint:</Text>
        <Text style={styles.summaryValue}>{storageSize}</Text>
      </View>

      {loading ? (
        <View style={styles.centerSpinner}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : (
        <ScrollView style={styles.cityList} contentContainerStyle={styles.listContent}>
          {OFFLINE_CITIES.map((city) => {
            const isDownloaded = downloadedCities[city.id];
            const isDownloading = downloadingCity === city.id;
            const progress = getProgressPercentage(city.id);
            const isActive = activeOfflineCity === city.id;

            return (
              <View key={city.id} style={[styles.cityCard, isActive && styles.cityCardActive]}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cityName}>{city.name}</Text>
                  <Text style={styles.cityMeta}>
                    {city.sizeEstimate} &bull; {city.totalTiles} map tiles (Zoom 12-15)
                  </Text>
                </View>

                {/* Actions row */}
                <View style={styles.cardActions}>
                  {isDownloading ? (
                    <View style={styles.progressContainer}>
                      <ActivityIndicator size="small" color="#10b981" />
                      <Text style={styles.progressText}>{progress}%</Text>
                    </View>
                  ) : isDownloaded ? (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        onPress={() => setActiveOfflineCity(isActive ? null : city.id)}
                        style={[styles.statusBtn, isActive ? styles.btnActive : styles.btnInactive]}
                      >
                        {isActive ? (
                          <ShieldCheck width={14} height={14} color="#fff" />
                        ) : (
                          <RefreshCw width={12} height={12} color="#a1a1aa" />
                        )}
                        <Text style={[styles.statusText, isActive && styles.statusTextActive]}>
                          {isActive ? "Active" : "Use"}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => handleDelete(city.id)} style={styles.deleteBtn}>
                        <Trash2 width={14} height={14} color="#f43f5e" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleDownload(city.id)}
                      disabled={!!downloadingCity}
                      style={[styles.downloadBtn, !!downloadingCity && styles.btnDisabled]}
                    >
                      <Download width={14} height={14} color="#fff" />
                      <Text style={styles.btnText}>Get</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Info Warning */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Offline maps download raster tiles locally to ensure GPS tracking and route geometries load with zero internet connectivity.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#111112",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#27272a",
    padding: 20,
    width: "90%",
    maxWidth: 360,
    maxHeight: "80%",
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 15,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "bold",
  },
  closeBtn: {
    padding: 6,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 10,
  },
  storageSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#09090b",
    borderWidth: 1,
    borderColor: "#18181b",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#71717a",
    fontWeight: "600",
  },
  summaryValue: {
    fontSize: 12,
    color: "#10b981",
    fontWeight: "bold",
  },
  centerSpinner: {
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  cityList: {
    maxHeight: 220,
  },
  listContent: {
    gap: 10,
  },
  cityCard: {
    flexDirection: "row",
    backgroundColor: "rgba(24, 24, 27, 0.5)",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    justifyContent: "space-between",
  },
  cityCardActive: {
    borderColor: "#059669",
    backgroundColor: "rgba(5, 150, 105, 0.05)",
  },
  cardInfo: {
    flex: 1,
    paddingRight: 10,
  },
  cityName: {
    fontSize: 13,
    color: "#ffffff",
    fontWeight: "bold",
  },
  cityMeta: {
    fontSize: 10,
    color: "#71717a",
    marginTop: 4,
  },
  cardActions: {
    justifyContent: "center",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  statusBtn: {
    flexDirection: "row",
    alignItems: "center",
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
  },
  btnActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  btnInactive: {
    backgroundColor: "transparent",
    borderColor: "#27272a",
  },
  statusText: {
    fontSize: 11,
    color: "#a1a1aa",
    fontWeight: "bold",
  },
  statusTextActive: {
    color: "#ffffff",
  },
  deleteBtn: {
    height: 32,
    width: 32,
    borderRadius: 8,
    backgroundColor: "rgba(244, 63, 94, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  downloadBtn: {
    height: 32,
    paddingHorizontal: 16,
    backgroundColor: "#2563eb",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnDisabled: {
    backgroundColor: "#27272a",
    opacity: 0.5,
  },
  btnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "black",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  progressText: {
    color: "#10b981",
    fontSize: 11,
    fontWeight: "bold",
  },
  infoBox: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  infoText: {
    color: "#52525b",
    fontSize: 9,
    lineHeight: 13,
    textAlign: "center",
  },
});
export default OfflineManager;
