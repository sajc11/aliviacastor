import { useEffect, useMemo, useState } from 'react';

export default function FileIndexNav({ query='' }: { query?: string }){
  type Item = { id:number; label:string; route:string; letter:string };
  const PRO: [string,string][] = [
    ['Home','/'], ['Academic','/academic'], ['Industry','/industry'], ['Research','/research'],
    ['Publications','/publications'], ['CV','/cv'], ['About','/about']
  ];
const PLAY: [string,string][] = [
  ['Creative Home','/creative'],
  ['Curation','/curation'],          // ← add this line
  ['Journal','/journal'],
  ['Calendar','/calendar'],
  ['Library','/library'],
  ['DVDs','/dvds'],
  ['Guestboard','/message-board'],
  ['Playground','/playground'],
  ['Photo Sphere','/sphere'],
  ['Rotating Gallery','/gallery'],
  ['Stack Deck','/stack'],
];

  const [mode,setMode]=useState<'professional'|'personal'>(typeof document!=='undefined' ? (document.body.dataset.mode as any || 'professional') : 'professional');
  useEffect(()=>{ const h=(e:any)=>setMode(e.detail); window.addEventListener('modechange',h as any); return ()=>window.removeEventListener('modechange',h as any); },[]);

  const DATA = useMemo(()=>{
    const src = mode==='personal' ? PLAY : PRO;
    const base = mode==='personal' ? 300 : 100;
    return src.map(([label,route],i)=>({ id:base+i, label, route, letter:(label[0]||'').toUpperCase() }))
      .filter(it=> it.label.toLowerCase().includes(query.toLowerCase()));
  },[mode,query]);
  const INDEX = useMemo(()=> Array.from(new Set(DATA.map(d=>d.letter))).sort(),[DATA]);
  const grouped = useMemo(()=>{ const m:Record<string,Item[]>={}; DATA.forEach(i=>{ (m[i.letter] ||= []).push(i); }); Object.keys(m).forEach(k=>m[k].sort((a,b)=>a.id-b.id)); return m; },[DATA]);

  const [hover,setHover]=useState<Item|null>(null);
  const [pos,setPos]=useState<{x:number,y:number}>({x:0,y:0});

  return (
    <div className="mx-auto max-w-5xl text-[#0B0B0B]">
      <div className="relative rounded-[14px] border-2 border-black/70 bg-[#EDEDED] p-3 shadow-[0_8px_0_#000]">
        <div className="relative h-[520px] overflow-auto rounded-[12px] bg-[#F3F3F3] p-3">
          <div className="grid h-max grid-cols-2 gap-2 sm:grid-cols-3">
            {INDEX.map((letter)=> (
              <div key={letter} className="space-y-1">
                {(grouped[letter]||[]).map((it)=> (
                  <button key={it.id}
                          onMouseEnter={(e)=>{ setHover(it); const r=(e.target as HTMLElement).getBoundingClientRect(); setPos({x:r.left+window.scrollX, y:r.bottom+window.scrollY}); }}
                          onMouseLeave={()=>setHover(null)}
                          onClick={()=>{ window.location.href = it.route; }}
                          className="file-tab group flex w-full items-center rounded-[10px] border-2 border-black bg-white px-2 py-[6px] text-left hover:bg-black hover:text-white">
                    <span className="pixel-font mr-2 rounded bg-black px-2 py-[2px] text-[10px] font-bold uppercase tracking-[0.18em] text-white group-hover:bg-white group-hover:text-black">{letter}</span>
                    <span className="pixel-num mr-2 opacity-70">{String(it.id).padStart(3,'0')}</span>
                    <span className="line-clamp-1 flex-1 pixel-font">{it.label}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>

          {hover && (
            <div className="pointer-events-none fixed z-[100] w-[min(560px,94vw)] rounded-[14px] border-2 border-black bg-white shadow-[0_10px_0_#000] crt-brackets glaze-animate"
                 style={{ left: pos.x+16, top: pos.y+8 }}>
              <div className="bevel-top"><div className="dots"><span className="dot"></span><span className="dot"></span><span className="dot"></span></div></div>
              <div className="p-4">
                <div className="mini-tab"><span className="pixel-num mr-2">{String(hover.id).padStart(3,'0')}</span><span className="text-[11px]">{hover.label}</span></div>
                <div className="mt-2 h-[220px] w-full overflow-hidden rounded bg-[#f9f9f9]">
                  <iframe title={`Preview ${hover.label}`} src={hover.route} className="h-full w-full" />
                </div>
              </div>
              <span className="crt-btm-l"></span><span className="crt-btm-r"></span>
            </div>
          )}
        </div>
        <div className="mt-2 grid place-items-center">
          <div className="rounded-full bg-[#FFD84A] px-4 py-1 text-[11px] font-semibold uppercase tracking-widest text-black shadow-[0_2px_0_#000]">
            Alivia’s Subpages
          </div>
        </div>
      </div>
      <style>{`
        .file-tab { clip-path: polygon(0% 0%, 88% 0%, 92% 16%, 100% 24%, 100% 100%, 0% 100%); }
        .mini-tab { display:inline-flex; align-items:center; gap:.25rem; border:2px solid #0B0B0B; border-bottom-width:0;
                    background:#EDEDED; padding:.25rem .5rem; border-radius:10px 10px 0 0; box-shadow:0 4px 0 #000 inset; }
      `}</style>
    </div>
  );
}
