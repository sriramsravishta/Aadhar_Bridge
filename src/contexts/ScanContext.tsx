import { createContext, useContext, useState, ReactNode } from 'react';

interface ScanContextType {
  scanType: 'long' | 'short' | null;
  setScanType: (type: 'long' | 'short' | null) => void;
  frontImage: string | null;
  setFrontImage: (image: string | null) => void;
  backImage: string | null;
  setBackImage: (image: string | null) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  scanId: string | null;
  setScanId: (id: string | null) => void;
  processedBlob: Blob | null;
  setProcessedBlob: (blob: Blob | null) => void;
  reset: () => void;
}

const ScanContext = createContext<ScanContextType | undefined>(undefined);

export function ScanProvider({ children }: { children: ReactNode }) {
  const [scanType, setScanType] = useState<'long' | 'short' | null>(null);
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [scanId, setScanId] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);

  const reset = () => {
    setScanType(null);
    setFrontImage(null);
    setBackImage(null);
    setCurrentStep(1);
    setScanId(null);
    setProcessedBlob(null);
  };

  return (
    <ScanContext.Provider
      value={{
        scanType,
        setScanType,
        frontImage,
        setFrontImage,
        backImage,
        setBackImage,
        currentStep,
        setCurrentStep,
        scanId,
        setScanId,
        processedBlob,
        setProcessedBlob,
        reset,
      }}
    >
      {children}
    </ScanContext.Provider>
  );
}

export function useScan() {
  const context = useContext(ScanContext);
  if (context === undefined) {
    throw new Error('useScan must be used within a ScanProvider');
  }
  return context;
}
