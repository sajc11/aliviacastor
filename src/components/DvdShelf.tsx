import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isStoragePath, signFromLibrary, uploadLibraryImage } from '../lib/library';
type DVD={ id:string; title:string; year:number|null; spine_url:string|null; cover_url:string|null; rating:number|null; review:string|null; favorite:boolean };

export default function DvdShelf(){
  const [dvds,setDvds]=useState<DVD[]>([]);
  const [active,setActive]=useState<DVD|null>(null);
  const [msg,setMsg]=useState('');

  useEffect(()=>{ supabase.from('dvds').select('*').order('favorite',{ascending:false}).then(({data})=>setDvds(data||[])); },[]);

  useEffect(()=>{
    (async()=>{
      if (!dvds.length) return;
      const upd:any[]=[];
      for(const b of dvds){
        const o:any={...b};
        if(isStoragePath(o.spine_url)) o.spine_url=await signFromLibrary(o.spine_url);
        if(isStoragePath(o.cover_url)) o.cover_url=await signFromLibrary(o.cover_url);
        upd.push(o);
      }
      setDvds(upd as any);
    })();
  },[dvds.length]);

  async function onUpload(kind:'spine'|'cover', file:File){
    if(!active) return;
    const { data:u } = await supabase.auth.getUser();
    if(!u?.user){ setMsg('Sign in first (Supabase auth).'); return; }
    setMsg('Uploading…');
    try{
      const { path, signedUrl } = await uploadLibraryImage(u.user.id, kind==='spine'?'spines':'covers', crypto.randomUUID(), file);
      const patch:any = {}; patch[kind+'_url'] = path;
      const { error } = await supabase.from('dvds').update(patch).eq('id', active.id);
      if(error) throw error;
      setDvds(list => list.map(b => b.id===active.id ? ({ ...b, [kind+'_url']: signedUrl }) as any : b));
      setActive(a => a ? ({ ...a, [kind+'_url']: signedUrl }) as any : a);
      setMsg('Uploaded.');
    }catch(e:any){ setMsg(e.message || 'Upload failed'); }
    setTimeout(()=>setMsg(''), 1500);
  }

  return (<>
    <div className="relative overflow-x-auto whitespace-nowrap rounded-2xl border bg-white p-6 dark:bg-slate-900">
      {dvds.map(b=>(
        <button key={b.id} onClick={()=>setActive(b)} className="mr-4 inline-block align-bottom">
          <div className="relative">
            <div className="relative h-60 w-8 rounded-sm shadow-lg ring-1 ring-black/10 transition hover:-translate-y-1 hover:rotate-[-2deg] bg-white">
              {b.spine_url
                ? <img src={b.spine_url} className="h-full w-full object-cover"/>
                : <div className="flex h-full w-full items-center justify-center bg-slate-200 p-1 text-[10px] text-center">{b.title}</div>}
            </div>
            <span className="px-ribbon">{(b.title||'').slice(0,10)}</span>
          </div>
          {b.favorite && <div className="mt-3 text-center text-[11px]">★</div>}
        </button>
      ))}
    </div>

    {active && (
      <div className="fixed inset-0 z-[90] grid place-items-center bg-black/50 p-4" onClick={()=>setActive(null)}>
        <div className="max-w-xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900" onClick={e=>e.stopPropagation()}>
          <div className="flex gap-4">
            {active.cover_url && <img src={active.cover_url} className="px-thumb h-40 w-28 rounded object-cover bg-white"/>}
            <div className="min-w-0">
              <h3 className="font-display text-xl dark:text-white">{active.title}</h3>
              {active.year && <p className="text-sm text-slate-500">{active.year}</p>}
              <p className="mt-2 text-yellow-600">{'★'.repeat(active.rating||0)}</p>
              {active.review && <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{active.review}</p>}
            </div>
          </div>

          <div className="mt-4 grid gap-3 rounded-2xl border p-3 text-sm">
            <div className="font-semibold">Upload images</div>
            <label className="flex items-center gap-2">
              <span className="w-20">Spine</span>
              <input type="file" accept="image/*" onChange={e=>e.target.files&&onUpload('spine', e.target.files[0])} />
            </label>
            <label className="flex items-center gap-2">
              <span className="w-20">Cover</span>
              <input type="file" accept="image/*" onChange={e=>e.target.files&&onUpload('cover', e.target.files[0])} />
            </label>
            {msg && <div className="text-xs text-slate-600">{msg}</div>}
          </div>

          <div className="mt-4 text-right">
            <button onClick={()=>setActive(null)} className="rounded bg-slate-900 px-3 py-1 text-white dark:bg-white dark:text-slate-900">Close</button>
          </div>
        </div>
      </div>
    )}
  </>);
}
