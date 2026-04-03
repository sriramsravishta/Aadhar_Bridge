import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useScan } from '../contexts/ScanContext';
import * as scanService from '../services/scanService';
import ProgressStepper from '../components/ProgressStepper';

interface ProgressScreenProps {
  onComplete: () => void;
}

export default function ProgressScreen({ onComplete }: ProgressScreenProps) {
  const { userId } = useAuth();
  const { scanType, frontImage, backImage, processedBlob, setScanId } = useScan();

  const [steps, setSteps] = useState([
    { label: 'Document Submitted', status: 'completed' as const },
    { label: 'Extracting Details', status: 'active' as const },
    { label: 'Transfer Complete', status: 'pending' as const },
  ]);

  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const hasInitiated = useRef(false);

  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (hasInitiated.current) return;
    hasInitiated.current = true;
    initiateScan();

    // Proper cleanup — stop polling when component unmounts
    return () => {
      unsubscribeRef.current?.();
    };
  }, []);

  const initiateScan = async () => {
    if (!userId || !frontImage || !scanType) return;

    try {
      // Prefer the compressed PDF blob from background processing.
      // Falls back to raw JPEG base64 if blob unavailable.
      const backImg = scanType === 'short' && backImage ? backImage : null;

      const newScan = await scanService.submitScan({
        user_id: userId,
        front_image: frontImage,
        back_image: backImg,
        processed_pdf: processedBlob,
      });

      setScanId(newScan.id);

      // Poll Azure Function for the extracted record
      const unsubscribe = scanService.pollScanProgress(newScan.id, userId, {
        onOutputReady: () => {
          setSteps([
            { label: 'Document Submitted', status: 'completed' },
            { label: 'Extracting Details', status: 'completed' },
            { label: 'Transfer Complete', status: 'active' },
          ]);
        },
        onStatusComplete: () => {
          setSteps([
            { label: 'Document Submitted', status: 'completed' },
            { label: 'Extracting Details', status: 'completed' },
            { label: 'Transfer Complete', status: 'completed' },
          ]);
          setShowSuccess(true);
          setTimeout(() => onComplete(), 2000);
        },
        onError: (err) => {
          console.warn('[ProgressScreen] Poll error (non-fatal):', err.message);
        },
      });

      // Store unsubscribe so the cleanup effect can call it
      unsubscribeRef.current = unsubscribe;
    } catch (err: any) {
      setUploadError(err?.message ?? 'Submission failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center p-5 pt-12">
      <div className="w-full max-w-sm">
        <p className="text-[11px] font-medium text-text-secondary uppercase tracking-wider text-center mb-2">
          {scanType === 'long' ? 'Long Aadhaar Scan' : 'Short Aadhaar Scan'}
        </p>
        <h1 className="text-xl font-semibold text-text-primary text-center mb-12">Processing Scan</h1>

        <ProgressStepper steps={steps} />

        {uploadError && (
          <div className="mt-8 text-center">
            <p className="text-sm text-red-400 font-medium">{uploadError}</p>
          </div>
        )}

        {showSuccess && (
          <div className="mt-12 text-center animate-fade-up">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-success/10 rounded-card mb-4">
              <svg
                className="w-8 h-8 text-success"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  className="animate-draw-check"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-lg font-semibold text-success">Scan Complete</p>
          </div>
        )}
      </div>
    </div>
  );
}
