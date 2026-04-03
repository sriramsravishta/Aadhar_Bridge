interface ConfirmationOverlayProps {
  imageUrl: string;
  message: string;
}

export default function ConfirmationOverlay({ imageUrl, message }: ConfirmationOverlayProps) {
  return (
    <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center z-30">
      <div className="w-2/5 max-w-xs rounded-card overflow-hidden mb-6 animate-fade-up">
        <img src={imageUrl} alt="Captured" className="w-full h-full object-contain" />
      </div>

      <div className="flex items-center gap-3 mb-2 animate-fade-up" style={{ animationDelay: '100ms' }}>
        <div className="w-8 h-8 rounded-lg bg-success flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path className="animate-draw-check" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-white/90 text-[17px] font-medium">{message}</p>
      </div>

      <p className="text-white/40 text-[13px]">Preparing for back side...</p>
    </div>
  );
}
