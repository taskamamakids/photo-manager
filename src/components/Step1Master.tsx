import React, { useState, useRef } from 'react';
import { Child } from '../types';
import { getDescriptor, loadImage } from '../lib/faceApi';
import { Plus, Trash2, User, Image as ImageIcon, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import heic2any from 'heic2any';

interface Step1MasterProps {
  childrenList: Child[];
  setChildrenList: React.Dispatch<React.SetStateAction<Child[]>>;
  onNext: () => void;
}

export function Step1Master({ childrenList, setChildrenList, onNext }: Step1MasterProps) {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setError(null);
      
      // Check if it's a HEIC file
      if (selected.type === 'image/heic' || selected.name.toLowerCase().endsWith('.heic')) {
        setIsConverting(true);
        try {
          const convertedBlob = await heic2any({ blob: selected, toType: 'image/jpeg' });
          const blobArray = Array.isArray(convertedBlob) ? convertedBlob : [convertedBlob];
          const jpegFile = new File(blobArray, selected.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
          
          setFile(jpegFile);
          setPreview(URL.createObjectURL(jpegFile));
        } catch (err) {
          console.error("HEIC conversion error:", err);
          setError("Failed to convert HEIC image. Please try a different photo.");
        } finally {
          setIsConverting(false);
        }
      } else {
        setFile(selected);
        setPreview(URL.createObjectURL(selected));
      }
    }
  };

  const [confirmClear, setConfirmClear] = useState(false);

  const handleAddChild = async () => {
    if (!name.trim() || !file || !preview) {
      setError('Please provide both a name and a photo.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const img = await loadImage(preview);
      const descriptor = await getDescriptor(img);

      if (!descriptor) {
        setError('No face detected. Please try a clearer photo.');
        setIsProcessing(false);
        return;
      }

      const newChild: Child = {
        id: crypto.randomUUID(),
        name: name.trim(),
        masterPhotoUrl: preview,
        imageBlob: file,
        descriptor,
      };

      setChildrenList((prev) => [...prev, newChild]);
      
      // Reset form
      setName('');
      setFile(null);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError('Error processing photo. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const removeChild = (id: string) => {
    setChildrenList((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-blue-500" />
          Add Master Photos
        </h2>
        <p className="text-slate-500 mb-6 text-sm">
          Upload a clear, front-facing photo of each child. The AI will learn their faces from these photos.
        </p>

        <div className="flex flex-col md:flex-row gap-4 items-start">
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-medium text-slate-700 mb-1">Child's Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Adam"
              className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-medium text-slate-700 mb-1">Master Photo</label>
            <div 
              className="relative border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors cursor-pointer flex flex-col items-center justify-center h-[120px]"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,.heic"
                className="hidden"
              />
              {isConverting ? (
                <div className="flex flex-col items-center text-blue-500">
                  <Loader2 className="w-6 h-6 animate-spin mb-2" />
                  <span className="text-sm">Converting HEIC...</span>
                </div>
              ) : preview ? (
                <img src={preview} alt="Preview" className="h-full object-contain rounded-lg" />
              ) : (
                <>
                  <ImageIcon className="w-6 h-6 text-slate-400 mb-2" />
                  <span className="text-sm text-slate-500">Click to upload</span>
                </>
              )}
            </div>
          </div>

          <div className="w-full md:w-1/3 flex flex-col justify-end h-full md:pt-6">
            <button
              onClick={handleAddChild}
              disabled={isProcessing || !name.trim() || !file}
              className={cn(
                "w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all",
                isProcessing || !name.trim() || !file
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow"
              )}
            >
              {isProcessing ? (
                <span className="animate-pulse">Processing...</span>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Add Child
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      {childrenList.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-slate-800">
                Class List ({childrenList.length})
              </h3>
              <button
                onClick={() => {
                  if (confirmClear) {
                    setChildrenList([]);
                    setConfirmClear(false);
                  } else {
                    setConfirmClear(true);
                    setTimeout(() => setConfirmClear(false), 3000);
                  }
                }}
                className={cn(
                  "text-sm flex items-center gap-1 px-2 py-1 rounded-md transition-colors",
                  confirmClear 
                    ? "bg-red-500 text-white hover:bg-red-600" 
                    : "text-red-500 hover:text-red-700 hover:bg-red-50"
                )}
                title="Clear all saved children"
              >
                <Trash2 className="w-4 h-4" />
                {confirmClear ? "Click again to confirm" : "Clear All"}
              </button>
            </div>
            <button
              onClick={onNext}
              className="px-6 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors shadow-sm"
            >
              Next Step: Upload Bulk Photos
            </button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {childrenList.map((child) => (
              <div key={child.id} className="group relative bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col items-center">
                <div className="w-20 h-20 rounded-full overflow-hidden mb-3 border-2 border-white shadow-sm">
                  <img src={child.masterPhotoUrl} alt={child.name} className="w-full h-full object-cover" />
                </div>
                <span className="font-medium text-slate-700 truncate w-full text-center">{child.name}</span>
                
                <button
                  onClick={() => removeChild(child.id)}
                  className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
