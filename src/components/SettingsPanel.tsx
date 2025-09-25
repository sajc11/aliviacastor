import { useEffect } from 'react';
import { useUI, hydrateUI } from '../store/ui';

export default function SettingsPanel(){
  const ui = useUI();
  useEffect(()=>{ hydrateUI(); },[]);
  return (
    <div className="rounded-2xl border p-3 text-sm bg-white/80 dark:bg-slate-800">
      <div className="mb-2 font-semibold">Options</div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex items-center gap-2"><input type="checkbox" checked={ui.crt} onChange={e=>ui.set({crt:e.target.checked})}/> CRT overlay</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={ui.visualizer} onChange={e=>ui.set({visualizer:e.target.checked})}/> Music visualizer</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={ui.cabinetPeek} onChange={e=>ui.set({cabinetPeek:e.target.checked})}/> Cabinet peek</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={ui.drawerAnim} onChange={e=>ui.set({drawerAnim:e.target.checked})}/> Drawer anim</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={ui.viewTransitions} onChange={e=>ui.set({viewTransitions:e.target.checked})}/> View transitions</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={ui.webGlow} onChange={e=>ui.set({webGlow:e.target.checked})}/> Map glow</label>
        <label className="flex items-center gap-2"><span>Cabinet density</span>
          <select value={ui.cabinetDensity} onChange={e=>ui.set({cabinetDensity:e.target.value as any})} className="rounded border px-2 py-1">
            <option value="compact">Compact</option><option value="cozy">Cozy</option>
          </select>
        </label>
        <label className="flex items-center gap-2"><span>Ring speed</span>
          <select value={ui.ringSpeed} onChange={e=>ui.set({ringSpeed:e.target.value as any})} className="rounded border px-2 py-1">
            <option value="slow">Slow</option><option value="medium">Medium</option><option value="fast">Fast</option>
          </select>
        </label>
        <label className="col-span-2 flex items-center gap-2">
          <input type="checkbox" checked={ui.collageAccents} onChange={e=>ui.set({collageAccents:e.target.checked})}/>
          Collage accents (tape, polaroid)
        </label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={ui.y2kTheme} onChange={e=>ui.set({y2kTheme:e.target.checked})}/> Y2K theme</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={ui.cursorSparkle} onChange={e=>ui.set({cursorSparkle:e.target.checked})}/> Cursor sparkles</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={ui.monoCabinet} onChange={e=>ui.set({monoCabinet:e.target.checked})}/> Mono cabinet</label>
      </div>
    </div>
  );
}
