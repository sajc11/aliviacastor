import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export default function FileIndexNav({ query = '' }: { query?: string }) {
  type Item = { id: number; label: string; route: string; letter: string };

  const PRO: [string, string][] = [
    ['Home', '/'],
    ['Academic', '/academic'],
    ['Industry', '/industry'],
    ['Research', '/research'],
    ['Publications', '/publications'],
    ['CV', '/cv'],
    ['About', '/about'],
  ];
  const PLAY: [string, string][] = [
    ['Creative Home', '/creative'],
    ['Journal', '/journal'],
    ['Calendar', '/calendar'],
    ['Library', '/library'],
    ['DVDs', '/dvds'],
    ['Guestboard', '/message-board'],
    ['Playground', '/playground'],
    ['Photo Sphere', '/sphere'],
    ['Rotating Gallery', '/gallery'],
    ['Stack Deck', '/stack'],
  ];

  const [mode, setMode] = useState<'professional' | 'personal'>(
    typeof document !== 'undefined'
      ? ((document.body.dataset.mode as any) || 'professional')
      : 'professional'
  );
  useEffect(() => {
    const h = (e: any) => setMode(e.detail);
    window.addEventListener('modechange', h as any);
    return () => window.removeEventListener('modechange', h as any);
  }, []);

  const DATA = useMemo(() => {
    const src = mode === 'personal' ? PLAY : PRO;
    const base = mode === 'personal' ? 300 : 100;
    return src
      .map(([label, route], i) => ({
        id: base + i, label, route, letter: (label[0] || '').toUpperCase(),
      }))
      .filter((it) => it.label.toLowerCase().includes(query.toLowerCase()));
  }, [mode, query]);

  const INDEX = useMemo(
    () => Array.from(new Set(DATA.map((d) => d.letter))).sort(),
    [DATA]
  );
  const grouped = useMemo(() => {
    const m: Record<string, Item[]> = {};
    DATA.forEach((i) => (m[i.letter] ||= []).push(i));
    Object.keys(m).forEach((k) => m[k].sort((a, b) => a.id - b.id));
    return m;
  }, [DATA]);

  /** ---------- Anchored inline preview ---------- */
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<Item | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [panelRect, setPanelRect] = useState({ left: 0, top: 0, width: 0, height: 0 });

  // Constant, clamped preview footprint
  const PREVIEW_MAX_W = 540;
  const PREVIEW_MIN_W = 380;
  const PREVIEW_H_DEFAULT = 360;
  const PAD = 12;
  const SAFE_BOTTOM = 84; // leave room for the badge/shadow near the bottom

  function calcPanelRect(el: HTMLElement) {
    const sc = scrollerRef.current!;
    const sr = sc.getBoundingClientRect();
    const ar = el.getBoundingClientRect();

    const width = Math.min(PREVIEW_MAX_W, Math.max(PREVIEW_MIN_W, sr.width - PAD * 2));
    const height = Math.min(PREVIEW_H_DEFAULT, sr.height - PAD * 2);

    // Center horizontally in the visible cabinet area
    let left = sc.scrollLeft + Math.round((sr.width - width) / 2);
    left = Math.max(sc.scrollLeft + PAD, Math.min(left, sc.scrollLeft + sr.width - width - PAD));

    // Distances within the cabinet viewport
    const tabTopInView    = ar.top - sr.top;
    const tabBottomInView = ar.bottom - sr.top;

    const roomBelow = sr.height - tabBottomInView - SAFE_BOTTOM;
    const roomAbove = tabTopInView - PAD;

    // Decide vertical placement
    let top: number;
    if (roomBelow >= height) {
      // open below
      top = sc.scrollTop + tabBottomInView + 10;
    } else if (roomAbove >= height) {
      // open above
      top = sc.scrollTop + tabTopInView - height - 10;
    } else {
      // not enough space either side → center vertically
      top = sc.scrollTop + Math.max(PAD, Math.round((sr.height - height) / 2));
    }

    // Final clamp so the panel stays fully inside the cabinet
    const minTop = sc.scrollTop + PAD;
    const maxTop = sc.scrollTop + sr.height - height - PAD - Math.max(0, SAFE_BOTTOM - 16);
    top = Math.min(Math.max(top, minTop), maxTop);

    return { left, top, width, height };
  }

  function showPreview(item: Item, el: HTMLElement) {
    setHover(item);
    setAnchorEl(el);
    const sc = scrollerRef.current;
    if (sc) setPanelRect(calcPanelRect(el));
  }

  // Keep aligned on scroll/resize
  useEffect(() => {
    const sc = scrollerRef.current;
    const onMove = () => { if (anchorEl) setPanelRect(calcPanelRect(anchorEl)); };
    window.addEventListener('resize', onMove);
    sc?.addEventListener('scroll', onMove, { passive: true });
    return () => {
      window.removeEventListener('resize', onMove);
      sc?.removeEventListener('scroll', onMove as any);
    };
  }, [anchorEl]);

  return (
    <div className="h-full w-full text-[#0B0B0B]" data-no-notches>
      <div className="relative flex h-full w-full flex-col rounded-[12px]">
        {/* SCROLLER (relative => preview anchors inside) */}
        <div ref={scrollerRef} className="relative flex-1 min-h-0 overflow-auto p-3">
          <div className="grid h-max grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {INDEX.map((letter) => (
              <div key={letter} className="space-y-1">
                {(grouped[letter] || []).map((it) => (
                  <button
                    key={it.id}
                    aria-label={`Go to ${it.label}`}
                    onMouseEnter={(e) => showPreview(it, e.currentTarget as HTMLElement)}
                    onFocus={(e) => showPreview(it, e.currentTarget as HTMLElement)}
                    onMouseLeave={() => { setHover(null); setAnchorEl(null); }}
                    onBlur={() => { setHover(null); setAnchorEl(null); }}
                    onClick={() => { window.location.href = it.route; }}
                    className="
                      file-tab group relative isolate w-full overflow-visible
                      flex items-center rounded-[10px] border-2 border-black bg-white
                      px-2 py-[6px] text-left shadow-[0_3px_0_#000]
                      transition hover:-translate-y-[1px] focus:-translate-y-[1px]
                      hover:brightness-95
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black
                    "
                  >
                    <span className="relative z-20 mr-2 inline-flex items-center gap-2 rounded bg-black px-2 py-[2px] text-[10px] font-bold uppercase tracking-[0.18em] text-white group-hover:bg-white group-hover:text-black">
                      {letter}
                      <span className="pixel-num opacity-70">{String(it.id).padStart(3, '0')}</span>
                    </span>
                    <span className="cabinet-label relative z-20 line-clamp-1 flex-1 pixel-font pr-2">
                      {it.label}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Inline preview */}
          <AnimatePresence>
            {hover && (
              <motion.div
                key={hover.id}
                className="pointer-events-none absolute z-[30] rounded-[14px] border-2 border-black bg-white shadow-[0_10px_0_#000] crt-brackets glaze-animate"
                style={{ left: panelRect.left, top: panelRect.top, width: panelRect.width, height: panelRect.height }}
                initial={{ opacity: 0, scaleY: 0.86, y: -6, transformOrigin: 'top center' }}
                animate={{ opacity: 1, scaleY: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 26 } }}
                exit={{ opacity: 0, scaleY: 0.9, y: -6, transition: { duration: 0.18 } }}
              >
                <div className="bevel-top">
                  <div className="dots"><span className="dot" /><span className="dot" /><span className="dot" /></div>
                </div>
                <div className="p-4">
                  <div className="mini-tab">
                    <span className="pixel-num mr-2">{String(hover.id).padStart(3, '0')}</span>
                    <span className="text-[11px]">{hover.label}</span>
                  </div>
                  <div className="mt-2 h-[calc(100%-38px)] w-full overflow-hidden rounded bg-[#f9f9f9]">
                    <iframe title={`Preview ${hover.label}`} src={hover.route} className="h-full w-full" />
                  </div>
                </div>
                <span className="crt-btm-l" /><span className="crt-btm-r" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer badge */}
        <div className="mt-2 grid place-items-center">
          <div className="rounded-full bg-[#FFD84A] px-4 py-1 text-[11px] font-semibold uppercase tracking-widest text-black shadow-[0_2px_0_#000]">
            Alivia’s Subpages
          </div>
        </div>
      </div>

      {/* Scoped fixes: no legacy notches; keep label black */}
      <style>{`
        [data-no-notches] .file-tab,
        [data-no-notches] .file-tab::before,
        [data-no-notches] .file-tab::after {
          clip-path:none!important; -webkit-clip-path:none!important;
          mask:none!important; -webkit-mask:none!important;
          content:none!important; background:transparent!important;
        }
        [data-no-notches] .file-tab .cabinet-label{ position:relative; z-index:20; color:#0B0B0B; }
        [data-no-notches] .file-tab:hover  .cabinet-label,
        [data-no-notches] .file-tab:active .cabinet-label,
        [data-no-notches] .file-tab:focus  .cabinet-label{ color:#0B0B0B!important; }

        .mini-tab{
          display:inline-flex; align-items:center; gap:.25rem;
          border:2px solid #0B0B0B; border-bottom-width:0;
          background:#EDEDED; padding:.25rem .5rem; border-radius:10px 10px 0 0;
          box-shadow:0 4px 0 #000 inset;
        }
      `}</style>
    </div>
  );
}
