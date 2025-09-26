import { useEffect, useMemo, useState } from 'react';

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
      : 'professional',
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
        id: base + i,
        label,
        route,
        letter: (label[0] || '').toUpperCase(),
      }))
      .filter((it) => it.label.toLowerCase().includes(query.toLowerCase()));
  }, [mode, query]);

  const INDEX = useMemo(
    () => Array.from(new Set(DATA.map((d) => d.letter))).sort(),
    [DATA],
  );

  const grouped = useMemo(() => {
    const m: Record<string, Item[]> = {};
    DATA.forEach((i) => {
      (m[i.letter] ||= []).push(i);
    });
    Object.keys(m).forEach((k) => m[k].sort((a, b) => a.id - b.id));
    return m;
  }, [DATA]);

  const [hover, setHover] = useState<Item | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  function clampPreview(left: number, top: number) {
    // Panel is w = min(560, 94vw), h ≈ 260 (content ~220 + chrome).
    const panelW = Math.min(560, window.innerWidth * 0.94);
    const panelH = 260;
    const margin = 16;

    const maxLeft = window.scrollX + window.innerWidth - panelW - margin;
    const maxTop = window.scrollY + window.innerHeight - panelH - margin;

    return {
      x: Math.max(window.scrollX + margin, Math.min(left, maxLeft)),
      y: Math.max(window.scrollY + margin, Math.min(top, maxTop)),
    };
  }

  return (
    <div className="mx-auto max-w-5xl text-[#0B0B0B]">
      <div className="relative rounded-[14px] border-2 border-black/70 bg-[#EDEDED] p-3 shadow-[0_8px_0_#000]">
        <div className="relative h-[520px] overflow-auto rounded-[12px] bg-[#F3F3F3] p-3">
          <div className="grid h-max grid-cols-2 gap-2 sm:grid-cols-3">
            {INDEX.map((letter) => (
              <div key={letter} className="space-y-1">
                {(grouped[letter] || []).map((it) => (
                  <button
                    key={it.id}
                    aria-label={`Go to ${it.label}`}
                    onMouseEnter={(e) => {
                      setHover(it);
                      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      const rawLeft = r.left + window.scrollX + 16;
                      const rawTop = r.bottom + window.scrollY + 8;
                      setPos(clampPreview(rawLeft, rawTop));
                    }}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => {
                      window.location.href = it.route;
                    }}
                    className="
                      file-tab group relative isolate w-full overflow-visible
                      flex items-center rounded-[10px] border-2 border-black bg-white
                      px-2 py-[6px] text-left
                      shadow-[0_3px_0_#000]
                      transition hover:-translate-y-[1px] focus:-translate-y-[1px]
                      hover:bg-black hover:text-white
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black
                    "
                  >
                    {/* left badge (letter + id) */}
                    <span
                      className="
                        relative z-20 mr-2 inline-flex items-center gap-2 rounded
                        bg-black px-2 py-[2px] text-[10px] font-bold uppercase tracking-[0.18em] text-white
                        group-hover:bg-white group-hover:text-black
                      "
                    >
                      {letter}
                      <span className="pixel-num opacity-70">
                        {String(it.id).padStart(3, '0')}
                      </span>
                    </span>

                    {/* label — padded so it never sits under the right notch */}
                    <span
                      className="
                        cabinet-label relative z-20 line-clamp-1 flex-1 pixel-font
                        pr-20 md:pr-28   /* reserve room for the notch */
                      "
                    >
                      {it.label}
                    </span>
                    {/* NOTE: No decorative overlay element here.
                        The notch is drawn by CSS (::after on .file-tab) and sits behind text. */}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {hover && (
            <div
              className="
                pointer-events-none fixed z-[100]
                w-[min(560px,94vw)] rounded-[14px] border-2 border-black bg-white
                shadow-[0_10px_0_#000] crt-brackets glaze-animate
              "
              style={{ left: pos.x, top: pos.y }}
            >
              <div className="bevel-top">
                <div className="dots">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
              </div>
              <div className="p-4">
                <div className="mini-tab">
                  <span className="pixel-num mr-2">
                    {String(hover.id).padStart(3, '0')}
                  </span>
                  <span className="text-[11px]">{hover.label}</span>
                </div>
                <div className="mt-2 h-[220px] w-full overflow-hidden rounded bg-[#f9f9f9]">
                  <iframe
                    title={`Preview ${hover.label}`}
                    src={hover.route}
                    className="h-full w-full"
                  />
                </div>
              </div>
              <span className="crt-btm-l" />
              <span className="crt-btm-r" />
            </div>
          )}
        </div>

        <div className="mt-2 grid place-items-center">
          <div className="rounded-full bg-[#FFD84A] px-4 py-1 text-[11px] font-semibold uppercase tracking-widest text-black shadow-[0_2px_0_#000]">
            Alivia’s Subpages
          </div>
        </div>
      </div>

      {/* Keep just the mini-tab chrome here. (No file-tab clip-path or overlay notch.) */}
      <style>{`
        .mini-tab{
          display:inline-flex; align-items:center; gap:.25rem;
          border:2px solid #0B0B0B; border-bottom-width:0;
          background:#EDEDED; padding:.25rem .5rem; border-radius:10px 10px 0 0;
          box-shadow:0 4px 0 #000 inset;
        }
        /* Ensure label remains bright on hover for both themes */
        .file-tab:hover .cabinet-label{ color:#fff; }
        .dark .file-tab:hover .cabinet-label{ color:#fff; }
      `}</style>
    </div>
  );
}
