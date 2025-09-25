import { useEffect, useRef, useState } from 'react';

type NodeT={ id:string; x:number; y:number; vx:number; vy:number; label:string; href:string; };
type EdgeT={ a:number; b:number };

const LINKS:[string,string][]= [
  ['Journal','/journal'],['Calendar','/calendar'],['Library','/library'],['DVDs','/dvds'],['Guestboard','/message-board'],
  ['Creative Home','/creative'],['Photo Sphere','/sphere'],['Rotating Gallery','/gallery'],['Stack Deck','/stack'],
  ['Pro Home','/'],['Academic','/academic'],['Industry','/industry'],['Research','/research'],['Publications','/publications'],['CV','/cv'],['About','/about']
];

export default function WebLanding(){
  const ref=useRef<HTMLCanvasElement|null>(null);
  const [nodes,setNodes]=useState<NodeT[]>([]);
  const [edges,setEdges]=useState<EdgeT[]>([]);

  // internal refs to avoid reattaching listeners on state updates
  const nodesRef=useRef<NodeT[]>([]);
  const edgesRef=useRef<EdgeT[]>([]);
  const hoverRef=useRef<number|null>(null);
  const dragNodeRef=useRef<number|null>(null);
  const dragEdgeRef=useRef<EdgeT|null>(null);
  const raf=useRef<number>(); const downPos=useRef<{x:number,y:number}|null>(null); const downNode=useRef<number|null>(null);

  // init nodes + edges
  useEffect(()=>{
    const W=800,H=480;
    const ns=LINKS.map((p,i)=>({ id:String(i), x:120+Math.random()*(W-240), y:100+Math.random()*(H-200), vx:0, vy:0, label:p[0], href:p[1]}));
    const es:EdgeT[]=[];
    for(let i=0;i<ns.length;i++){
      const a=ns[i];
      const near=ns.map((b,j)=>({j, d:(a.x-b.x)**2+(a.y-b.y)**2})).sort((u,v)=>u.d-v.d).slice(1,3);
      near.forEach(({j})=>{ if(!es.find(e=>(e.a===i&&e.b===j)||(e.a===j&&e.b===i))) es.push({a:i,b:j}); });
    }
    setNodes(ns); setEdges(es);
    nodesRef.current=ns; edgesRef.current=es;
  },[]);

  // draw loop + resize
  useEffect(()=>{
    const c=ref.current!; if(!c) return; const ctx=c.getContext('2d')!;
    function fit(){
      const r=c.getBoundingClientRect(); const dpr=Math.min(2,window.devicePixelRatio||1);
      c.width = Math.max(1, r.width  * dpr);
      c.height= Math.max(1, r.height * dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    fit(); const ro=new ResizeObserver(fit); ro.observe(c);

    let last=performance.now();
    const spring=.015, friction=.9;

    const step=(now:number)=>{
      const dt=Math.min(32, now-last); last=now;
      const r=c.getBoundingClientRect(), W=r.width, H=r.height;
      // clear
      ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H);

      // integrate
      const arr=nodesRef.current;
      for(let i=0;i<arr.length;i++){
        const n=arr[i];
        n.vx += (W*0.5 - n.x)*spring*0.0006*dt;
        n.vy += (H*0.5 - n.y)*spring*0.0006*dt;
        n.x += n.vx; n.y += n.vy;
        n.vx *= friction; n.vy *= friction;
      }

      const es=edgesRef.current;
      const prefs=JSON.parse(localStorage.getItem('ui::prefs')||'{}');
      const glow = prefs.webGlow !== false;
      ctx.strokeStyle='rgba(255,255,255,0.75)'; ctx.lineWidth=1.2;
      if (glow){ ctx.save(); ctx.shadowColor='rgba(255,255,255,.6)'; ctx.shadowBlur=8; }
      // edges + handle
      es.forEach(({a,b}, idx)=>{
        const A=arr[a], B=arr[b];
        ctx.beginPath(); ctx.moveTo(A.x,A.y); ctx.lineTo(B.x,B.y); ctx.stroke();
        // midpoint handle as diamond
        const mx=(A.x+B.x)/2, my=(A.y+B.y)/2;
        ctx.save(); ctx.translate(mx,my); ctx.rotate(Math.PI/4);
        ctx.fillStyle = (hoverRef.current===-(idx+1)) ? '#0ff' : '#fff';
        ctx.fillRect(-4,-4,8,8); ctx.restore();
      });
      if (glow) ctx.restore();

      // nodes
      arr.forEach((n, i)=>{
        ctx.beginPath(); ctx.arc(n.x,n.y,4,0,Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
        if (hoverRef.current===i){
          // label
          const pad=6; const tw=ctx.measureText(n.label).width + pad*2; const th=18;
          ctx.fillStyle='#fff'; ctx.fillRect(n.x+8, n.y- th/2, tw, th);
          ctx.strokeStyle='#000'; ctx.lineWidth=2; ctx.strokeRect(n.x+8, n.y- th/2, tw, th);
          ctx.fillStyle='#000'; ctx.fillText(n.label, n.x+8+pad, n.y+4);
        }
      });

      raf.current=requestAnimationFrame(step);
    };
    raf.current=requestAnimationFrame(step);
    return ()=>{ if(raf.current) cancelAnimationFrame(raf.current); ro.disconnect(); };
  },[]);

  // pointer handlers (attach once; rely on refs)
  useEffect(()=>{
    const c=ref.current!; if(!c) return;
    const getXY=(e:any)=>{ const r=c.getBoundingClientRect(); return { x:('touches'in e?e.touches[0].clientX:e.clientX)-r.left, y:('touches'in e?e.touches[0].clientY:e.clientY)-r.top }; };

    const move=(e:any)=>{
      const {x,y}=getXY(e);
      // update hover: check handles then nodes
      const es=edgesRef.current, ns=nodesRef.current;
      let hover:number|null=null;
      let bd=1e9, hi=-1;
      es.forEach((ed,idx)=>{ const A=ns[ed.a], B=ns[ed.b]; const mx=(A.x+B.x)/2, my=(A.y+B.y)/2; const d=(mx-x)**2+(my-y)**2; if(d<bd){ bd=d; hi=idx; }});
      if (bd < 18*18) hover = -(hi+1);
      else {
        let bi=-1, bd2=1e9;
        ns.forEach((n,i)=>{ const d=(n.x-x)**2+(n.y-y)**2; if(d<bd2){bd2=d; bi=i;} });
        if (bd2 < 16*16) hover = bi;
      }
      hoverRef.current = hover;

      if (dragEdgeRef.current){
        const ed=dragEdgeRef.current, ns2=nodesRef.current; const A=ns2[ed.a], B=ns2[ed.b];
        const mx=(A.x+B.x)/2, my=(A.y+B.y)/2; const dx=x-mx, dy=y-my;
        A.x += dx*0.5; A.y += dy*0.5; B.x += dx*0.5; B.y += dy*0.5;
      } else if (dragNodeRef.current!==null){
        const i=dragNodeRef.current; const n=nodesRef.current[i]; n.x=x; n.y=y;
      }
    };

    const down=(e:any)=>{
      const {x,y}=getXY(e);
      const h=hoverRef.current;
      if (h!==null && h<0){ dragEdgeRef.current = edgesRef.current[-(h+1)]; }
      else if (h!==null && h>=0){ dragNodeRef.current = h; }
    };
    const up=()=>{ const dn=downNode.current; const p=downPos.current; downPos.current=null; if(dn!==null){ dragNodeRef.current=null; dragEdgeRef.current=null; const n=nodesRef.current[dn]; const dx=Math.abs((n.x)-(p!.x)), dy=Math.abs((n.y)-(p!.y)); if(dx<4 && dy<4){ window.location.href = n.href; } } dragNodeRef.current=null; dragEdgeRef.current=null; };

    c.addEventListener('mousemove',move); c.addEventListener('mousedown',down);
    window.addEventListener('mouseup',up);
    c.addEventListener('touchmove',move,{passive:false}); c.addEventListener('touchstart',down,{passive:false});
    window.addEventListener('touchend',up);

    return ()=>{
      c.removeEventListener('mousemove',move); c.removeEventListener('mousedown',down);
      window.removeEventListener('mouseup',up);
      c.removeEventListener('touchmove',move); c.removeEventListener('touchstart',down);
      window.removeEventListener('touchend',up);
    };
  },[]);

  // keep React state in sync (low frequency) for accessibility/links
  useEffect(()=>{ nodesRef.current = nodes; },[nodes]);
  useEffect(()=>{ edgesRef.current = edges; },[edges]);

  return (
    <div className="relative rounded-3xl border-2 border-slate-700/60 bg-black shadow-2xl">
      <canvas ref={ref} className="h-[68vh] min-h-[420px] w-full rounded-3xl"/>
    </div>
  );
}
