export interface BBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface OfflineCity {
  id: string;
  name: string;
  bbox: BBox;
  sizeEstimate: string; // e.g. "2.4 MB"
  totalTiles: number;
}

export interface DownloadProgress {
  cityId: string;
  downloaded: number;
  total: number;
  status: "idle" | "downloading" | "completed" | "error";
  errorMsg?: string;
}

export interface QueuedLocation {
  latitude: number;
  longitude: number;
  timestamp: string;
  emergencyId: string | null;
  accuracy?: number;
  speed?: number;
  heading?: number;
}
