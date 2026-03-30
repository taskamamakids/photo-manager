import React, { useState, useMemo } from 'react';
import { Child, ProcessedPhoto } from '../types';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Download, Folder, Image as ImageIcon, Search, ShieldCheck, User, X, Edit2, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface Step3GalleryProps {
  childrenList: Child[];
  processedPhotos: ProcessedPhoto[];
  setProcessedPhotos: React.Dispatch<React.SetStateAction<ProcessedPhoto[]>>;
}

export function Step3Gallery({ childrenList, processedPhotos, setProcessedPhotos }: Step3GalleryProps) {
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);

  const groupedPhotos = useMemo(() => {
    const groups: Record<string, ProcessedPhoto[]> = {};
    childrenList.forEach(c => groups[c.id] = []);
    groups['unmatched'] = [];

    processedPhotos.forEach(photo => {
      if (photo.matches.length === 0) {
        groups['unmatched'].push(photo);
      } else {
        photo.matches.forEach(match => {
          if (groups[match.childId] && !groups[match.childId].find(p => p.id === photo.id)) {
            groups[match.childId].push(photo);
          }
        });
      }
    });

    return groups;
  }, [processedPhotos, childrenList]);

  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      const zip = new JSZip();

      for (const child of childrenList) {
        const photos = groupedPhotos[child.id] || [];
        if (photos.length > 0) {
          const folder = zip.folder(child.name);
          if (folder) {
            photos.forEach((photo, index) => {
              // Ensure unique names
              const ext = photo.file.name.split('.').pop() || 'jpg';
              folder.file(`${child.name}_${index + 1}.${ext}`, photo.file);
            });
          }
        }
      }

      const unmatched = groupedPhotos['unmatched'] || [];
      if (unmatched.length > 0) {
        const folder = zip.folder('Unmatched');
        if (folder) {
          unmatched.forEach((photo, index) => {
            const ext = photo.file.name.split('.').pop() || 'jpg';
            folder.file(`Unmatched_${index + 1}.${ext}`, photo.file);
          });
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'Taska_Mama_Kids_Sorted_Photos.zip');
    } catch (error) {
      console.error("Error generating zip", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleReassign = (photoId: string, oldChildId: string | 'unmatched' | null, newChildId: string) => {
    setProcessedPhotos(prev => prev.map(p => {
      if (p.id === photoId) {
        if (oldChildId === null) {
          // In "All Photos", replace all matches
          if (newChildId === 'unmatched') return { ...p, matches: [] };
          return { ...p, matches: [{ childId: newChildId, confidence: 100, box: { x: 0, y: 0, width: 0, height: 0 } }] };
        } else {
          // In a specific folder, replace just that match
          const filteredMatches = oldChildId === 'unmatched' ? [...p.matches] : p.matches.filter(m => m.childId !== oldChildId);
          if (newChildId !== 'unmatched' && !filteredMatches.find(m => m.childId === newChildId)) {
            filteredMatches.push({ childId: newChildId, confidence: 100, box: { x: 0, y: 0, width: 0, height: 0 } });
          }
          return { ...p, matches: filteredMatches };
        }
      }
      return p;
    }));
    setEditingPhotoId(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800 mb-2">Sorted Gallery</h2>
          <p className="text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-green-700 bg-green-50 px-2 py-1 rounded-md">
              Local Processing: Photos are processed in-browser for child safety.
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setReviewMode(!reviewMode)}
            className={cn(
              "px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors",
              reviewMode ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            <Edit2 className="w-4 h-4" />
            {reviewMode ? "Exit Review Mode" : "Review Mode"}
          </button>
          <button
            onClick={handleDownloadZip}
            disabled={isDownloading || processedPhotos.length === 0}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            {isDownloading ? (
              <span className="animate-pulse">Zipping...</span>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Download All Sorted Folders
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: Folders */}
        <div className="lg:col-span-1 space-y-2">
          <h3 className="font-semibold text-slate-700 mb-4 px-2 uppercase tracking-wider text-sm">Folders</h3>
          
          <button
            onClick={() => setSelectedChildId(null)}
            className={cn(
              "w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors",
              selectedChildId === null ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-slate-50 text-slate-600"
            )}
          >
            <div className="flex items-center gap-3">
              <Folder className={cn("w-5 h-5", selectedChildId === null ? "text-blue-500" : "text-slate-400")} />
              All Photos
            </div>
            <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold shadow-sm border border-slate-100">
              {processedPhotos.length}
            </span>
          </button>

          {childrenList.map(child => (
            <button
              key={child.id}
              onClick={() => setSelectedChildId(child.id)}
              className={cn(
                "w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors",
                selectedChildId === child.id ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-slate-50 text-slate-600"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-200">
                  <img src={child.masterPhotoUrl} alt={child.name} className="w-full h-full object-cover" />
                </div>
                <span className="truncate">{child.name}</span>
              </div>
              <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold shadow-sm border border-slate-100">
                {groupedPhotos[child.id]?.length || 0}
              </span>
            </button>
          ))}

          <button
            onClick={() => setSelectedChildId('unmatched')}
            className={cn(
              "w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors mt-4 border border-dashed",
              selectedChildId === 'unmatched' ? "bg-slate-100 text-slate-800 font-medium border-slate-300" : "hover:bg-slate-50 text-slate-500 border-slate-200"
            )}
          >
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400" />
              Unmatched
            </div>
            <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold shadow-sm border border-slate-100">
              {groupedPhotos['unmatched']?.length || 0}
            </span>
          </button>
        </div>

        {/* Main Content: Photos Grid */}
        <div className="lg:col-span-3 bg-slate-50 p-6 rounded-2xl border border-slate-100 min-h-[500px]">
          {selectedChildId ? (
            <div className="mb-6 flex items-center gap-4">
              {selectedChildId !== 'unmatched' && (
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm">
                  <img src={childrenList.find(c => c.id === selectedChildId)?.masterPhotoUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <h3 className="text-xl font-semibold text-slate-800">
                {selectedChildId === 'unmatched' ? 'Unmatched Photos' : childrenList.find(c => c.id === selectedChildId)?.name}
              </h3>
            </div>
          ) : (
            <h3 className="text-xl font-semibold text-slate-800 mb-6">All Processed Photos</h3>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {(selectedChildId ? groupedPhotos[selectedChildId] : processedPhotos).map(photo => {
              const match = photo.matches.find(m => m.childId === selectedChildId);
              const confidence = match ? match.confidence : Math.max(...photo.matches.map(m => m.confidence), 0);
              
              return (
                <div key={photo.id} className="group relative aspect-square rounded-xl overflow-hidden bg-white shadow-sm border border-slate-200">
                  <img src={photo.originalUrl} alt="Processed" className="w-full h-full object-cover" />
                  
                  {/* Confidence Badge */}
                  {photo.matches.length > 0 && (
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md font-mono flex items-center gap-1 z-10">
                      {confidence}% Match
                    </div>
                  )}

                  {/* Multiple Faces Badge */}
                  {photo.matches.length > 1 && (
                    <div className="absolute top-2 right-2 bg-blue-500/90 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md font-medium flex items-center gap-1 z-10">
                      <User className="w-3 h-3" />
                      {photo.matches.length}
                    </div>
                  )}

                  {/* Permanent quick-edit button (bottom right) */}
                  {editingPhotoId !== photo.id && !reviewMode && (
                    <button
                      onClick={() => setEditingPhotoId(photo.id)}
                      className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm text-slate-800 p-2 rounded-lg shadow-md hover:bg-blue-50 hover:text-blue-600 transition-colors z-10"
                      title="Reassign Photo"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Review Mode / Editing Overlay */}
                  {(reviewMode || editingPhotoId === photo.id) && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-2 z-20">
                      {editingPhotoId === photo.id ? (
                        <div className="bg-white rounded-xl p-2 w-full max-h-full overflow-y-auto shadow-xl">
                          <div className="flex justify-between items-center mb-2 px-1">
                            <span className="text-xs font-bold text-slate-500 uppercase">Move to:</span>
                            <button onClick={() => setEditingPhotoId(null)} className="p-1 hover:bg-slate-100 rounded-full"><X className="w-3 h-3" /></button>
                          </div>
                          <div className="space-y-1">
                            {childrenList.map(child => (
                              <button
                                key={child.id}
                                onClick={() => handleReassign(photo.id, selectedChildId, child.id)}
                                className="w-full text-left px-2 py-1.5 text-sm hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors truncate"
                              >
                                {child.name}
                              </button>
                            ))}
                            <button
                                onClick={() => handleReassign(photo.id, selectedChildId, 'unmatched')}
                                className="w-full text-left px-2 py-1.5 text-sm hover:bg-red-50 hover:text-red-700 rounded-md transition-colors truncate border-t border-slate-100 mt-1"
                              >
                                Remove Match
                              </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingPhotoId(photo.id)}
                          className="bg-white text-slate-800 px-4 py-2 rounded-lg font-medium text-sm shadow-lg hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-2"
                        >
                          <Edit2 className="w-4 h-4" />
                          Reassign
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {(selectedChildId ? groupedPhotos[selectedChildId] : processedPhotos).length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                <p>No photos found in this folder.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
