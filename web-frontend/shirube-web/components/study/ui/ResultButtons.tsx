'use client';

import type { StudyOutcome } from '../types';

type Props = {
  onResult: (outcome: StudyOutcome) => void;
  disabled?: boolean;
};

// Three equal-weight buttons matching mobile. Color-coding can come in
// the polish phase — the user grades honestly here, no visual hint
// toward "the right answer".
export function ResultButtons({ onResult, disabled }: Props) {
  return (
    <div className="mt-5 flex w-full max-w-155 gap-2 @md:mt-7 @md:gap-3">
      <ResultBtn label="Again" hint="1" onPress={() => onResult('again')} disabled={disabled} />
      <ResultBtn label="Hard"  hint="2" onPress={() => onResult('hard')}  disabled={disabled} />
      <ResultBtn label="Easy"  hint="3" onPress={() => onResult('easy')}  disabled={disabled} />
    </div>
  );
}

function ResultBtn({
  label,
  hint,
  onPress,
  disabled,
}: {
  label: string;
  hint: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-lgc-border-strong px-3 py-3 text-[13px] font-semibold text-lgc-fg transition-colors hover:bg-lgc-bg-elev disabled:opacity-50 @md:gap-2.5 @md:px-5 @md:py-4 @md:text-[15px]"
    >
      {label}
      <kbd className="rounded border border-lgc-border-strong px-1.5 py-0.5 text-[10px] font-normal text-lgc-fg-muted font-mono">
        {hint}
      </kbd>
    </button>
  );
}
