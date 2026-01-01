
export interface CloudFile {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string; // Base64 or Blob URL for simulation
  uploadDate: number;
  aiDescription?: string;
}

export interface StorageStats {
  used: number;
  total: number;
}
