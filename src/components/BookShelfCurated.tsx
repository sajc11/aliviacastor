import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isStoragePath, signFromLibrary, uploadLibraryImage } from '../lib/library';
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

/* ----------------------------------------------------
   Inline “Open Book” Panel (view + edit)
---------------------------------------------------- */
function OpenBookPanel({
  book,
  onClose,
  onSaved,
}: {
  book: Book;
  onClose: () => void;
  onSaved: (patch: Partial<Book>) => void;
}) {
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  // form state
  const [title, setTitle] = useState(book.title || '');
  const [author, setAuthor] = useState(book.author || '');
  const [rating, setRating] = useState(Number(book.rating ?? 0));
  const [description, setDescription] = useState(book.description || '');
  const [genres, setGenres] = useState((book.genres || []).join(', '));
  const [keywords, setKeywords] = useState((book.keywords || []).join(', '));

  // spine edit mode
  type SpineMode = 'keep' | 'upload' | 'generate';
  const [spineMode, setSpineMode] = useState<SpineMode>('keep');
  const [file, setFile] = useState<File | null>(null);
  const [spineColor, setSpineColor] = useState(book.spine_style?.bg || '#FFE578');
  const [labelColor, setLabelColor] = useState(book.spine_style?.labelColor || '#111111');

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  function resetForm() {
    setTitle(book.title || '');
    setAuthor(book.author || '');
    setRating(Number(book.rating ?? 0));
    setDescription(book.description || '');
    setGenres((book.genres || []).join(', '));
    setKeywords((book.keywords || []).join(', '));
    setSpineMode('keep'); setFile(null);
    setSpineColor(book.spine_style?.bg || '#FFE578');
    setLabelColor(book.spine_style?.labelColor || '#111111');
    setErr('');
  }

  function cancelEdit() { resetForm(); setMode('view'); }

  async function save() {
    try {
      setSaving(true); setErr('');
      const patch: any = {
        title: title.trim(),
        author: author.trim() || null,
        rating: Number(rating.toFixed(1)),
        description: description.trim() || null,
        genres: genres ? genres.split(',').map(s => s.trim()).filter(Boolean) : [],
        keywords: keywords ? keywords.split(',').map(s => s.trim()).filter(Boolean) : [],
      };

      if (spineMode === 'keep') {
        if (!book.spine_url) patch.spine_style = { bg: spineColor, labelColor, border: '#000' };
      } else if (spineMode === 'generate') {
        patch.spine_url = null;
        patch.spine_style = { bg: spineColor, labelColor, border: '#000' };
      } else if (spineMode === 'upload') {
        if (!file) { setErr('Please choose a spine image'); setSaving(false); return; }
        const { data: u } = await supabase.auth.getUser();
        if (!u?.user) { setErr('Please sign in first'); setSaving(false); return; }
        const up = await uploadLibraryImage(u.user.id, 'spines', crypto.randomUUID(), file);
        patch.spine_url = up.path;
        patch.spine_style = null;
      }

      const { error } = await supabase.from('books').update(patch).eq('id', book.id);
      if (error) throw error;

      if (patch.spine_url && isStoragePath(patch.spine_url)) {
        patch.spine_url = await signFromLibrary(patch.spine_url);
      }

      onSaved(patch);
      setMode('view');
    } catch (e: any) {
      setErr(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  // “open book” container: two pages with a center seam + soft inner shadows
  return (
    <div className="my-5 overflow-hidden rounded-[28px] bg-white text-slate-900 shadow-xl ring-1 ring-black/10 relative">
      {/* center seam */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-slate-200" />
      {/* inner page shading */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-40 bg-gradient-to-r from-black/5 via-transparent to-black/5 blur-lg" />

      {/* PAGES */}
      {mode === 'view' ? (
        <div className="grid gap-0 md:grid-cols-2">
          {/* Left page: details */}
          <div className="p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-display text-2xl tracking-tight">{book.title}</h3>
              {book.author && <span className="text-sm text-slate-600">by {book.author}</span>}
            </div>
            <div className="mt-2">
              <StarRating value={Number(book.rating ?? 0)} onChange={() => {}} />
            </div>
            {book.description && <p className="mt-4 text-sm leading-relaxed">{book.description}</p>}

            {(book.genres?.length || 0) > 0 && (
              <div className="mt-3 text-xs text-slate-600">
                <span className="font-semibold">Genres:</span> {book.genres!.join(', ')}
              </div>
            )}
            {(book.keywords?.length || 0) > 0 && (
              <div className="mt-1 text-xs text-slate-600">
                <span className="font-semibold">Keywords:</span> {book.keywords!.join(', ')}
              </div>
            )}
          </div>

          {/* Right page: spine preview + actions */}
          <div className="flex flex-col items-end gap-4 p-6 md:p-8">
            <div className="h-32 w-9 overflow-hidden rounded border-2 border-black bg-white shadow-[0_12px_0_#000]">
              {book.spine_url ? (
                <img src={book.spine_url} alt={`${book.title} spine`} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full" style={{ background: book.spine_style?.bg || '#EDEDED' }} />
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setMode('edit')} className="rounded border px-3 py-1 hover:bg-slate-50">Edit</button>
              <button onClick={onClose} className="rounded border px-3 py-1 hover:bg-slate-50">Close</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 p-6 md:p-8">
          {/* Left page: editable fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-900">
                Title
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title"
                  className="mt-1 w-full rounded border border-violet-300 bg-white p-2 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </label>
              <label className="text-sm font-medium text-slate-900">
                Author
                <input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Author"
                  className="mt-1 w-full rounded border border-sky-300 bg-white p-2 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </label>
            </div>

            <div className="grid grid-cols-[auto_1fr] items-center gap-3 text-slate-900">
              <span className="text-sm font-medium">Rating</span>
              <StarRating value={rating} onChange={setRating} />
            </div>

            <label className="text-sm font-medium block text-slate-900">
              Description
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description or notes."
                className="mt-1 w-full rounded border border-amber-300 bg-white p-2 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-slate-900 text-sm font-medium">
                Genres
                <input
                  value={genres}
                  onChange={(e) => setGenres(e.target.value)}
                  placeholder="architecture, theory"
                  className="mt-1 w-full rounded border border-emerald-300 bg-white p-2 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </label>
              <label className="text-slate-900 text-sm font-medium">
                Keywords
                <input
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="urbanism, form, OMA"
                  className="mt-1 w-full rounded border border-pink-300 bg-white p-2 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
              </label>
            </div>
          </div>

          {/* Right page: spine controls + preview + actions */}
          <div className="space-y-4">
            <fieldset className="rounded-xl border border-slate-200 p-3">
              <legend className="px-1 text-sm font-semibold text-slate-900">Book Cover</legend>

              {/* vertical radio list */}
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2 text-sm text-slate-900">
                  <input type="radio" name={`spine-mode-${book.id}`} value="keep" checked={spineMode === 'keep'} onChange={() => setSpineMode('keep')} />
                  <span>Keep current</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-900">
                  <input type="radio" name={`spine-mode-${book.id}`} value="upload" checked={spineMode === 'upload'} onChange={() => setSpineMode('upload')} />
                  <span>Upload image</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-900">
                  <input type="radio" name={`spine-mode-${book.id}`} value="generate" checked={spineMode === 'generate'} onChange={() => setSpineMode('generate')} />
                  <span>Generate spine</span>
                </label>
              </div>

              {spineMode === 'upload' && (
                <label className="mt-3 block text-sm font-medium text-slate-900">
                  Spine image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="mt-1 block w-full text-sm file:mr-4 file:rounded file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-white hover:file:bg-slate-800"
                  />
                </label>
              )}

              {spineMode === 'generate' && (
                <div className="mt-3 grid gap-3 sm:grid-cols-[auto_1fr]">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-900">
                      <span>Color</span>
                      <input
                        type="color"
                        value={spineColor}
                        onChange={(e) => setSpineColor(e.target.value)}
                        className="h-9 w-12 cursor-pointer rounded border"
                        aria-label="Spine color"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-900">
                      <span>Label</span>
                      <input
                        type="color"
                        value={labelColor}
                        onChange={(e) => setLabelColor(e.target.value)}
                        className="h-9 w-12 cursor-pointer rounded border"
                        aria-label="Label color"
                      />
                    </label>
                  </div>
                  <div className="flex items-end gap-3">
                    <div
                      className="h-28 w-3 rounded shadow-sm ring-1 ring-slate-200"
                      style={{ background: spineColor }}
                      aria-label="Spine preview"
                      title="Spine preview"
                    />
                    <div className="text-xs text-slate-500">Preview</div>
                  </div>
                </div>
              )}
            </fieldset>

            <div className="flex items-center justify-end gap-2">
              <button onClick={cancelEdit} className="rounded border px-3 py-1 hover:bg-slate-50">Cancel</button>
              <button
                onClick={save}
                disabled={saving}
                className="rounded bg-[#FFD84A] px-4 py-1.5 font-semibold text-black shadow-[0_2px_0_#000] hover:brightness-95 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>

            {err && <div className="rounded bg-rose-50 p-2 text-rose-700">{err}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------
   Main shelf + inline placement
---------------------------------------------------- */
export default function BookShelfCurated() {
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const [books, setBooks] = useState<Book[]>([]);
  const [cols, setCols] = useState(12);
  const [hover, setHover] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; x: number } | null>(null);

  const [filterOpen, setFilterOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>({ q: '', minRating: undefined, genres: [] });

  // NEW: which book panel is open and where to insert it (row index)
  const [openId, setOpenId] = useState<string | null>(null);
  const [openRowIdx, setOpenRowIdx] = useState<number | null>(null);

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
    if (!u?.user) return;
    await supabase.from('books').upsert(books.map((b) => ({ id: b.id, order: b.order || 0 })));
  }

  /** Search modal (bright, with StarRating) */
  function SearchModal() {
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
    function clearAll() { setQ(''); setMinStars(0); setTags(''); }

    return (
      <div className="fixed inset-0 z-[95] grid place-items-center bg-black/60 p-4" onClick={() => setFilterOpen(false)} role="dialog" aria-modal="true" aria-label="Search & Filter">
        <div className="w-full max-w-xl rounded-2xl bg-white p-5 text-slate-900 shadow-xl ring-1 ring-black/10" onClick={(e) => e.stopPropagation()}>
          <h3 className="mb-4 font-display text-xl">
            <span className="rounded bg-amber-300 px-2 py-[2px] text-black">Search</span>{' '}
            <span className="text-slate-400">&amp; Filter</span>
          </h3>

          <div className="space-y-5">
            <section aria-labelledby="sf-query">
              <h4 id="sf-query" className="mb-2 text-sm font-semibold text-slate-700">Query</h4>
              <input
                placeholder="Search by title, author, keywords…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="text-sm w-full rounded border border-violet-300 bg-white p-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </section>

            <section aria-labelledby="sf-rating">
              <h4 id="sf-rating" className="mb-2 text-sm font-semibold text-slate-700">Minimum rating</h4>
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                <StarRating value={minStars} onChange={setMinStars} size={24} color="#FFC83D" bg="#E2E8F0" />
              </div>
            </section>

            <section aria-labelledby="sf-genres">
              <h4 id="sf-genres" className="mb-2 text-sm font-semibold text-slate-700">Genres</h4>
              <input
                placeholder="architecture, theory, urbanism…"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="text-sm w-full rounded border border-emerald-300 bg-white p-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <p className="mt-3 text-xs text-slate-600">Comma-separated; we’ll match any listed genre.</p>
            </section>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <button onClick={clearAll} className="rounded border px-4 py-2 text-slate-700 hover:bg-slate-50" aria-label="Clear all filters">Clear</button>
            <button onClick={() => setFilterOpen(false)} className="rounded border px-4 py-2 text-slate-700 hover:bg-slate-50" aria-label="Cancel">Cancel</button>
            <button onClick={apply} className="rounded bg-[#FFD84A] px-4 py-2 font-semibold text-black shadow-[0_2px_0_#000] hover:brightness-95" aria-label="Apply filters">Apply</button>
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

      {/* Shelves + inline panel */}
      <div
        className="rounded-[28px] border border-black/40 bg-[#f6f5f2] p-6 shadow-[0_20px_0_#0003]"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {rows.map((row, rIdx) => (
          <div key={rIdx} className="mb-6">
            {/* shelf row */}
            <div className="mb-4 flex items-end gap-3">
              {row.map((b) => {
                const isOpen = openId === b.id && openRowIdx === rIdx;
                const tilt = !isOpen && hover === b.id ? '-translate-y-2 -rotate-6 scale-[1.04] shadow-[0_14px_0_#000]' : '';
                const labelColor = b.spine_style?.labelColor || '#000';
                return (
                  <button
                    key={b.id}
                    aria-expanded={isOpen}
                    onPointerDown={(e) => onPointerDown(e, b.id)}
                    onMouseEnter={() => setHover(b.id)}
                    onMouseLeave={() => setHover(null)}
                    title={`${b.title}${b.author ? ' — ' + b.author : ''}`}
                    className="group relative isolate outline-offset-2"
                    onClick={() => {
                      // TOGGLE: close if the same book is open; otherwise open it in this row
                      if (openId === b.id && openRowIdx === rIdx) {
                        setOpenId(null);
                        setOpenRowIdx(null);
                      } else {
                        setOpenId(b.id);
                        setOpenRowIdx(rIdx);
                      }
                    }}
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

            {/* inline open-book panel under this row */}
            {openRowIdx === rIdx && openId && (
              <OpenBookPanel
                book={books.find(b => b.id === openId)!}
                onClose={() => { setOpenId(null); setOpenRowIdx(null); }}
                onSaved={(patch) => {
                  setBooks(list => list.map(b => b.id === openId ? { ...b, ...patch } : b));
                }}
              />
            )}

            {/* shelf board */}
            <div className="h-2 rounded bg-[#e3d9c9] ring-1 ring-black/10" />
          </div>
        ))}
      </div>

      {/* Modals */}
      {filterOpen && <SearchModal />}
      <AddBookModal open={addOpen} onClose={() => setAddOpen(false)} onAdded={refresh} />
    </div>
  );
}
