import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isStoragePath, signFromLibrary } from '../lib/library';
import AddBookModal from './AddBookModal';
import StarRating from './StarRating';


type Book = {
  id: string;
  title: string;
  author?: string | null;
  rating?: number | null;
  description?: string | null;
  genres?: string[] | null;
  keywords?: string[] | null;
  spine_url?: string | null; // uploaded image path or signed URL for UI
  spine_style?: { bg: string; border?: string; labelColor?: string } | null;
  order?: number | null;
};

type Filter = { q: string; minRating?: number; genres: string[] };

const SAMPLE: Book[] = [
  { id: 's-1', title: 'PRINTABLE', rating: 4, spine_style: { bg: '#FF5A36', border: '#000', labelColor: '#fff' } },
  { id: 's-2', title: 'MONOGRAPH', rating: 5, spine_style: { bg: '#FFC1E3', border: '#000' } },
  { id: 's-3', title: 'BOSCH', rating: 4, spine_style: { bg: '#B1C5FF', border: '#000' } },
  { id: 's-4', title: 'ANATOMY', rating: 5, spine_style: { bg: '#0C2440', border: '#000', labelColor: '#fff' } },
  { id: 's-5', title: 'LINES', rating: 3, spine_style: { bg: '#E84141', border: '#000', labelColor: '#fff' } },
  { id: 's-6', title: 'S, M, L, XL', rating: 5, spine_style: { bg: '#E6E7EA', border: '#000' } },
  { id: 's-7', title: 'WATERS', rating: 4, spine_style: { bg: '#2B2F75', border: '#000', labelColor: '#fff' } },
  { id: 's-8', title: 'SYSTEMS', rating: 4, spine_style: { bg: '#FFB01E', border: '#000' } },
  { id: 's-9', title: 'METRICS', rating: 4, spine_style: { bg: '#4E2D1C', border: '#000', labelColor: '#fff' } },
];

