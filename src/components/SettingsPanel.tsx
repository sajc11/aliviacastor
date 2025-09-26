import { useEffect } from 'react';
import { useUI, hydrateUI } from '../store/ui';

export default function SettingsPanel() {
  const ui = useUI();
  useEffect(() => { hydrateUI(); }, []);

  return (
    <div
      className="
        mx-auto rounded-[18px] border bg-zinc-200 text-slate-900 shadow-xl ring-1 ring-black/10
        p-4 sm:p-5
        w-[clamp(320px,92vw,720px)]          /* responsive width */
        max-h-[min(80vh,660px)] overflow-auto /* vertical scroll when tall */
      "
    >
      <div className="mb-3 text-base font-semibold">Options</div>

      {/* Fluid grid; wraps instead of pushing sideways */}
      <div
        className="grid gap-x-8 gap-y-3 leading-snug"
        /* min col width so labels don't feel cramped */
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}
      >
        <label className="flex items-start gap-2 break-words">
          <input className="shrink-0" type="checkbox" checked={ui.crt}
                 onChange={e => ui.set({ crt: e.target.checked })}/>
          <span>CRT overlay</span>
        </label>

        <label className="flex items-start gap-2 break-words">
          <input className="shrink-0" type="checkbox" checked={ui.visualizer}
                 onChange={e => ui.set({ visualizer: e.target.checked })}/>
          <span>Music visualizer</span>
        </label>

        <label className="flex items-start gap-2 break-words">
          <input className="shrink-0" type="checkbox" checked={ui.cabinetPeek}
                 onChange={e => ui.set({ cabinetPeek: e.target.checked })}/>
          <span>Cabinet peek</span>
        </label>

        <label className="flex items-start gap-2 break-words">
          <input className="shrink-0" type="checkbox" checked={ui.drawerAnim}
                 onChange={e => ui.set({ drawerAnim: e.target.checked })}/>
          <span>Drawer anim</span>
        </label>

        <label className="flex items-start gap-2 break-words">
          <input className="shrink-0" type="checkbox" checked={ui.viewTransitions}
                 onChange={e => ui.set({ viewTransitions: e.target.checked })}/>
          <span>View transitions</span>
        </label>

        <label className="flex items-start gap-2 break-words">
          <input className="shrink-0" type="checkbox" checked={ui.webGlow}
                 onChange={e => ui.set({ webGlow: e.target.checked })}/>
          <span>Map glow</span>
        </label>

        <label className="flex items-start gap-2 break-words">
          <input className="shrink-0" type="checkbox" checked={ui.y2kTheme}
                 onChange={e => ui.set({ y2kTheme: e.target.checked })}/>
          <span>Y2K theme</span>
        </label>

        <label className="flex items-start gap-2 break-words">
          <input className="shrink-0" type="checkbox" checked={ui.cursorSparkle}
                 onChange={e => ui.set({ cursorSparkle: e.target.checked })}/>
          <span>Cursor sparkles</span>
        </label>

        <label className="flex items-start gap-2 break-words">
          <input className="shrink-0" type="checkbox" checked={ui.monoCabinet}
                 onChange={e => ui.set({ monoCabinet: e.target.checked })}/>
          <span>Mono cabinet</span>
        </label>

         {/* Make this span both columns so it never “bleeds” into the next cell */}
        {/* Collage accents – span the full grid so it never bleeds into the next column */}
        <label className="col-span-full flex items-start gap-2 break-words whitespace-normal">
          <input
            className="shrink-0"
            type="checkbox"
            checked={ui.collageAccents}
            onChange={(e) => ui.set({ collageAccents: e.target.checked })}
          />
          <span>Collage accents (tape, polaroid)</span>
        </label>

      </div>

      {/* Stacked selects so they never collide */}
      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="opt-ring" className="block text-sm font-medium mb-1">Ring speed</label>
          <select
            id="opt-ring"
            value={ui.ringSpeed}
            onChange={e => ui.set({ ringSpeed: e.target.value as any })}
            className="w-full rounded border px-2 py-1 bg-neutral-400"
          >
            <option value="slow">Slow</option>
            <option value="medium">Medium</option>
            <option value="fast">Fast</option>
          </select>
        </div>

        {/* LAST */}
        <div>
          <label htmlFor="opt-density" className="block text-sm font-medium mb-1">Cabinet density</label>
          <select
            id="opt-density"
            value={ui.cabinetDensity}
            onChange={e => ui.set({ cabinetDensity: e.target.value as any })}
            className="w-full rounded border px-2 py-1 bg-neutral-400"
          >
            <option value="cozy">Cozy</option>
            <option value="compact">Compact</option>
          </select>
        </div>
      </div>
    </div>
  );
}
