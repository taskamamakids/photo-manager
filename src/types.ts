export type Child = {
  id: string;
  name: string;
  masterPhotoUrl: string;
  imageBlob: Blob;
  descriptor: Float32Array | null;
};

export type ProcessedPhoto = {
  id: string;
  originalUrl: string;
  file: File;
  matches: {
    childId: string;
    confidence: number;
    box: { x: number; y: number; width: number; height: number };
  }[];
};
