import { useEffect, useState } from 'react';
type SiteMode = 'professional'|'personal'; const KEY='aliviacastor-site-mode';
const getInitial=():SiteMode => (typeof window==='undefined'? 'professional' : (localStorage.getItem(KEY)==='personal'?'personal':'professional'));

export default function ModeToggle(){
  const [mode,setMode]=useState<SiteMode>(getInitial);

  useEffect(()=>{
    document.body.dataset.mode=mode;
    localStorage.setItem(KEY, mode);
    window.dispatchEvent(new CustomEvent('modechange',{ detail: mode }));
  },[mode]);

  function swap(){
    const next = mode==='professional' ? 'personal' : 'professional';
    setMode(next);
    const to = next==='personal' ? '/creative' : '/';
    // view transition if available
    // @ts-ignore
    if (document.startViewTransition) (document as any).startViewTransition(()=> location.href=to);
    else location.href = to;
  }

  return (
    <button onClick={swap}
      className="relative inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:scale-105 hover:bg-white/20">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/30 text-xs font-semibold">{mode==='professional'?'Pro':'Play'}</span>
      <span className="hidden sm:inline">{mode==='professional'?'Play':'Pro'}</span>
    </button>
  );
}