export default function BookShelfCurated() {
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const [books, setBooks] = useState<Book[]>([]);
  const [cols, setCols] = useState(12);
  const [hover, setHover] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; x: number } | null>(null);

  const [filterOpen, setFilterOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>({ q: '', minRating: undefined, genres: [] });

  /** Fetch books (Supabase → fallback samples) */
  const refresh = async () => {
    const { data, error } = await supabase.from('books').select('*').order('order', { ascending: true });
    if (error || !data || !data.length) {
      setBooks(SAMPLE.map((b, i) => ({ ...b, order: i })));
      return;
    }
    const out: Book[] = [];
    for (const b of data as any[]) {
      const o = { ...b } as Book;
      if (isStoragePath(o.spine_url)) o.spine_url = await signFromLibrary(o.spine_url!);
      out.push(o);
    }
    setBooks(out);
  };

  useEffect(() => { refresh(); }, []);

  /** Responsive columns by width */
  useEffect(() => {
    const el = wrapRef.current!;
    function recalc() {
      const w = el?.clientWidth || 960;
      const target = Math.max(64, Math.min(88, Math.floor(w / 14)));
      const c = Math.max(6, Math.floor(w / target));
      setCols(c);
    }
    recalc();
    const ro = new ResizeObserver(recalc);
    if (el) ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** Filtered list */
  const filtered = useMemo(() => {
    const s = filter.q.trim().toLowerCase();
    return books.filter((b) => {
      const hitQ =
        !s ||
        (b.title || '').toLowerCase().includes(s) ||
        (b.author || '').toLowerCase().includes(s) ||
        (b.keywords || []).join(' ').toLowerCase().includes(s) ||
        (b.genres || []).join(' ').toLowerCase().includes(s);
      const hitR = filter.minRating ? (b.rating || 0) >= filter.minRating : true;
      const hitG = filter.genres.length ? (b.genres || []).some((g) => filter.genres.includes(g)) : true;
      return hitQ && hitR && hitG;
    });
  }, [books, filter]);

  /** Rows */
  const rows = useMemo(() => {
    const arr = [...filtered].sort((a, b) => (a.order || 0) - (b.order || 0));
    const r: Book[][] = [];
    for (let i = 0; i < arr.length; i += cols) r.push(arr.slice(i, i + cols));
    return r;
  }, [filtered, cols]);

  /** Drag reorder (flat) */
  function onPointerDown(e: React.PointerEvent, id: string) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ id, x: e.clientX });
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const slot = 40;
    const delta = Math.trunc(dx / slot);
    if (!delta) return;

    const flat = [...filtered].sort((a, b) => (a.order || 0) - (b.order || 0));
    const cur = flat.findIndex((b) => b.id === drag.id);
    const next = Math.max(0, Math.min(flat.length - 1, cur + delta));
    if (next === cur) return;

    const moved = flat.splice(cur, 1)[0];
    flat.splice(next, 0, moved);

    const ids = flat.map((b) => b.id);
    setBooks((all) => all.map((b) => ({ ...b, order: ids.indexOf(b.id) })));
    setDrag({ id: drag.id, x: e.clientX });
  }
  async function onPointerUp() {
    if (!drag) return;
    setDrag(null);
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return; // stub mode: local-only reorder
    await supabase.from('books').upsert(books.map((b) => ({ id: b.id, order: b.order || 0 })));
  }

  /** Search modal */
  function SearchModal() {
  // local working state
  const [q, setQ] = useState(filter.q);
  const [minStars, setMinStars] = useState<number>(filter.minRating ?? 0);
  const [tags, setTags] = useState<string>(filter.genres.join(', '));

  function apply() {
    setFilter({
      q,
      minRating: minStars || undefined,
      genres: tags ? tags.split(',').map((s) => s.trim()).filter(Boolean) : [],
    });
    setFilterOpen(false);
  }

  function clearAll() {
    setQ('');
    setMinStars(0);
    setTags('');
  }

  return (
    <div
      className="fixed inset-0 z-[95] grid place-items-center bg-black/60 p-4"
      onClick={() => setFilterOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Search & Filter"
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white p-5 text-slate-900 shadow-xl ring-1 ring-black/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <h3 className="mb-4 font-display text-xl">
          <span className="rounded bg-amber-300 px-2 py-[2px] text-black">Search</span>{' '}
          <span className="text-slate-400">&amp; Filter</span>
        </h3>

        <div className="space-y-5">
          {/* Section: Query */}
          <section aria-labelledby="sf-query">
            <h4 id="sf-query" className="mb-2 text-sm font-semibold text-slate-700">
              Query
            </h4>
            <input
              placeholder="Search by title, author, keywords…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="text-sm w-full rounded border border-violet-300 bg-white p-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </section>

          {/* Section: Rating */}
          <section aria-labelledby="sf-rating">
            <h4 id="sf-rating" className="mb-2 text-sm font-semibold text-slate-700">
              Minimum rating
            </h4>
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
              <StarRating value={minStars} onChange={setMinStars} size={24} color="#FFC83D" bg="#E2E8F0" />
              
            </div>
          </section>

          {/* Section: Genres */}
          <section aria-labelledby="sf-genres">
            <h4 id="sf-genres" className="mb-2 text-sm font-semibold text-slate-700">
              Genres
            </h4>
            <input
              placeholder="architecture, theory, urbanism…"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="text-sm w-full rounded border border-emerald-300 bg-white p-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <p className="mt-3 text-xs text-slate-600">Comma-separated; we’ll match any listed genre.</p>
          </section>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={clearAll}
            className="rounded border px-4 py-2 text-slate-700 hover:bg-slate-50"
            aria-label="Clear all filters"
            title="Clear all"
          >
            Clear
          </button>
          <button
            onClick={() => setFilterOpen(false)}
            className="rounded border px-4 py-2 text-slate-700 hover:bg-slate-50"
            aria-label="Cancel"
            title="Cancel"
          >
            Cancel
          </button>
          <button
            onClick={apply}
            className="rounded bg-[#FFD84A] px-4 py-2 font-semibold text-black shadow-[0_2px_0_#000] hover:brightness-95"
            aria-label="Apply filters"
            title="Apply"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}


  return (
    <div ref={wrapRef} className="relative">
      {/* Header row: search / title / add */}
      <div className="mb-6 flex items-center justify-between">
        <button
          aria-label="Search"
          onClick={() => setFilterOpen(true)}
          className="rounded-full border-2 border-black bg-white px-3 py-2 text-sm font-semibold shadow-[0_4px_0_#000] hover:brightness-95"
        >
          🔍
        </button>
        <h1 className="font-display text-4xl tracking-tight">AlIVIA'S LIBRARY</h1>
        <button
          onClick={() => setAddOpen(true)}
          className="rounded-full border-2 border-black bg-[#FFD84A] px-4 py-2 text-sm font-semibold text-black shadow-[0_4px_0_#000] hover:brightness-95"
        >
          ＋
        </button>
      </div>

      {/* Shelves */}
      <div
        className="rounded-[28px] border border-black/40 bg-[#f6f5f2] p-6 shadow-[0_20px_0_#0003]"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {rows.map((row, rIdx) => (
          <div key={rIdx} className="mb-6 flex items-end gap-3">
            {row.map((b) => {
              const tilt = hover === b.id ? '-translate-y-2 -rotate-6 scale-[1.04] shadow-[0_14px_0_#000]' : '';
              const labelColor = b.spine_style?.labelColor || '#000';
              return (
                <button
                  key={b.id}
                  onPointerDown={(e) => onPointerDown(e, b.id)}
                  onMouseEnter={() => setHover(b.id)}
                  onMouseLeave={() => setHover(null)}
                  title={`${b.title}${b.author ? ' — ' + b.author : ''}`}
                  className="group relative isolate outline-offset-2"
                >
                  <div
                    className={[
                      'h-[clamp(92px,18vw,220px)] w-[clamp(10px,3.8vw,28px)] rounded-sm border-2 border-black shadow-[0_10px_0_#000] transition-transform duration-200 ease-out will-change-transform',
                      tilt,
                    ].join(' ')}
                    style={
                      b.spine_url
                        ? { backgroundImage: `url(${b.spine_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                        : { background: b.spine_style?.bg || '#EDEDED' }
                    }
                  >
                    {/* vertical label */}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <span
                        className="rotate-180 whitespace-nowrap text-[10px] font-semibold [writing-mode:vertical-rl]"
                        style={{ color: labelColor }}
                      >
                        {b.title}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ))}

        {/* Shelf board */}
        <div className="h-2 rounded bg-[#e3d9c9] ring-1 ring-black/10" />
      </div>

      {/* Modals */}
      {filterOpen && <SearchModal />}
      <AddBookModal open={addOpen} onClose={() => setAddOpen(false)} onAdded={refresh} />
    </div>
  );
}
