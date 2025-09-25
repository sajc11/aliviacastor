import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { listStickers, uploadSticker } from '../lib/stickers';

export default function StickerPalette({ onPick }:{ onPick:(url:string)=>void }){
  const [urls,setUrls]=useState<string[]>([]); const [status,setStatus]=useState('');
  useEffect(()=>{ (async()=>{ const {data:u}=await supabase.auth.getUser(); if(!u.user) return; const items=await listStickers(u.user.id); setUrls(items.map(i=>i.url)); })(); },[]);
  async function onFile(files:FileList|null){ if(!files?.length) return; const {data:u}=await supabase.auth.getUser(); if(!u.user) return;
    setStatus('Uploading...'); const out:string[]=[]; for (const f of Array.from(files)){ const up=await uploadSticker(f,u.user.id); out.push(up.url); }
    setUrls(p=>[...out,...p]); setStatus(''); }
  return (
    <div className="rounded-2xl border p-3">
      <div className="mb-2 flex items-center justify-between"><div className="font-semibold">Stickers</div>
        <label className="cursor-pointer rounded border px-2 py-1 text-xs">Import<input type="file" accept="image/*" multiple className="hidden" onChange={e=>onFile(e.target.files)} /></label>
      </div>
      <div className="grid max-h-44 grid-cols-5 gap-2 overflow-auto">
        {urls.map((u,i)=>(<button key={i} onClick={()=>onPick(u)} draggable onDragStart={e=>e.dataTransfer?.setData('text/uri-list',u)} className="rounded border bg-white p-1 hover:ring-2 ring-amber-400">
          <img src={u} className="h-12 w-full object-contain"/></button>))}
      </div>
      {status && <div className="mt-2 text-xs text-slate-500">{status}</div>}
    </div>
  );
}