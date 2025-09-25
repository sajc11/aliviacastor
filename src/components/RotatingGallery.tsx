import { useEffect, useState } from 'react';
import { listPhotos } from '../lib/photos';

export default function RotatingGallery(){
  const [imgs,setImgs]=useState<string[]>([]);
  useEffect(()=>{ (async()=>{ const urls=await listPhotos(); setImgs(urls.length?urls:Array.from({length:50},()=>'/og-cover.png')); })(); },[]);
  return (
    <div className="relative mx-auto h-[70vh] overflow-hidden rounded-3xl border bg-[#F6F6F6]">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 [transform-style:preserve-3d] h-[520px] w-[520px]">
        <div className="absolute inset-0 ring-rail">
          {imgs.slice(0,50).map((src,i)=>(
            <img key={i} src={src} className="px-thumb absolute h-24 w-16 rounded object-cover bg-white"
                 style={{ transform:`rotate(${(360/50)*i}deg) translateY(-240px) rotate(${-(360/50)*i}deg)` }} />
          ))}
        </div>
        <div className="pointer-events-none absolute inset-0 grid place-items-center px-12 text-center text-sm leading-relaxed text-[#0B0B0B]"></div>
      </div>
    </div>
  );
}
