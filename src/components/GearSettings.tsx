import { useEffect, useRef, useState } from 'react';
import SettingsPanel from './SettingsPanel';

export default function GearSettings(){
  const [open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement|null>(null);
  useEffect(()=>{
    const on=(e:MouseEvent)=>{ if(open && ref.current && !ref.current.contains(e.target as any)) setOpen(false); };
    window.addEventListener('mousedown', on); return ()=>window.removeEventListener('mousedown', on);
  },[open]);
  return (
    <div ref={ref} className="relative">
      <button onClick={()=>setOpen(o=>!o)} aria-label="Settings"
        className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-white shadow-md transition hover:scale-105 hover:bg-white/20">
        <span className="text-lg leading-none">⚙</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[320px] max-w-[90vw] rounded-2xl border border-white/20 bg-white/90 p-2 text-slate-900 shadow-xl dark:bg-slate-800">
          <SettingsPanel />
        </div>
      )}
    </div>
  );
}
