interface FrameGuideProps {
  aspectRatio: number;
  scanType: 'long' | 'short';
}

export default function FrameGuide({ aspectRatio, scanType }: FrameGuideProps) {
  return (
    <>
      {/* LONG AADHAAR OVERLAY */}
      {scanType === 'long' && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-10 rounded-lg"
          style={{
            top: '64px',
            bottom: '32px',
            width: `calc((100dvh - 64px - 32px) / ${aspectRatio} * 1.1)`,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
          }}
        />
      )}

      {/* SHORT AADHAAR OVERLAY */}
      {scanType === 'short' && (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 rounded-lg"
          style={{
            width: `min(85vw, calc(80vh * ${aspectRatio}))`,
            height: `min(calc(85vw / ${aspectRatio}), 80vh)`,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
          }}
        />
      )}

      <div className="absolute top-4 left-0 right-0 text-center z-20 px-4">
        <span className="inline-block bg-black/40 text-white/80 text-[13px] font-medium px-4 py-2 rounded-lg">
          Align Aadhaar card within the frame
        </span>
      </div>
    </>
  );
}