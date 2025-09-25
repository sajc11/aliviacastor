import { create } from 'zustand';
type UIState = {
  crt:boolean; visualizer:boolean; cabinetPeek:boolean; drawerAnim:boolean; viewTransitions:boolean; webGlow:boolean;
  gridSnapDefault:boolean; lassoDefault:boolean; cabinetDensity:'compact'|'cozy'; ringSpeed:'slow'|'medium'|'fast'; collageAccents:boolean; y2kTheme:boolean; cursorSparkle:boolean; monoCabinet:boolean;
  set:(patch:Partial<Omit<UIState,'set'>>)=>void;
};
const KEY='ui::prefs';
function load(){ try{ const s=localStorage.getItem(KEY); return s? JSON.parse(s): {}; }catch{ return {}; } }
export const useUI = create<UIState>((set,get)=>({
  crt:false, visualizer:true, cabinetPeek:false, drawerAnim:true, viewTransitions:true, webGlow:true,
  gridSnapDefault:true, lassoDefault:false, cabinetDensity:'cozy', ringSpeed:'medium', collageAccents:true, y2kTheme:true, cursorSparkle:true, monoCabinet:true,
  set:(patch)=>{
    const next={...get(),...patch}; set(patch);
    try{ localStorage.setItem(KEY, JSON.stringify({
      crt:next.crt,visualizer:next.visualizer,cabinetPeek:next.cabinetPeek,drawerAnim:next.drawerAnim,
      viewTransitions:next.viewTransitions,webGlow:next.webGlow,gridSnapDefault:next.gridSnapDefault,lassoDefault:next.lassoDefault,
      cabinetDensity:next.cabinetDensity, ringSpeed:next.ringSpeed, collageAccents:next.collageAccents, y2kTheme:next.y2kTheme, cursorSparkle:next.cursorSparkle, monoCabinet:next.monoCabinet
    })); }catch{}
    const b=document.body;
    next.crt? b.classList.add('crt-on') : b.classList.remove('crt-on');
    next.drawerAnim? b.classList.remove('no-drawer-anim') : b.classList.add('no-drawer-anim');
    b.dataset.density = next.cabinetDensity;
    document.documentElement.dataset.ring = next.ringSpeed;
    const speed = next.ringSpeed==='slow'?'48s': next.ringSpeed==='fast'?'22s':'36s';
    document.documentElement.style.setProperty('--rail-speed', speed);
    b.dataset.collage = next.collageAccents? 'on':'off';
    next.y2kTheme? b.classList.add('y2k') : b.classList.remove('y2k');
    next.cursorSparkle? b.classList.add('sparkle-on') : b.classList.remove('sparkle-on');
    b.dataset.cabinet = next.monoCabinet? 'mono':'color';
  }
}));
export function hydrateUI(){ const prefs=load(); const {set}=useUI.getState(); set(prefs); }
