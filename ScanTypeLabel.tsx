interface ScanTypeLabelProps {
  scanType: string; 
}

export default function ScanTypeLabel({ scanType }: ScanTypeLabelProps) {
  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/40 text-white/80 px-4 py-2 rounded-lg text-[13px] font-medium z-20">
      {scanType}
    </div>
  );
}
