interface ImageSelectorProps {
  frontImage: string;
  backImage: string;
  selectedSide: 'front' | 'back';
  onSelectSide: (side: 'front' | 'back') => void;
  onRetakeSide: (side: 'front' | 'back') => void;
}

export default function ImageSelector({
  frontImage,
  backImage,
  selectedSide,
  onSelectSide,
  onRetakeSide,
}: ImageSelectorProps) {
  return (
    <div className="flex gap-3 justify-center mb-4">
      <div
        onClick={() => onSelectSide('front')}
        className={`relative w-28 h-[72px] rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ease-ink ${
          selectedSide === 'front' ? 'ring-2 ring-frame ring-offset-2 ring-offset-black' : 'ring-1 ring-white/20'
        }`}
      >
        <img src={frontImage} alt="Front" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <span className="text-white/90 text-[11px] font-medium uppercase tracking-wider">Side 1</span>
        </div>
      </div>

      <div
        onClick={() => onSelectSide('back')}
        className={`relative w-28 h-[72px] rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ease-ink ${
          selectedSide === 'back' ? 'ring-2 ring-frame ring-offset-2 ring-offset-black' : 'ring-1 ring-white/20'
        }`}
      >
        <img src={backImage} alt="Back" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <span className="text-white/90 text-[11px] font-medium uppercase tracking-wider">Side 2</span>
        </div>
      </div>
    </div>
  );
}
