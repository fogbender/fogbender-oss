import {
  ThickButton,
  ThinButton,
} from "fogbender-client/src/shared";

export const OnboardingNavControls = ({nextDisabled, onPrev, onNext, onSkip}: {nextDisabled: boolean; onPrev?: () => void; onNext: () => void; onSkip?: () => void}) => {
  return (
    <div className="mt-20 flex flex-col gap-4">
      <div className="flex items-center gap-4">
        {onPrev && (
          <ThinButton
            className="self-start w-36 h-11"
            onClick={() => {
              onPrev();
            }}
          >
            ← Back
          </ThinButton>
        )}
        <ThickButton
          disabled={nextDisabled}
          className="self-start w-36"
          onClick={() => {
            onNext();
          }}
        >
          Continue →
        </ThickButton>
      </div>
      {onSkip && (
        <ThinButton
          className="self-start w-36 h-11"
          onClick={() => {
            onSkip();
          }}
        >
          Skip
        </ThinButton>
      )}
    </div>
  );
};
