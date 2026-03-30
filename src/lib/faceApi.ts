import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

let modelsLoaded = false;

export async function loadModels() {
  if (modelsLoaded) return;
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
  ]);
  modelsLoaded = true;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function getDescriptor(imageElement: HTMLImageElement) {
  const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 });
  const detection = await faceapi.detectSingleFace(imageElement, options)
    .withFaceLandmarks()
    .withFaceDescriptor();
  return detection?.descriptor;
}

export async function getAllDescriptors(imageElement: HTMLImageElement) {
  const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 });
  const detections = await faceapi.detectAllFaces(imageElement, options)
    .withFaceLandmarks()
    .withFaceDescriptors();
  return detections;
}
