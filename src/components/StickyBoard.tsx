import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
type Note={ id:string; author:string|null; body:string; color:string; x:number; y:number; z:number };
const COLORS=['yellow','pink','mint','blue','lilac'];
export default function StickyBoard(){
  const [notes,setNotes]=useState<Note[]>([]); const [body,setBody]=useState('');
  useEffect(()=>{ supabase.from('board_notes').select('*').order('created_at',{ascending:false}).then(({data})=>setNotes(data as any||[]));
    const ch=supabase.channel('notes').on('postgres_changes',{event:'*',schema:'public',table:'board_notes'},p=>{ if(p.eventType==='INSERT') setNotes(n=>[p.new as any,...n]); }).subscribe();
    return ()=>{ supabase.removeChannel(ch); }; },[]);
  async function post(){ if(!body.trim()) return; const color=COLORS[Math.floor(Math.random()*COLORS.length)]; await supabase.from('board_notes').insert({author:null,body,color,x:12+Math.random()*360,y:12+Math.random()*120}); setBody(''); }
  return (<div className="grid gap-4 md:grid-cols-[1fr,360px]">
    <div className="relative min-h-[420px] rounded-2xl border p-4">{notes.map(n=>(
      <div key={n.id} style={{left:n.x, top:n.y, zIndex:n.z}} className={`absolute w-48 rotate-[-1.5deg] rounded-lg p-3 shadow ${n.color==='yellow'?'bg-yellow-200':n.color==='pink'?'bg-pink-200':n.color==='mint'?'bg-emerald-200':n.color==='blue'?'bg-sky-200':'bg-violet-200'}`}>
        <div className="text-[11px] leading-snug">{n.body}</div>
      </div>))}</div>
    <aside className="rounded-2xl border p-4"><h3 className="font-semibold">Leave a note</h3>
      <textarea value={body} onChange={e=>setBody(e.target.value)} rows={5} className="mt-2 w-full rounded-md border p-2"/><button onClick={post} className="mt-2 w-full rounded-md bg-slate-900 px-4 py-2 text-white">Post</button></aside>
  </div>);
}