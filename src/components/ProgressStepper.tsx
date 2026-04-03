interface Step {
  label: string;
  status: 'pending' | 'active' | 'completed';
}

interface ProgressStepperProps {
  steps: Step[];
}

export default function ProgressStepper({ steps }: ProgressStepperProps) {
  return (
    <div className="flex items-start justify-center px-2">
      {steps.map((step, index) => (
        <div key={index} className="flex items-start">
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-card flex items-center justify-center transition-all duration-500 ease-ink ${
                step.status === 'completed'
                  ? 'bg-success'
                  : step.status === 'active'
                  ? 'bg-frame animate-gentle-pulse'
                  : 'bg-border'
              }`}
            >
              {step.status === 'completed' ? (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path className="animate-draw-check" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : step.status === 'active' ? (
                <div className="w-8 h-[2px] bg-white/30 rounded-full overflow-hidden">
                  <div className="h-full bg-white animate-ink-fill rounded-full" />
                </div>
              ) : (
                <div className="w-2 h-2 bg-white/60 rounded-full" />
              )}
            </div>
            <p className="mt-2 text-[12px] font-medium text-text-secondary text-center max-w-[90px]">{step.label}</p>
          </div>

          {index < steps.length - 1 && (
            <div
              className={`w-12 h-[2px] mt-5 mx-1 transition-all duration-500 ease-ink flex-shrink-0 rounded-full ${
                steps[index + 1].status === 'completed'
                  ? 'bg-success'
                  : 'bg-border'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
