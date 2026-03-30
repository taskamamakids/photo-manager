/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Child, ProcessedPhoto } from './types';
import { loadModels } from './lib/faceApi';
import { saveChildren, loadChildren } from './lib/storage';
import { Step1Master } from './components/Step1Master';
import { Step2Upload } from './components/Step2Upload';
import { Step3Gallery } from './components/Step3Gallery';
import { Camera, ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [childrenList, setChildrenList] = useState<Child[]>([]);
  const [processedPhotos, setProcessedPhotos] = useState<ProcessedPhoto[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        await loadModels();
        setModelsLoaded(true);
        
        // Load saved children
        const savedChildren = await loadChildren();
        setChildrenList(savedChildren);
        setIsDataLoaded(true);
      } catch (err) {
        console.error("Failed to load models or data", err);
        setModelError("Failed to load facial recognition models. Please check your connection.");
      }
    }
    init();
  }, []);

  // Save children whenever the list changes, but only after initial load
  useEffect(() => {
    if (isDataLoaded) {
      saveChildren(childrenList);
    }
  }, [childrenList, isDataLoaded]);

  if (modelError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 text-center max-w-md">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Initialization Error</h2>
          <p className="text-slate-600">{modelError}</p>
        </div>
      </div>
    );
  }

  if (!modelsLoaded || !isDataLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center max-w-md flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-6" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Loading App Data</h2>
          <p className="text-slate-500">Initializing facial recognition models and loading saved class lists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-inner">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">Taska Mama Kids</h1>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-0.5">Photo Organizer</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            <span className="text-xs font-semibold text-green-800 tracking-wide">100% LOCAL PROCESSING</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Stepper */}
        <div className="mb-10">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 rounded-full -z-10"></div>
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-500 rounded-full -z-10 transition-all duration-500 ease-in-out"
              style={{ width: `${((step - 1) / 2) * 100}%` }}
            ></div>

            {[
              { num: 1, title: "Master Photos", desc: "Teach the AI" },
              { num: 2, title: "Bulk Upload", desc: "WhatsApp Dump" },
              { num: 3, title: "Gallery", desc: "Review & Export" }
            ].map((s) => (
              <div key={s.num} className="flex flex-col items-center gap-2 bg-slate-50 px-2">
                <button
                  onClick={() => s.num < step && setStep(s.num as 1 | 2 | 3)}
                  disabled={s.num > step}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300",
                    step === s.num 
                      ? "bg-blue-600 text-white shadow-md ring-4 ring-blue-100 scale-110" 
                      : step > s.num 
                        ? "bg-blue-500 text-white hover:bg-blue-600 cursor-pointer" 
                        : "bg-white text-slate-400 border-2 border-slate-200 cursor-not-allowed"
                  )}
                >
                  {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
                </button>
                <div className="text-center">
                  <p className={cn("text-sm font-semibold", step >= s.num ? "text-slate-800" : "text-slate-400")}>{s.title}</p>
                  <p className="text-xs text-slate-500 hidden sm:block">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="transition-all duration-500">
          {step === 1 && (
            <Step1Master 
              childrenList={childrenList} 
              setChildrenList={setChildrenList} 
              onNext={() => setStep(2)} 
            />
          )}
          {step === 2 && (
            <Step2Upload 
              childrenList={childrenList} 
              processedPhotos={processedPhotos} 
              setProcessedPhotos={setProcessedPhotos} 
              onNext={() => setStep(3)} 
            />
          )}
          {step === 3 && (
            <Step3Gallery 
              childrenList={childrenList} 
              processedPhotos={processedPhotos} 
              setProcessedPhotos={setProcessedPhotos} 
            />
          )}
        </div>
      </main>
    </div>
  );
}
