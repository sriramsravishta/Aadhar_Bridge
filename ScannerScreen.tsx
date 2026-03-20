import { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useScan } from '../contexts/ScanContext';
import { processForUpload } from '../services/imageProcessor';
import FrameGuide from '../components/FrameGuide';
import CountdownTimer from '../components/CountdownTimer';
import StepIndicator from '../components/StepIndicator';
import ImageSelector from '../components/ImageSelector';
import CaptureButton from '../components/CaptureButton';
import ConfirmationOverlay from '../components/ConfirmationOverlay';

type ScannerState = 'CAMERA_ACTIVE' | 'CONFIRMATION' | 'PREVIEW_COUNTDOWN' | 'STOPPED' | 'SUBMITTING';

interface ScannerScreenProps {
  onComplete: () => void;
  onBack: () => void;
}

export default function ScannerScreen({ onComplete, onBack }: ScannerScreenProps) {
  const { scanType, frontImage, setFrontImage, backImage, setBackImage, currentStep, setCurrentStep, setProcessedBlob } = useScan();

  const [state, setState] = useState<ScannerState>('CAMERA_ACTIVE');
  const [captureDisabled, setCaptureDisabled] = useState(false);
  const [selectedSide, setSelectedSide] = useState<'front' | 'back'>('front');
  const [retakingFor, setRetakingFor] = useState<'front' | 'back' | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
const trackRef = useRef<MediaStreamTrack | null>(null);
const [exposureComp, setExposureComp] = useState<number>(0);
const [exposureRange, setExposureRange] = useState<{ min: number; max: number; step: number } | null>(null);
const [showExposure, setShowExposure] = useState(false);
  const processingRef = useRef<{ cancelled: boolean }>({ cancelled: false });
  const processedRef = useRef<Blob | null>(null);

  const aspectRatio = scanType === 'long' ? 2.34 : 1.59;

  // Start background processing when entering PREVIEW_COUNTDOWN
  useEffect(() => {
    if (state === 'PREVIEW_COUNTDOWN') {
      startBackgroundProcessing();
    }
    return undefined;
  }, [state]);

  useEffect(() => {
    if (state === 'CAMERA_ACTIVE') {
      startCamera();
    }
    return () => stopCamera();
  }, [state]);

  const startCamera = async () => {
  // Progressive constraint strategy: request max resolution the device supports.
  // Fallback chain handles older browsers/devices that reject ideal constraints.
  const constraintOptions: MediaStreamConstraints[] = [
    // Attempt 1: Max resolution + environment camera (ideal = best effort, won't reject)
    {
      video: {
        facingMode: { ideal: 'environment' },
        width:  { ideal: 4096 },
        height: { ideal: 2160 },
      },
    },
    // Attempt 2: Lower resolution target
    {
      video: {
        facingMode: 'environment',
        width:  { ideal: 1920 },
        height: { ideal: 1080 },
      },
    },
    // Attempt 3: Bare minimum — any camera
    { video: true },
  ];

  let stream: MediaStream | null = null;

  for (const constraints of constraintOptions) {
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      break; // Success — stop trying
    } catch {
      continue; // Try next fallback
    }
  }

  if (!stream) return; // Camera completely unavailable

  streamRef.current = stream;
  if (videoRef.current) {
    videoRef.current.srcObject = stream;
  }

  const track = stream.getVideoTracks()[0];
  trackRef.current = track;

  // Log actual resolution obtained
  const settings = track.getSettings();
  console.log(`[Camera] Resolution: ${settings.width}×${settings.height}`);

   // Apply advanced camera constraints for maximum clarity
   try {
     const capabilities = track.getCapabilities() as any;
     const advancedConstraints: any[] = [];

     // Continuous autofocus
     if (capabilities.focusMode?.includes('continuous')) {
       advancedConstraints.push({ focusMode: 'continuous' });
     }

     // Continuous white balance (prevents orange tint under office lighting)
     if (capabilities.whiteBalanceMode?.includes('continuous')) {
       advancedConstraints.push({ whiteBalanceMode: 'continuous' });
     }

     // Max sharpness for document clarity
     if (capabilities.sharpness) {
       advancedConstraints.push({ sharpness: capabilities.sharpness.max });
     }

     // Reset zoom to 1x (some devices keep previous zoom state)
     if (capabilities.zoom) {
       advancedConstraints.push({ zoom: capabilities.zoom.min });
     }

     // Mid-range brightness for balanced document capture
     if (capabilities.brightness) {
       const mid = (capabilities.brightness.min + capabilities.brightness.max) / 2;
       advancedConstraints.push({ brightness: mid });
     }

     if (advancedConstraints.length > 0) {
       await track.applyConstraints({ advanced: advancedConstraints });
       console.log(`[Camera] Applied ${advancedConstraints.length} advanced constraints`);
     }

     if (capabilities.exposureCompensation) {
       setExposureRange({
         min: capabilities.exposureCompensation.min,
         max: capabilities.exposureCompensation.max,
         step: capabilities.exposureCompensation.step,
       });
       setShowExposure(true);
     }
   } catch {
     // Constraints not supported — camera still works fine
   }
};

  const handleExposureChange = async (value: number) => {
  setExposureComp(value);
  if (trackRef.current) {
    try {
      await trackRef.current.applyConstraints({
        advanced: [{ exposureCompensation: value } as any],
      });
    } catch {
      // Not supported
    }
  }
};

