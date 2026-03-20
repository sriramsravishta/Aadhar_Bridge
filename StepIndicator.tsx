interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  sideName: string;
  scanType?: string;
}

export default function StepIndicator({ currentStep, totalSteps, sideName, scanType }: StepIndicatorProps) {
  return (
    <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-black/40 text-white/80 px-4 py-2 rounded-lg text-[13px] font-medium z-20">
      Step {currentStep} of {totalSteps} — {sideName}
    </div>
  );
}
