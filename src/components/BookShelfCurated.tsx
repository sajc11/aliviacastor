import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';      // safe stub if .env is empty
import { uploadLibraryImage, isStoragePath, signFromLibrary } from '../lib/library';

type Book = {
  id: string;
  title: string;
  author?: string | null;
  rating?: number | null;
  description?: string | null;
  genres?: string[] | null;
  keywords?: string[] | null;
  spine_url?: string | null;           // uploaded image
  spine_style?: { bg: string; border?: string; labelColor?: string } | null; // generated
  order?: number | null;
};

type Filter = {
  q: string;
  minRating?: number;
  genres: string[];
};

const SAMPLE: Book[] = [
  { id: 's-1', title: 'PRINTABLE', rating: 4, spine_style: { bg: '#FF5A36', border: '#000', labelColor:'#fff' } },
  { id: 's-2', title: 'MONOGRAPH', rating: 5, spine_style: { bg: '#FFC1E3', border: '#000' } },
  { id: 's-3', title: 'BOSCH', rating: 4, spine_style: { bg: '#B1C5FF', border: '#000' } },
  { id: 's-4', title: 'ANATOMY', rating: 5, spine_style: { bg: '#0C2440', border: '#000', labelColor:'#fff' } },
  { id: 's-5', title: 'LINES', rating: 3, spine_style: { bg: '#E84141', border: '#000', labelColor:'#fff' } },
  { id: 's-6', title: 'S, M, L, XL', rating: 5, spine_style: { bg: '#E6E7EA', border: '#000' } },
  { id: 's-7', title: 'WATERS', rating: 4, spine_style: { bg: '#2B2F75', border: '#000', labelColor:'#fff' } },
  { id: 's-8', title: 'SYSTEMS', rating: 4, spine_style: { bg: '#FFB01E', border: '#000' } },
  { id: 's-9', title: 'METRICS', rating: 4, spine_style: { bg: '#4E2D1C', border: '#000', labelColor:'#fff' } },
];

