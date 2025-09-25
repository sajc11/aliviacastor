export default function TopEdgeOpener(){
  let startY=0, dragging=false, t0=0;
  function down(e:any){ const y=('touches'in e)?e.touches[0].clientY:e.clientY; if (y>16) return; startY=y; dragging=true; t0=Date.now(); }
  function move(e:any){ if(!dragging) return; const y=('touches'in e)?e.touches[0].clientY:e.clientY; if (y-startY>80 && Date.now()-t0<700){ dragging=false; window.dispatchEvent(new CustomEvent('cabinet-open')); } }
  function up(){ dragging=false; }
  return <div onMouseDown={down} onMouseMove={move} onMouseUp={up} onTouchStart={down} onTouchMove={move} onTouchEnd={up} className="fixed left-0 right-0 top-0 z-[81] h-4 opacity-0" aria-hidden />;
}