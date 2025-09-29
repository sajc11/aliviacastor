import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadLibraryImage } from '../../lib/library';

export default function LibraryAdmin(){
  const [table,setTable]=useState<'books'|'dvds'>('books');
  const [title,setTitle]=useState('');
  const [author,setAuthor]=useState('');
  const [year,setYear]=useState<number|''>('');
  const [spine,setSpine]=useState<File|null>(null);
  const [cover,setCover]=useState<File|null>(null);
  const [msg,setMsg]=useState('');

  async function submit(){
    if(!title.trim()){ setMsg('Title required.'); return; }
    const { data:u } = await supabase.auth.getUser(); if(!u?.user){ setMsg('Sign in first.'); return; }

    setMsg('Creating…');
    const base:any={ user_id:u.user.id, title };
    if(table==='books') base.author = author || null;
    if(table==='dvds') base.year = year ? Number(year) : null;

    const ins = await supabase.from(table).insert(base).select('id').single();
    if(ins.error){ setMsg(ins.error.message); return; }
    const id = ins.data.id;

    async function up(kind:'spine'|'cover', file:File|null){
      if(!file) return null;
      const { path } = await uploadLibraryImage(u.user!.id, kind==='spine'?'spines':'covers', crypto.randomUUID(), file);
      const patch:any={}; patch[kind+'_url']=path; await supabase.from(table).update(patch).eq('id', id);
    }
    await up('spine',spine); await up('cover',cover);
    setMsg('Added.'); setTitle(''); setAuthor(''); setYear(''); setSpine(null); setCover(null);
  }

  return (
    <div className="space-y-3 rounded-2xl border p-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Type</label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <span className="sr-only">Content type</span>
            <select
              id="admin-type"
              aria-label="Content type"
              title="Content type"
              value={table}
              onChange={(e)=>setTable(e.target.value as any)}
              className="rounded border px-2 py-1"
            >
              <option value="books">books</option>
              <option value="dvds">dvds</option>
            </select>
        </label>
      </div>
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" className="w-full rounded border p-2"/>
      {table==='books' && <input value={author} onChange={e=>setAuthor(e.target.value)} placeholder="Author" className="w-full rounded border p-2"/>}
      {table==='dvds' && <input value={year as any} onChange={e=>setYear(e.target.value as any)} placeholder="Year" className="w-full rounded border p-2"/>}
      <div className="flex gap-3">
        <label className="flex-1 rounded border p-2 text-sm">Spine<input type="file" className="mt-1 block w-full" onChange={e=>setSpine(e.target.files?.[0]||null)} /></label>
        <label className="flex-1 rounded border p-2 text-sm">Cover<input type="file" className="mt-1 block w-full" onChange={e=>setCover(e.target.files?.[0]||null)} /></label>
      </div>
      <button onClick={submit} className="rounded bg-neutral-200 px-4 py-2 text-white">Add</button>
      <div className="text-sm">{msg}</div>
    </div>
  );
}
