import { useState, useRef, useEffect } from 'react';

interface CropOverlayProps {
  imageUrl: string;
  onCropChange: (crop: { x: number; y: number; width: number; height: number }) => void;
}

export default function CropOverlay({ imageUrl, onCropChange }: CropOverlayProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [dragging, setDragging] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onCropChange(crop);
  }, [crop, onCropChange]);

  const handleMouseDown = (edge: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(edge);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setCrop(prev => {
      const newCrop = { ...prev };

      switch (dragging) {
        case 'top':
          newCrop.y = Math.max(0, Math.min(y, prev.y + prev.height - 10));
          newCrop.height = prev.height + (prev.y - newCrop.y);
          break;
        case 'bottom':
          newCrop.height = Math.max(10, Math.min(y - prev.y, 100 - prev.y));
          break;
        case 'left':
          newCrop.x = Math.max(0, Math.min(x, prev.x + prev.width - 10));
          newCrop.width = prev.width + (prev.x - newCrop.x);
          break;
        case 'right':
          newCrop.width = Math.max(10, Math.min(x - prev.x, 100 - prev.x));
          break;
      }

      return newCrop;
    });
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <img src={imageUrl} alt="Preview" className="w-full h-full object-contain" />

      <div
        className="absolute border-2 border-blue-500"
        style={{
          left: `${crop.x}%`,
          top: `${crop.y}%`,
          width: `${crop.width}%`,
          height: `${crop.height}%`,
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-1 bg-blue-500 cursor-ns-resize"
          onMouseDown={handleMouseDown('top')}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 cursor-ns-resize"
          onMouseDown={handleMouseDown('bottom')}
        />
        <div
          className="absolute top-0 left-0 bottom-0 w-1 bg-blue-500 cursor-ew-resize"
          onMouseDown={handleMouseDown('left')}
        />
        <div
          className="absolute top-0 right-0 bottom-0 w-1 bg-blue-500 cursor-ew-resize"
          onMouseDown={handleMouseDown('right')}
        />
      </div>
    </div>
  );
}
