export default function StripDeck({ images }:{images:string[]}){
  const decks=[images.slice(0,20), images.slice(20,40), images.slice(40,60)];
  return (
    <div className="relative grid gap-10 rounded-3xl border bg-[#222] p-6 text-white">
      {decks.map((deck,i)=>(
        <div key={i} className="relative h-[240px] [transform-style:preserve-3d]">
          {deck.map((src,k)=>(
            <img key={k} src={src} className="px-thumb absolute h-28 w-40 object-cover bg-white"
                 style={{ transform:`translate3d(${k*16}px, ${Math.max(0, 100-k*2)}px, ${k*8}px) rotateY(-18deg)` }} />
          ))}
        </div>
      ))}
    </div>
  );
}
