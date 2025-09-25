import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useUI } from '../store/ui';
type Highlight={ entry_date:string; thumb_url:string|null };
export default function StickerCalendar(){
  const [month,setMonth]=useState(dayjs()); const [highlights,setHighlights]=useState<Record<string,Highlight[]>>({}); const ui=useUI();
  useEffect(()=>{ (async()=>{ const start=month.startOf('month').format('YYYY-MM-DD'); const end=month.endOf('month').format('YYYY-MM-DD');
    const {data}=await supabase.from('journal_entries').select('entry_date, thumb_url').gte('entry_date',start).lte('entry_date',end).eq('is_highlight',true);
    const grouped:Record<string,Highlight[]>={}; (data||[]).forEach((h:any)=>{ const k=h.entry_date; (grouped[k] ||= []).push(h); }); setHighlights(grouped); })(); },[month]);
  const start=month.startOf('month').startOf('week'); const days=Array.from({length:42},(_,i)=>start.add(i,'day'));
  return (<div>
    <div className="mb-3 flex items-center justify-between"><button onClick={()=>setMonth(m=>m.subtract(1,'month'))}>←</button>
      <div className="font-display text-xl">{month.format('MMMM YYYY')}</div><button onClick={()=>setMonth(m=>m.add(1,'month'))}>→</button></div>
    <div className="grid grid-cols-7 gap-2">{days.map(d=>{ const key=d.format('YYYY-MM-DD'); const pics=highlights[key]||[];
      return (<div key={key} className="aspect-square rounded-xl border border-slate-200 p-1 text-xs">
        <div className="mb-1 font-semibold text-slate-700">{d.date()}</div>
        <div className="flex flex-wrap gap-1">
          {ui.collageAccents && pics.slice(0,2).map((p,i)=>(<span key={i} className="relative inline-block polaroid px-stamp px-perf"><img src={p.thumb_url||''} className="h-10 w-10 object-cover"/><span className="tape"/><span className="px-ribbon">★</span></span>))}
          {!ui.collageAccents && pics.slice(0,3).map((p,i)=> p.thumb_url ? <img key={i} src={p.thumb_url} className="h-6 w-6 rounded object-cover"/> : null)}
        </div>
      </div>); })}</div>
  </div>);
}
