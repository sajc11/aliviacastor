import { useEffect, useRef, useState } from 'react';
import SettingsPanel from './SettingsPanel';

export default function GearSettings() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    function onClick(e: MouseEvent) {
      if (open && ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        aria-label="Settings"
        onClick={() => setOpen(v => !v)}
        className="rounded-full bg-zinc-200 px-2 py-2 text-white hover:bg-zinc-300 "
      >
        ⚙️
      </button>

      {open && (
        <div
          /* Right-aligned with a comfortable margin; on very narrow viewports it still fits */
          className="
            fixed z-[100] top-[75px]
            right-4 sm:right-6 md:right-3
            left-auto
            px-3
          "
          /* Optional: ensure the container itself can’t be wider than the viewport */
          style={{ maxWidth: 'min(100vw - 1.5rem, 740px)' }}
        >
          <div ref={ref}>
            <SettingsPanel />
          </div>
        </div>
      )}
    </div>
  );
}
