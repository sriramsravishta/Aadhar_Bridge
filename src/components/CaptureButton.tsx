interface CaptureButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export default function CaptureButton({ onClick, disabled = false }: CaptureButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-[68px] h-[68px] rounded-full bg-transparent border-[3px] border-white/80 disabled:opacity-50 transition-all duration-200 ease-ink active:scale-[0.92] flex items-center justify-center"
      aria-label="Capture"
    >
      <div className="w-[56px] h-[56px] rounded-full bg-white/90" />
    </button>
  );
}
