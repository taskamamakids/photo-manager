import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Child, ProcessedPhoto } from '../types';
import { getAllDescriptors, loadImage } from '../lib/faceApi';
import * as faceapi from '@vladmandic/face-api';
import { UploadCloud, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import heic2any from 'heic2any';

interface Step2UploadProps {
  childrenList: Child[];
  processedPhotos: ProcessedPhoto[];
  setProcessedPhotos: React.Dispatch<React.SetStateAction<ProcessedPhoto[]>>;
  onNext: () => void;
}

const MATCH_THRESHOLD = 0.45; // Lower is stricter (0.45 = 55% minimum confidence)

export function Step2Upload({ childrenList, processedPhotos, setProcessedPhotos, onNext }: Step2UploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });

  const processFiles = async (files: File[]) => {
    setIsProcessing(true);
    setProgress({ current: 0, total: files.length, status: 'Starting...' });

    const newProcessedPhotos: ProcessedPhoto[] = [];

    for (let i = 0; i < files.length; i++) {
      let file = files[i];
      setProgress({ current: i + 1, total: files.length, status: `Scanning photo ${i + 1} of ${files.length}...` });

      try {
        // Handle HEIC conversion
        if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
          setProgress(prev => ({ ...prev, status: `Converting HEIC ${i + 1} of ${files.length}...` }));
          const convertedBlob = await heic2any({ blob: file, toType: 'image/jpeg' });
          const blobArray = Array.isArray(convertedBlob) ? convertedBlob : [convertedBlob];
          file = new File(blobArray, file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
          setProgress(prev => ({ ...prev, status: `Scanning photo ${i + 1} of ${files.length}...` }));
        }

        const url = URL.createObjectURL(file);
        const img = await loadImage(url);
        const detections = await getAllDescriptors(img);

        const matches: ProcessedPhoto['matches'] = [];

        // For each face found in the photo
        for (const detection of detections) {
          let bestMatch = { childId: '', distance: 1 };

          // Compare against all master photos
          for (const child of childrenList) {
            if (child.descriptor) {
              const distance = faceapi.euclideanDistance(detection.descriptor, child.descriptor);
              if (distance < bestMatch.distance) {
                bestMatch = { childId: child.id, distance };
              }
            }
          }

          // If the best match is below our threshold, record it
          if (bestMatch.distance < MATCH_THRESHOLD) {
            const confidence = Math.max(0, Math.round((1 - bestMatch.distance) * 100));
            matches.push({
              childId: bestMatch.childId,
              confidence,
              box: {
                x: detection.detection.box.x,
                y: detection.detection.box.y,
                width: detection.detection.box.width,
                height: detection.detection.box.height,
              }
            });
            
            const matchedChild = childrenList.find(c => c.id === bestMatch.childId);
            if (matchedChild) {
               setProgress(prev => ({ ...prev, status: `Found ${matchedChild.name}!` }));
               // Small delay to let user see the name
               await new Promise(r => setTimeout(r, 100));
            }
          }
        }

        newProcessedPhotos.push({
          id: crypto.randomUUID(),
          originalUrl: url,
          file,
          matches,
        });

      } catch (err) {
        console.error("Error processing file", file.name, err);
      }
    }

    setProcessedPhotos(prev => [...prev, ...newProcessedPhotos]);
    setIsProcessing(false);
    setProgress({ current: files.length, total: files.length, status: 'Done!' });
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      processFiles(acceptedFiles);
    }
  }, [childrenList]);

  // @ts-ignore - react-dropzone type conflict
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'image/heic': ['.heic'],
      'image/heif': ['.heif']
    },
    disabled: isProcessing
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
        <h2 className="text-2xl font-semibold text-slate-800 mb-2">
          Upload WhatsApp Dump
        </h2>
        <p className="text-slate-500 mb-8 max-w-xl mx-auto">
          Drag and drop all the photos from the event here. The AI will scan each face and sort them into the correct child's folder automatically.
        </p>

        <div
          {...getRootProps()}
          className={cn(
            "border-3 border-dashed rounded-3xl p-12 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[300px]",
            isDragActive ? "border-blue-500 bg-blue-50 scale-[1.02]" : "border-slate-200 hover:border-blue-400 hover:bg-slate-50",
            isProcessing && "opacity-50 cursor-not-allowed pointer-events-none"
          )}
        >
          <input {...getInputProps()} />
          
          {isProcessing ? (
            <div className="flex flex-col items-center text-blue-600">
              <Loader2 className="w-12 h-12 animate-spin mb-4" />
              <p className="text-lg font-medium mb-2">{progress.status}</p>
              <div className="w-64 h-2 bg-blue-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300 ease-out"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <p className="text-sm text-blue-500 mt-2 font-mono">
                {progress.current} / {progress.total}
              </p>
            </div>
          ) : (
            <>
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                <UploadCloud className="w-10 h-10 text-blue-500" />
              </div>
              <p className="text-xl font-medium text-slate-700 mb-2">
                {isDragActive ? "Drop photos here..." : "Drag & drop photos here"}
              </p>
              <p className="text-slate-500">or click to browse files</p>
            </>
          )}
        </div>
      </div>

      {processedPhotos.length > 0 && !isProcessing && (
        <div className="bg-green-50 border border-green-100 p-6 rounded-2xl flex items-center justify-between animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-900">Processing Complete!</h3>
              <p className="text-green-700">Successfully scanned {processedPhotos.length} photos.</p>
            </div>
          </div>
          
          <button
            onClick={onNext}
            className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2"
          >
            View Sorted Gallery
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