export default function CuratedShelf() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [cols, setCols] = useState(12);            // spines per row
  const [hover, setHover] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; i: number; x: number } | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>({ q: '', minRating: undefined, genres: [] });

  // Load books (Supabase → fallback sample)
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('books').select('*').order('order', { ascending: true });
      if (error || !data || !data.length) {
        setBooks(SAMPLE.map((b, i) => ({ ...b, order: i })));
        return;
      }
      // Sign storage paths once
      const out: Book[] = [];
      for (const b of data as any[]) {
        const o = { ...b } as Book;
        if (isStoragePath(o.spine_url)) o.spine_url = await signFromLibrary(o.spine_url!);
        out.push(o);
      }
      setBooks(out);
    })();
  }, []);

  // Responsive shelves: compute columns by container width
  useEffect(() => {
    const el = wrapRef.current!;
    function recalc() {
      const w = el?.clientWidth || 960;
      // target visible width per book ~ 64–80px depending on viewport
      const target = Math.max(64, Math.min(88, Math.floor(w / 14)));
      const c = Math.max(6, Math.floor(w / target));
      setCols(c);
    }
    recalc();
    const ro = new ResizeObserver(recalc);
    if (el) ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Filters
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

  // Chunk into rows
  const rows = useMemo(() => {
    const arr = [...filtered].sort((a, b) => (a.order || 0) - (b.order || 0));
    const r: Book[][] = [];
    for (let i = 0; i < arr.length; i += cols) r.push(arr.slice(i, i + cols));
    return r;
  }, [filtered, cols]);

  // Drag-reorder (row-agnostic; reorders the flat order)
  function onPointerDown(e: React.PointerEvent, id: string, i: number) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ id, i, x: e.clientX });
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const threshold = 40; // move across a “slot”
    let delta = Math.trunc(dx / threshold);
    if (delta !== 0) {
      const flat = [...filtered].sort((a, b) => (a.order || 0) - (b.order || 0));
      const curIndex = flat.findIndex((b) => b.id === drag.id);
      const nextIndex = Math.max(0, Math.min(flat.length - 1, curIndex + delta));
      if (nextIndex !== curIndex) {
        const moved = flat.splice(curIndex, 1)[0];
        flat.splice(nextIndex, 0, moved);
        // Write back to master list
        setBooks((all) => {
          const ids = flat.map((b) => b.id);
          return all.map((b) => ({ ...b, order: ids.indexOf(b.id) }));
        });
        setDrag({ ...drag, x: e.clientX });
      }
    }
  }
  async function onPointerUp() {
    if (!drag) return;
    setDrag(null);
    // Persist order if Supabase is configured
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return; // in safe stub mode this is null
    const updates = books.map((b) => ({ id: b.id, order: b.order || 0 }));
    await supabase.from('books').upsert(updates);
  }

  // Add book modal (image or generated spine)
  function AddModal() {
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [rating, setRating] = useState<number>(0);
    const [desc, setDesc] = useState('');
    const [genres, setGenres] = useState('');
    const [keywords, setKeywords] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [bg, setBg] = useState('#EDEDED');
    const [labelColor, setLabelColor] = useState('#000');

    async function save() {
      const id = crypto.randomUUID();
      let spine_url: string | null = null;
      let spine_style: Book['spine_style'] | null = null;

      const { data: u } = await supabase.auth.getUser();
      if (file && u?.user) {
        const { path, signedUrl } = await uploadLibraryImage(u.user.id, 'spines', id, file);
        spine_url = path; // store path in DB; signed in UI
      } else {
        spine_style = { bg, labelColor, border: '#000' };
      }

      // Upsert to DB if configured, else local
      const payload: Book = {
        id,
        title: title || 'Untitled',
        author: author || null,
        rating,
        description: desc || null,
        genres: genres ? genres.split(',').map((s) => s.trim()) : [],
        keywords: keywords ? keywords.split(',').map((s) => s.trim()) : [],
        spine_url,
        spine_style,
        order: (books.length || 0) + 1,
      };

      const { error } = await supabase.from('books').upsert(payload);
      if (error) {
        // local-only fallback
        setBooks((b) => [...b, payload]);
      } else {
        // sign URL for immediate view
        if (spine_url && isStoragePath(spine_url)) payload.spine_url = await signFromLibrary(spine_url);
        setBooks((b) => [...b, payload]);
      }

      setAddOpen(false);
    }

    return (
      <div className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-4" onClick={() => setAddOpen(false)}>
        <div className="max-w-2xl w-full rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-display text-xl">Add a Book</h3>
            <button className="rounded bg-slate-900 px-2 py-1 text-sm text-white" onClick={() => setAddOpen(false)}>Close</button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span>Title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded border p-2" />
            </label>
            <label className="block text-sm">
              <span>Author</span>
              <input value={author} onChange={(e) => setAuthor(e.target.value)} className="mt-1 w-full rounded border p-2" />
            </label>

            <label className="block text-sm">
              <span>Rating</span>
              <input type="number" min={0} max={5} value={rating} onChange={(e) => setRating(Number(e.target.value))} className="mt-1 w-24 rounded border p-2" />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span>Description</span>
              <textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} className="mt-1 w-full rounded border p-2" />
            </label>

            <label className="block text-sm">
              <span>Genres (comma separated)</span>
              <input value={genres} onChange={(e) => setGenres(e.target.value)} className="mt-1 w-full rounded border p-2" />
            </label>
            <label className="block text-sm">
              <span>Keywords (comma separated)</span>
              <input value={keywords} onChange={(e) => setKeywords(e.target.value)} className="mt-1 w-full rounded border p-2" />
            </label>

            <label className="block text-sm">
              <span>Spine image</span>
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-1 w-full rounded border p-2" />
            </label>

            <div className="rounded-2xl border p-3">
              <div className="mb-2 text-sm font-medium">Or generate a spine</div>
              <div className="flex items-center gap-3 text-sm">
                <label className="flex items-center gap-2"><span>Color</span> <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} /></label>
                <label className="flex items-center gap-2"><span>Label</span> <input type="color" value={labelColor} onChange={(e) => setLabelColor(e.target.value)} /></label>
              </div>
              <div className="mt-3 h-32 w-8 rounded-sm border-2 border-black bg-[var(--bg)] shadow-[0_10px_0_#000]" style={{ ['--bg' as any]: bg }}>
                {/* preview label */}
              </div>
            </div>
          </div>

          <div className="mt-4 text-right">
            <button className="rounded bg-black px-4 py-2 text-white" onClick={save}>Save</button>
          </div>
        </div>
      </div>
    );
  }

  // Search modal
  function SearchModal() {
    const [q, setQ] = useState(filter.q);
    const [minRating, setMinRating] = useState(filter.minRating || 0);
    const [tags, setTags] = useState(filter.genres.join(', '));

    function apply() {
      setFilter({
        q,
        minRating: minRating || undefined,
        genres: tags ? tags.split(',').map((s) => s.trim()).filter(Boolean) : [],
      });
      setFilterOpen(false);
    }

    return (
      <div className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-4" onClick={() => setFilterOpen(false)}>
        <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <h3 className="mb-3 font-display text-xl">Search & Filter</h3>
          <div className="grid gap-3">
            <input placeholder="Search by title, author, keyword…" value={q} onChange={(e) => setQ(e.target.value)} className="rounded border p-2" />
            <label className="flex items-center gap-3 text-sm">
              <span>Min rating</span>
              <input type="number" min={0} max={5} value={minRating} onChange={(e) => setMinRating(Number(e.target.value))} className="w-24 rounded border p-2" />
            </label>
            <input placeholder="Genres (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} className="rounded border p-2" />
          </div>
          <div className="mt-4 text-right">
            <button className="rounded bg-black px-4 py-2 text-white" onClick={apply}>Apply</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      {/* Header row: search (left) / title / add (right) */}
      <div className="mb-6 flex items-center justify-between">
        <button aria-label="Search" onClick={() => setFilterOpen(true)} className="rounded-full border-2 border-black bg-white px-3 py-2 text-sm font-semibold shadow-[0_4px_0_#000]">
          🔍
        </button>
        <h1 className="font-display text-4xl tracking-tight">THE PERSONAL CURATION</h1>
        <button onClick={() => setAddOpen(true)} className="rounded-full border-2 border-black bg-[#FFD84A] px-4 py-2 text-sm font-semibold text-black shadow-[0_4px_0_#000]">
          ＋
        </button>
      </div>

      {/* Shelves */}
      <div
        className="shelf-perspective rounded-[28px] border border-black/40 bg-[#f6f5f2] p-6 shadow-[0_20px_0_#0003]"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {rows.map((row, rIdx) => (
          <div key={rIdx} className="mb-6 flex items-end gap-3">
            {row.map((b, idx) => (
              <button
                key={b.id}
                onPointerDown={(e) => onPointerDown(e, b.id, idx)}
                onMouseEnter={() => setHover(b.id)}
                onMouseLeave={() => setHover(null)}
                title={`${b.title}${b.author ? ' — ' + b.author : ''}`}
                className="group relative isolate"
                onClick={(e) => {
                  // detail panel route could be wired here if you have /books/[id]
                  if (Math.abs((e as any).movementX || 0) < 2) {
                    // open a modal or /library
                  }
                }}
              >
                <div
                  className={[
                    'spine',
                    hover === b.id ? 'spine-hover' : '',
                    'h-[clamp(92px,18vw,220px)] w-[clamp(10px,3.8vw,28px)] rounded-sm border-2 border-black bg-white shadow-[0_10px_0_#000] transition-transform',
                  ].join(' ')}
                  style={
                    b.spine_url
                      ? { backgroundImage: `url(${b.spine_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : { background: b.spine_style?.bg || '#EDEDED', color: b.spine_style?.labelColor || '#000' }
                  }
                >
                  {/* label (vertical) */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="rotate-180 whitespace-nowrap text-[10px] font-semibold [writing-mode:vertical-rl]">
                      {b.title}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ))}

        {/* Wooden shelf line */}
        <div className="h-2 rounded bg-[#e3d9c9] ring-1 ring-black/10" />
      </div>

      {addOpen && <AddModal />}
      {filterOpen && <SearchModal />}
    </div>
  );
}
