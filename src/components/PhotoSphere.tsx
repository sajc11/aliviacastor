import { useEffect, useState } from 'react';
import { listPhotos } from '../lib/photos';

export default function PhotoSphere(){
  const [imgs,setImgs]=useState<string[]>([]);
  useEffect(()=>{ (async()=>{ const urls=await listPhotos(); setImgs(urls.length?urls:Array.from({length:32},()=>'/og-cover.png')); })(); },[]);
  const rings=6, perRing=10, radius=220; const items=imgs.slice(0,rings*perRing);
  return (
    <div className="relative mx-auto grid h-[60vh] place-items-center overflow-hidden rounded-3xl border bg-slate-900">
      <div className="relative h-[520px] w-[520px] [transform-style:preserve-3d] animate-[spin_40s_linear_infinite]">
        {Array.from({length:rings}).map((_,r)=>{
          const phi=Math.PI*(r/(rings-1)-0.5); const y=radius*Math.sin(phi); const rr=Math.cos(phi)*radius;
          return Array.from({length:perRing}).map((__,c)=>{
            const idx=r*perRing+c, theta=2*Math.PI*c/perRing, x=rr*Math.cos(theta), z=rr*Math.sin(theta);
            return <img key={idx} src={items[idx%items.length]} className="absolute h-24 w-16 rounded object-cover shadow ring-1 ring-black/20"
              style={{ transform:`translate3d(${260+x}px, ${260-y}px, ${z}px) rotateY(${(theta+Math.PI/2)*180/Math.PI}deg)` }} />;
          });
        })}
      </div>
      <style>{`@keyframes spin{from{transform:rotateX(-12deg) rotateY(0)}to{transform:rotateX(-12deg) rotateY(360deg)}}`}</style>
    </div>
  );
}