import { useState, useEffect } from "react";
import { Download, Trash2, HardDrive, ShieldCheck, RefreshCw, X, Loader2, MapPin } from "lucide-react";
import { Button } from "../ui/Button";
import { GlassCard } from "../ui/GlassCard";
import {
  getAllOfflineCities,
  downloadCity,
  downloadCustomArea,
  deleteCity,
  isCityDownloaded,
  getOfflineStorageEstimate,
} from "../../services/offlineMapService";
import type { Coords } from "../../types/gis";
import type { OfflineCity } from "../../types/offline";

interface OfflineManagerProps {
  userLocation: Coords | null;
  onClose: () => void;
}

export function OfflineManager({ userLocation, onClose }: OfflineManagerProps) {
  const [cities, setCities] = useState<OfflineCity[]>([]);
  const [downloadedCities, setDownloadedCities] = useState<Record<string, boolean>>({});
  const [downloadProgress, setDownloadProgress] = useState<Record<string, { downloaded: number; total: number; percentage: number }>>({});
  const [activeDownloads, setActiveDownloads] = useState<Record<string, boolean>>({});
  const [storageInfo, setStorageInfo] = useState<{ used: string; quota: string }>({ used: "0 MB", quota: "0 MB" });
  const [refreshStorage, setRefreshStorage] = useState(0);
  const [customAreaName, setCustomAreaName] = useState("");
  const [isDownloadingCustom, setIsDownloadingCustom] = useState(false);

  // Load downloaded status and storage stats
  useEffect(() => {
    const allCities = getAllOfflineCities();
    setCities(allCities);
    
    const statusMap: Record<string, boolean> = {};
    allCities.forEach((city) => {
      statusMap[city.id] = isCityDownloaded(city.id);
    });
    setDownloadedCities(statusMap);

    // Get storage details
    getOfflineStorageEstimate().then(({ used, quota }) => {
      const formatBytes = (bytes: number) => {
        if (bytes === 0) return "0 MB";
        const mb = bytes / (1024 * 1024);
        if (mb >= 1024) {
          return `${(mb / 1024).toFixed(1)} GB`;
        }
        return `${mb.toFixed(1)} MB`;
      };
      setStorageInfo({
        used: formatBytes(used),
        quota: formatBytes(quota),
      });
    });
  }, [refreshStorage]);

  const handleDownloadCustom = async () => {
    if (!userLocation) return;
    setIsDownloadingCustom(true);
    try {
      const customId = await downloadCustomArea(userLocation, customAreaName, (downloaded, total) => {
        const percentage = Math.round((downloaded / total) * 100);
        setDownloadProgress((prev) => ({
          ...prev,
          [customId]: { downloaded, total, percentage },
        }));
      });
      setDownloadedCities((prev) => ({ ...prev, [customId]: true }));
      setRefreshStorage((prev) => prev + 1);
      setCustomAreaName("");
    } catch (err) {
      console.error("Custom download failed:", err);
      alert("Custom download failed. Please check your internet connection.");
    } finally {
      setIsDownloadingCustom(false);
    }
  };

  const handleDownload = async (cityId: string) => {
    setActiveDownloads((prev) => ({ ...prev, [cityId]: true }));
    setDownloadProgress((prev) => ({ ...prev, [cityId]: { downloaded: 0, total: 100, percentage: 0 } }));

    try {
      await downloadCity(cityId, (downloaded, total) => {
        const percentage = Math.round((downloaded / total) * 100);
        setDownloadProgress((prev) => ({
          ...prev,
          [cityId]: { downloaded, total, percentage },
        }));
      });

      setDownloadedCities((prev) => ({ ...prev, [cityId]: true }));
      setRefreshStorage((prev) => prev + 1);
    } catch (err) {
      console.error("City download failed:", err);
      alert("Download failed. Please check your internet connection.");
    } finally {
      setActiveDownloads((prev) => ({ ...prev, [cityId]: false }));
    }
  };

  const handleDelete = async (cityId: string) => {
    if (confirm("Are you sure you want to delete this offline map package?")) {
      try {
        await deleteCity(cityId);
        setDownloadedCities((prev) => ({ ...prev, [cityId]: false }));
        setDownloadProgress((prev) => {
          const copy = { ...prev };
          delete copy[cityId];
          return copy;
        });
        setRefreshStorage((prev) => prev + 1);
      } catch (err) {
        console.error("Failed to delete offline map package:", err);
      }
    }
  };

  return (
    <GlassCard className="p-6 border border-gray-800 bg-black/95 text-white max-w-md w-full mx-auto relative shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-bold text-lg flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-emerald-500" /> Offline Maps Manager
          </h3>
          <p className="text-xs text-gray-400 mt-1">Download local map data for offline navigation</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Storage Information */}
      <div className="mb-6 bg-gray-950 p-4 rounded-xl border border-gray-900 flex justify-between items-center text-xs">
        <div className="flex items-center gap-2.5 text-gray-300">
          <HardDrive className="w-4 h-4 text-emerald-400" />
          <div>
            <span className="block font-bold text-[10px] uppercase text-gray-500">Storage Used</span>
            <span className="font-bold text-gray-200">{storageInfo.used}</span>
          </div>
        </div>
        <div className="text-right text-gray-500">
          <span className="block font-bold text-[10px] uppercase">Quota limit</span>
          <span className="font-bold text-gray-400">{storageInfo.quota}</span>
        </div>
      </div>

      {/* Custom Location Downloader */}
      {userLocation && (
        <div className="mb-6 bg-emerald-950/20 border border-emerald-900/30 p-4 rounded-xl">
          <h4 className="font-bold text-sm text-emerald-400 flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4" /> Download Current Area (~40km)
          </h4>
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              placeholder="e.g. Home, Local Area"
              value={customAreaName}
              onChange={(e) => setCustomAreaName(e.target.value)}
              className="flex-1 bg-black/50 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 transition-colors"
            />
            <Button 
              size="sm" 
              onClick={handleDownloadCustom}
              disabled={isDownloadingCustom}
              className="px-4 py-2 text-xs"
            >
              {isDownloadingCustom ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* Cities list */}
      <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-1">
        {cities.map((city) => {
          const isDownloaded = downloadedCities[city.id];
          const isDownloading = activeDownloads[city.id];
          const progress = downloadProgress[city.id];

          return (
            <div
              key={city.id}
              className="bg-gray-900/50 p-4 rounded-xl border border-gray-800 flex flex-col gap-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-sm text-gray-100">{city.name}</h4>
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    Estimate: <b className="text-gray-400">{city.sizeEstimate}</b> &bull; {city.totalTiles} map tiles
                  </span>
                </div>

                {isDownloaded ? (
                  <button
                    onClick={() => handleDelete(city.id)}
                    className="p-2 bg-red-950/20 text-red-500 hover:bg-red-950/50 rounded-lg transition-colors border border-red-900/20"
                    title="Delete downloaded map"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : isDownloading ? (
                  <div className="flex items-center justify-center p-2 text-emerald-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                ) : (
                  <button
                    onClick={() => handleDownload(city.id)}
                    className="p-2 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/50 rounded-lg transition-colors border border-emerald-900/20"
                    title="Download map"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Progress Bar for downloading state */}
              {isDownloading && progress && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold">
                    <span>Downloading tiles...</span>
                    <span>{progress.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-950 h-1.5 rounded-full overflow-hidden border border-gray-900">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${progress.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-[9px] text-gray-500 text-right">
                    {progress.downloaded} / {progress.total} tiles
                  </span>
                </div>
              )}

              {/* Completed Status Check */}
              {isDownloaded && !isDownloading && (
                <div className="flex items-center gap-1.5 text-emerald-500 text-[10px] font-bold uppercase mt-1">
                  <ShieldCheck className="w-3.5 h-3.5 fill-current/10" />
                  <span>Ready for offline use</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
