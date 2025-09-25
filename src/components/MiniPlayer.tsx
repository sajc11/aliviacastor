import { useEffect, useRef, useState } from 'react';
import { useUI } from '../store/ui';

const tracks=[{title:'intro loop', src:'/music/intro.wav'}];

export default function MiniPlayer(){
  const [i,setI]=useState(0); const [play,setPlay]=useState(false); const [t,setT]=useState({cur:0,dur:0});
  const aRef=useRef<HTMLAudioElement|null>(null); const cvRef=useRef<HTMLCanvasElement|null>(null); const raf=useRef<number>(); const anRef=useRef<AnalyserNode>();
  const ui=useUI();

  useEffect(()=>{
    const a=aRef.current!; const onTime=()=>setT({cur:a.currentTime,dur:a.duration||0}); const onEnd=()=>next();
    a.addEventListener('timeupdate', onTime); a.addEventListener('ended', onEnd);
    return ()=>{ a.removeEventListener('timeupdate', onTime); a.removeEventListener('ended', onEnd); };
  },[i]);

  useEffect(()=>{
    if(!ui.visualizer) return;
    const a=aRef.current!; const Actx=(window as any).AudioContext || (window as any).webkitAudioContext; const ctx=new Actx();
    const src=ctx.createMediaElementSource(a); const an=ctx.createAnalyser(); an.fftSize=256; src.connect(an); an.connect(ctx.destination); anRef.current=an;
    const cv=cvRef.current!; const g=cv.getContext('2d')!; const data=new Uint8Array(an.frequencyBinCount);
    const draw=()=>{ an.getByteFrequencyData(data); const w=cv.width,h=cv.height; const cx=w/2,cy=h/2,R=Math.min(w,h)/2-4; g.clearRect(0,0,w,h);
      g.strokeStyle='#fbbf24'; g.lineWidth=2; g.beginPath();
      for(let k=0;k<data.length;k++){ const ang=(k/data.length)*Math.PI*2; const m=data[k]/255; const r1=R*0.6, r2=r1+m*R*0.35;
        g.moveTo(cx+r1*Math.cos(ang), cy+r1*Math.sin(ang)); g.lineTo(cx+r2*Math.cos(ang), cy+r2*Math.sin(ang)); }
      g.stroke(); raf.current=requestAnimationFrame(draw); };
    raf.current=requestAnimationFrame(draw);
    return ()=>{ if(raf.current) cancelAnimationFrame(raf.current); ctx.close(); };
  },[i, ui.visualizer]);

  function toggle(){ const a=aRef.current!; if(play){ a.pause(); setPlay(false);} else { a.play(); setPlay(true);} }
  function next(){ setI((i+1)%tracks.length); setTimeout(()=>{ if(play) aRef.current!.play(); },0); }
  function prev(){ setI((i-1+tracks.length)%tracks.length); setTimeout(()=>{ if(play) aRef.current!.play(); },0); }

  return (
    <div className="rounded-xl border border-black/40 bg-white/80 px-3 py-2 text-xs shadow">
      <audio ref={aRef} src={tracks[i].src} preload="auto" />
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold">{tracks[i].title}</div>
        <div className="flex items-center gap-1">
          <button onClick={prev} className="rounded px-2 py-1 hover:bg-slate-200">⏮</button>
          <button onClick={toggle} className="rounded px-2 py-1 hover:bg-slate-200">{play?'⏸':'▶'}</button>
          <button onClick={next} className="rounded px-2 py-1 hover:bg-slate-200">⏭</button>
        </div>
      </div>
      {ui.visualizer && <canvas ref={cvRef} width={320} height={80} className="mt-2 w-full rounded bg-slate-900" />}
    </div>
  );
}