import { useEffect } from 'react';
export default function CursorSparkles(){
  useEffect(()=>{
    if (!document.body.classList.contains('sparkle-on')) return;
    const root = document.createElement('div');
    root.style.position='fixed'; root.style.inset='0'; root.style.pointerEvents='none'; root.style.zIndex='9999';
    document.body.appendChild(root);
    const handler = (e: MouseEvent) => {
      const s = document.createElement('span');
      s.className='sparkle';
      s.style.left = e.clientX+'px'; s.style.top = e.clientY+'px';
      root.appendChild(s);
      setTimeout(()=>s.remove(), 900);
    };
    window.addEventListener('mousemove', handler);
    return ()=>{ window.removeEventListener('mousemove', handler); root.remove(); };
  },[]);
  return null;
}
