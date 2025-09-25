import { useId, useMemo, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

type Props = {
  value: number;                 // 0..5
  onChange: (v: number) => void; // emits in 0.5 steps
  size?: number;                 // px
  color?: string;                // fill color
  bg?: string;                   // unfilled color
  label?: string;                // aria label
};

function Star({
  fraction,
  size = 24,
  color = '#FFC83D',
  bg = '#E2E8F0',
  clipId,
}: {
  fraction: number; size?: number; color?: string; bg?: string; clipId: string;
}) {
  const path = 'M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.401 8.168L12 18.897l-7.335 3.868 1.401-8.168L.132 9.21l8.2-1.192z';
  const w = 24, h = 24;
  const clipWidth = Math.max(0, Math.min(1, fraction)) * w;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={clipWidth} height={h} />
        </clipPath>
      </defs>
      <path d={path} fill={bg} />
      <path d={path} fill={color} clipPath={`url(#${clipId})`} />
    </svg>
  );
}

export default function StarRating({
  value,
  onChange,
  size = 24,
  color = '#FFC83D',
  bg = '#E2E8F0',
  label = 'Rating',
}: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const id = useId();

  const display = hover ?? value;
  const fractions = useMemo(
    () => new Array(5).fill(0).map((_, i) => Math.max(0, Math.min(1, display - i))),
    [display]
  );

  function setByHalf(index: number, rightHalf: boolean) {
    const v = index + (rightHalf ? 1 : 0.5);
    onChange(Number(v.toFixed(1)));
  }

  function onKey(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.min(5, Number((value + 0.5).toFixed(1))));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(0, Number((value - 0.5).toFixed(1))));
    } else if (e.key === 'Home') {
      e.preventDefault(); onChange(0);
    } else if (e.key === 'End') {
      e.preventDefault(); onChange(5);
    }
  }

  return (
    <div
      role="slider"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={5}
      aria-valuenow={value}
      aria-valuetext={`${value.toFixed(1)} out of 5`}
      tabIndex={0}
      onKeyDown={onKey}
      className="inline-flex items-center gap-1"
      onMouseLeave={() => setHover(null)}
    >
      {fractions.map((f, i) => (
        <div key={i} className="relative">
          <Star fraction={f} size={size} color={color} bg={bg} clipId={`${id}-star-${i}`} />
          {/* hit areas */}
          <button
            type="button"
            className="absolute inset-y-0 left-0 w-1/2 opacity-0"
            aria-label={`${i + 0.5} stars`}
            onMouseEnter={() => setHover(i + 0.5)}
            onFocus={() => setHover(i + 0.5)}
            onClick={() => setByHalf(i, false)}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 w-1/2 opacity-0"
            aria-label={`${i + 1} stars`}
            onMouseEnter={() => setHover(i + 1)}
            onFocus={() => setHover(i + 1)}
            onClick={() => setByHalf(i, true)}
          />
        </div>
      ))}
      <span className="ml-2 text-sm tabular-nums">{display.toFixed(1)}</span>
    </div>
  );
}