const handleTapToFocus = async (e: React.TouchEvent<HTMLVideoElement>) => {
  if (!trackRef.current) return;
  try {
    const capabilities = trackRef.current.getCapabilities() as any;
    if (capabilities.focusMode?.includes('manual')) {
      // Trigger single-shot focus then return to continuous
      await trackRef.current.applyConstraints({
        advanced: [{ focusMode: 'manual' } as any],
      });
      setTimeout(async () => {
        try {
          await trackRef.current?.applyConstraints({
            advanced: [{ focusMode: 'continuous' } as any],
          });
        } catch {}
      }, 500);
    }
  } catch {
    // Not supported
  }
};

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current || captureDisabled) return;

    setCaptureDisabled(true);
    setTimeout(() => setCaptureDisabled(false), 500);

    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // --- Frame-matched capture logic ---
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let frameX: number, frameY: number, frameW: number, frameH: number;

    if (scanType === 'long') {
      const topPad = 64;
      const bottomPad = 32;
      frameH = vh - topPad - bottomPad;
      frameW = (frameH / aspectRatio) * 1.1;  // 10% wider than base
      frameX = (vw - frameW) / 2;
      frameY = topPad;
    } else {
      frameW = Math.min(vw * 0.85, vh * 0.8 * aspectRatio);
      frameH = frameW / aspectRatio;
      if (frameH > vh * 0.8) {
        frameH = vh * 0.8;
        frameW = frameH * aspectRatio;
      }
      frameX = (vw - frameW) / 2;
      frameY = (vh - frameH) / 2;
    }

    const videoW = video.videoWidth;
    const videoH = video.videoHeight;
    const videoAR = videoW / videoH;
    const viewportAR = vw / vh;

    let scale: number, offsetX: number, offsetY: number;

    if (videoAR > viewportAR) {
      scale = videoH / vh;
      offsetX = (videoW - vw * scale) / 2;
      offsetY = 0;
    } else {
      scale = videoW / vw;
      offsetX = 0;
      offsetY = (videoH - vh * scale) / 2;
    }

    let sourceX = frameX * scale + offsetX;
    let sourceY = frameY * scale + offsetY;
    let sourceWidth = frameW * scale;
    let sourceHeight = frameH * scale;

    const margin = 8;
    sourceX = Math.max(0, sourceX - margin);
    sourceY = Math.max(0, sourceY - margin);
    sourceWidth = Math.min(videoW - sourceX, sourceWidth + margin * 2);
    sourceHeight = Math.min(videoH - sourceY, sourceHeight + margin * 2);

    canvas.width = sourceWidth;
    canvas.height = sourceHeight;

    ctx.drawImage(
      video,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, sourceWidth, sourceHeight
    );

    const imageData = canvas.toDataURL('image/jpeg', 0.95);

    if (scanType === 'long') {
      setFrontImage(imageData);
      stopCamera();
      setState('PREVIEW_COUNTDOWN');
    } else {
      if (retakingFor === 'front') {
        setFrontImage(imageData);
        setRetakingFor(null);
        stopCamera();
        setState('STOPPED');
      } else if (retakingFor === 'back') {
        setBackImage(imageData);
        setRetakingFor(null);
        stopCamera();
        setState('STOPPED');
      } else if (currentStep === 1) {
        setFrontImage(imageData);
        stopCamera();
        setState('CONFIRMATION');

        if (navigator.vibrate) {
          navigator.vibrate(100);
        }

        setTimeout(() => {
          setCurrentStep(2);
          setState('CAMERA_ACTIVE');
        }, 1500);
      } else {
        setBackImage(imageData);
        stopCamera();
        setState('PREVIEW_COUNTDOWN');
      }
    }
  };

  const startBackgroundProcessing = useCallback(async () => {
    // Reset previous processing state
    processingRef.current = { cancelled: false };
    processedRef.current = null;
    setProcessedBlob(null);

    const images: string[] = [];
    if (frontImage) images.push(frontImage);
    if (scanType === 'short' && backImage) images.push(backImage);

    if (images.length === 0) return;

    try {
      const blob = await processForUpload(images);
      // Only store if not cancelled (user didn't press Stop)
      if (!processingRef.current.cancelled) {
        processedRef.current = blob;
        console.log(`[Scanner] Processing complete: ${(blob.size / 1024).toFixed(0)}KB`);
      }
    } catch (err) {
      console.error('[Scanner] Background processing failed:', err);
    }
  }, [frontImage, backImage, scanType, setProcessedBlob]);

  const handleStop = () => {
    // Wipe any in-memory processed data
    processingRef.current.cancelled = true;
    processedRef.current = null;
    setProcessedBlob(null);
    setState('STOPPED');
  };

  const handleRetake = (side?: 'front' | 'back') => {
    if (scanType === 'short' && side) {
      setRetakingFor(side);
      if (side === 'front') {
        setCurrentStep(1);
      } else {
        setCurrentStep(2);
      }
    } else {
      setFrontImage(null);
      setBackImage(null);
      setCurrentStep(1);
      setRetakingFor(null);
    }

    setState('CAMERA_ACTIVE');
  };

  const handleSubmit = async () => {
    // Transfer the processed blob to context for ProgressScreen
    if (processedRef.current) {
      setProcessedBlob(processedRef.current);
    }
    setState('SUBMITTING');

    setTimeout(() => {
      onComplete();
    }, 500);
  };

  const handleCountdownComplete = () => {
    handleSubmit();
  };

  const handleBack = () => {
    setFrontImage(null);
    setBackImage(null);
    setCurrentStep(1);
    setRetakingFor(null);
    stopCamera();
    onBack();
  };

  const renderCamera = () => (
    <>
      <video
  ref={videoRef}
  autoPlay
  playsInline
  muted
  className="absolute inset-0 w-full h-full object-cover"
  onTouchStart={handleTapToFocus}
/>
      <FrameGuide aspectRatio={aspectRatio} scanType={scanType} />

      <button
        onClick={handleBack}
        className="absolute top-4 left-4 w-10 h-10 rounded-lg bg-black/40 text-white/90 flex items-center justify-center z-30 transition-all duration-200 ease-ink active:scale-[0.95]"
      >
        <X className="w-5 h-5" strokeWidth={1.5} />
      </button>

      {scanType === 'short' && (
  <>
    <StepIndicator
      currentStep={currentStep}
      totalSteps={2}
      sideName={retakingFor ? `Retaking: ${retakingFor === 'front' ? 'Front' : 'Back'} Side` : (currentStep === 1 ? 'Front Side' : 'Back Side')}
      scanType="Short Aadhaar"
    />
  
  </>
)}

      <div className="absolute bottom-[24px] left-1/2 transform -translate-x-1/2 z-20">
        <CaptureButton onClick={captureImage} disabled={captureDisabled} />
      </div>

{/* Exposure slider */}
{showExposure && exposureRange && (
  <div className="absolute right-3 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2">
    <span className="text-white text-xs">☀</span>
    <input
      type="range"
      min={exposureRange.min}
      max={exposureRange.max}
      step={exposureRange.step}
      value={exposureComp}
      onChange={(e) => handleExposureChange(Number(e.target.value))}
      className="h-[120px] appearance-none bg-transparent"
      style={{
        writingMode: 'vertical-lr',
        direction: 'rtl',
        WebkitAppearance: 'slider-vertical',
        width: '28px',
        accentColor: '#ffffff',
      }}
    />
    <span className="text-white text-xs opacity-50">☀</span>
  </div>
)}
      
      <canvas ref={canvasRef} className="hidden" />
    </>
  );

  const renderConfirmation = () => {
    if (!frontImage) return null;

    return (
      <>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        <ConfirmationOverlay imageUrl={frontImage} message="Front side captured ✓" />
      </>
    );
  };

  const renderPreviewCountdown = () => {
    return (
      <div className="fixed inset-0 bg-[#1a1a1a] flex flex-col overflow-hidden" style={{ height: '100dvh' }}>
        

        <div className="flex-[3] bg-[#1a1a1a] flex flex-col min-h-0 relative">
  {scanType === 'long' && frontImage ? (
    // container fixed between 32px from top and 32px above the buttons (buttons at bottom 64px)
    <div
      style={{
        position: 'absolute',
        top: '80px',
        bottom: 'calc(96px)', // 64px buttons + 32px gap
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingLeft: '16px',
        paddingRight: '16px',
      }}
    >
      <img
        src={frontImage}
        alt="Preview"
        style={{
          maxHeight: '100%', // cannot exceed container height
          width: 'auto',     // width adjusts according to aspect ratio
          objectFit: 'contain',
        }}
      />
    </div>
  ) : scanType === 'short' && frontImage && backImage ? (
  <div
    style={{
      position: 'absolute',
      top: '80px',
      bottom: 'calc(64px + 32px)', // buttons + gap
      left: 0,
      right: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      paddingLeft: '16px',
      paddingRight: '16px',
      overflow: 'hidden',
    }}
  >
    <div style={{ flex: 1, minHeight: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <img
        src={frontImage}
        alt="Front"
        style={{
          maxHeight: '100%',
          maxWidth: '100%',
          objectFit: 'contain',
        }}
      />
    </div>

    <div style={{ flex: 1, minHeight: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <img
        src={backImage}
        alt="Back"
        style={{
          maxHeight: '100%',
          maxWidth: '100%',
          objectFit: 'contain',
        }}
      />
    </div>
  </div>
) : null}
</div>

        <div className="absolute bottom-[24px] left-0 right-0">
          <CountdownTimer
            initialSeconds={5}
            onComplete={handleCountdownComplete}
            onStop={handleStop}
            paused={false}
          />
        </div>
      </div>
    );
  };

  const renderStopped = () => {
    const displayImage = scanType === 'long'
      ? frontImage
      : (selectedSide === 'front' ? frontImage : backImage);

    return (
      <div className="fixed inset-0 bg-[#1a1a1a] flex flex-col overflow-hidden" style={{ height: '100dvh' }}>
        <button
  onClick={handleBack}
  className="absolute top-4 left-4 w-10 h-10 rounded-lg bg-black/40 text-white/90 flex items-center justify-center z-30 transition-all duration-200 ease-ink active:scale-[0.95]"
>
  <X className="w-5 h-5" strokeWidth={1.5} />
</button>
        

        <div className="flex-[4] bg-[#1a1a1a] flex flex-col min-h-0 relative">
  {displayImage && (
    scanType === 'short' ? (

      // SHORT AADHAAR: center preview between X (top) and the thumbnails/buttons area (bottom).
      // Adjust `topPx` / `bottomExtraPx` if you want the image moved slightly.
      <div
        style={{
          position: 'absolute',
          top: '56px', // distance from top (keeps below the X button)
          bottom: 'calc(64px + 96px)', // 64px buttons + ~96px space for thumbnails/toggle area
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}
      >
        <img
          src={displayImage}
          alt="Preview"
          style={{
            maxHeight: '100%', // will not exceed the vertical space we reserved
            width: 'auto',     // width adjusts according to aspect ratio (portrait will be narrow)
            objectFit: 'contain',
          }}
        />
      </div>

    ) : (

      // LONG AADHAAR: keep the exact previous constrained layout (no changes)
      <div
        style={{
          position: 'absolute',
          top: '80px',
          bottom: 'calc(64px + 32px)',
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}
      >
        <img
          src={displayImage}
          alt="Preview"
          style={{
            maxHeight: '100%',
            width: 'auto',
            objectFit: 'contain',
          }}
        />
      </div>

    )
  )}
</div>

        <div className="absolute bottom-[24px] left-0 right-0 px-4 space-y-6">
          {scanType === 'short' && frontImage && backImage && (
            <ImageSelector
              frontImage={frontImage}
              backImage={backImage}
              selectedSide={selectedSide}
              onSelectSide={setSelectedSide}
              onRetakeSide={handleRetake}
            />
          )}

          <div className="flex gap-3">
            <button
              onClick={() => handleRetake(scanType === 'short' ? selectedSide : undefined)}
              className="flex-1 px-6 py-3 border border-white/20 text-white bg-white/10 rounded-lg font-medium text-[15px] transition-all duration-200 ease-ink active:scale-[0.97]"
            >
              {scanType === 'short' ? 'Retake Selected' : 'Retake'}
            </button>
            <button
              onClick={() => {
                setState('PREVIEW_COUNTDOWN');
              }}
              className="flex-1 px-6 py-3 bg-frame text-white rounded-lg font-medium text-[15px] transition-all duration-200 ease-ink active:scale-[0.97]"
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSubmitting = () => (
    <div className="absolute inset-0 bg-[#1a1a1a] flex flex-col items-center justify-center gap-4">
      <div className="w-32 h-[2px] bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-frame animate-ink-fill rounded-full" />
      </div>
      <div className="text-white/70 text-[15px] font-medium">Submitting</div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black" style={{ height: '100dvh' }}>
      {state === 'CAMERA_ACTIVE' && renderCamera()}
      {state === 'CONFIRMATION' && renderConfirmation()}
      {state === 'PREVIEW_COUNTDOWN' && renderPreviewCountdown()}
      {state === 'STOPPED' && renderStopped()}
      {state === 'SUBMITTING' && renderSubmitting()}
    </div>
  );
}
