// src/components/admin/LibraryEdit.tsx
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { isStoragePath, signFromLibrary, uploadLibraryImage } from '../../lib/library';

// -------------------- field styles --------------------
const baseField =
  "rounded border p-1 focus:outline-none focus:ring-2 focus:ring-offset-0 placeholder:text-slate-400";

const titleField  = `${baseField} bg-violet-50  border-violet-300  text-slate-900 focus:ring-violet-400`;
const authorField = `${baseField} bg-sky-50     border-sky-300     text-slate-900 focus:ring-sky-400`;
const yearField   = `${baseField} bg-sky-50     border-sky-300     text-slate-900 focus:ring-sky-400 text-center`;
const reviewField = `${baseField} bg-amber-50   border-amber-300   text-slate-900 focus:ring-amber-400`;

// Rating heatmap (0–5, 0.5 step)
const ratingClass = (val: number) => [
  baseField,
  "text-center",
  val >= 4 ? "bg-emerald-50 border-emerald-300 text-emerald-800 focus:ring-emerald-400"
  : val >= 3 ? "bg-amber-50  border-amber-300  text-amber-800  focus:ring-amber-400"
  : val >  0 ? "bg-rose-50   border-rose-300   text-rose-800   focus:ring-rose-400"
             : "bg-slate-50  border-slate-300  text-slate-800  focus:ring-slate-400"
].join(" ");

// -------------------- types --------------------
type Book = {
  id: string; title: string;
  author: string | null; spine_url: string | null; cover_url: string | null;
  rating: number | null; favorite: boolean; review: string | null;
  user_id?: string | null;
};
type DVD = {
  id: string; title: string;
  year: number | null; spine_url: string | null; cover_url: string | null;
  rating: number | null; favorite: boolean; review: string | null;
  user_id?: string | null;
};

type Table = 'books' | 'dvds';
type Row = Book | DVD;

// -------------------- data loader --------------------
function useRows(table: Table, q: string) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setError('');
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('favorite', { ascending: false })
        .range(0, 999);

      if (!alive) return;
      if (error) { setError(error.message); setLoading(false); return; }

      const list = (data || []) as Row[];
      const out: Row[] = [];
      for (const r of list) {
        const o: any = { ...r };
        if (isStoragePath(o.spine_url))  o.spine_url  = await signFromLibrary(o.spine_url);
        if (isStoragePath(o.cover_url))  o.cover_url  = await signFromLibrary(o.cover_url);
        out.push(o);
      }
      setRows(out); setLoading(false);
    })();
    return () => { alive = false; };
  }, [table]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r: any) =>
      (r.title || '').toLowerCase().includes(s) ||
      (r.author || '').toLowerCase().includes(s) ||
      String((r as any).year || '').includes(s)
    );
  }, [rows, q]);

  return { rows: filtered, setRows, loading, error };
}

// -------------------- component --------------------
export default function LibraryEdit() {
  const [table, setTable] = useState<Table>('books');
  const [q, setQ] = useState('');
  const { rows, setRows, loading, error } = useRows(table, q);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState('');

  function toggle(id: string) {
    setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function clearSel() { setSel(new Set()); }

  async function saveRow(row: Row) {
    const patch: any = { title: (row as any).title };
    if (table === 'books') patch.author = (row as Book).author;
    if (table === 'dvds')  patch.year   = (row as DVD).year;
    patch.rating   = (row as any).rating   ?? null;
    patch.favorite = !!(row as any).favorite;
    patch.review   = (row as any).review   ?? null;

    const { error } = await supabase.from(table).update(patch).eq('id', (row as any).id);
    setMsg(error ? error.message : 'Saved');
    setTimeout(() => setMsg(''), 1200);
  }

  async function onUpload(row: Row, kind: 'spine' | 'cover', file: File) {
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) { setMsg('Sign in first.'); return; }

    try {
      const { path, signedUrl } = await uploadLibraryImage(
        u.user.id,
        kind === 'spine' ? 'spines' : 'covers',
        crypto.randomUUID(),
        file
      );
      const { error } = await supabase
        .from(table)
        .update({ [`${kind}_url`]: path } as any)
        .eq('id', (row as any).id);
      if (error) throw error;

      setRows(list =>
        list.map(r =>
          (r as any).id === (row as any).id
            ? ({ ...(r as any), [`${kind}_url`]: signedUrl } as any)
            : r
        )
      );
      setMsg('Uploaded');
    } catch (e: any) {
      setMsg(e?.message || 'Upload failed');
    }
    setTimeout(() => setMsg(''), 1200);
  }

  async function bulk(action: 'favorite' | 'unfavorite' | 'delete' | 'setRating', rating?: number) {
    if (!sel.size) return;
    const ids = Array.from(sel);

    if (action === 'delete') {
      await supabase.from(table).delete().in('id', ids);
      setRows(list => list.filter((r: any) => !ids.includes(r.id)));
    } else if (action === 'favorite' || action === 'unfavorite') {
      const fav = action === 'favorite';
      await supabase.from(table).update({ favorite: fav }).in('id', ids);
      setRows(list => list.map((r: any) => (ids.includes(r.id) ? { ...r, favorite: fav } : r)));
    } else if (action === 'setRating') {
      await supabase.from(table).update({ rating: rating ?? 0 }).in('id', ids);
      setRows(list => list.map((r: any) => (ids.includes(r.id) ? { ...r, rating: rating ?? 0 } : r)));
    }

    clearSel(); setMsg('Done'); setTimeout(() => setMsg(''), 800);
  }

  return (
    <div className="space-y-4" aria-live="polite">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="edit-table" className="sr-only">Table type</label>
        <select
          id="edit-table"
          aria-label="Table type"
          title="Table type"
          value={table}
          onChange={e => { setTable(e.target.value as Table); clearSel(); }}
          className="rounded border px-2 py-1"
        >
          <option value="books">books</option>
          <option value="dvds">dvds</option>
        </select>

        <label htmlFor="edit-search" className="sr-only">Search</label>
        <input
          id="edit-search"
          aria-label="Search"
          title="Search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search title / author / year"
          className="w-64 rounded border p-2"
        />

        {msg && <div className="text-sm text-red-600">{msg}</div>}
      </div>

      {/* Bulk actions */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border p-2 text-sm">
        <span className="mr-2">{sel.size} selected</span>
        <button onClick={() => bulk('favorite')}   className="rounded border px-2 py-1" aria-label="Mark selected as favorite">★ Favorite</button>
        <button onClick={() => bulk('unfavorite')} className="rounded border px-2 py-1" aria-label="Remove favorite from selected">☆ Unfavorite</button>
        <button onClick={() => bulk('setRating', 5)} className="rounded border px-2 py-1" aria-label="Set rating 5 for selected">Rate 5</button>
        <button onClick={() => bulk('setRating', 0)} className="rounded border px-2 py-1" aria-label="Clear rating for selected">Clear rating</button>
        <button onClick={() => bulk('delete')} className="rounded border px-2 py-1 text-red-600" aria-label="Delete selected">Delete</button>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-2xl border">
        <table className="min-w-[960px] w-full text-sm">
          <thead className="bg-slate-900 text-white border-b-2 border-black dark:bg-zinc-900 dark:text-amber-200">
            <tr>
              <th className="p-2" scope="col">Sel</th>
              <th className="p-2" scope="col">Spine</th>
              <th className="p-2 text-amber-300" scope="col">Title</th>
              {table === 'books'
                ? <th className="p-2 text-amber-300" scope="col">Author</th>
                : <th className="p-2 text-amber-300" scope="col">Year</th>}
              <th className="p-2" scope="col">Rating</th>
              <th className="p-2" scope="col">Fav</th>
              <th className="p-2" scope="col">Cover</th>
              <th className="p-2" scope="col">Review</th>
              <th className="p-2" scope="col">Save</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} className={`border-t hover:bg-slate-50 dark:hover:bg-zinc-900/40 transition-colors ${r.favorite ? 'bg-yellow-50/40' : ''}`}>
                {/* Select */}
                <td className="p-2 text-center">
                  <input
                    type="checkbox"
                    aria-label={`Select ${r.title}`}
                    checked={sel.has(r.id)}
                    onChange={() => toggle(r.id)}
                    className="accent-yellow-500"
                  />
                </td>

                {/* Spine */}
                <td className="p-2">
                  <div className="relative h-16 w-3 overflow-hidden rounded bg-white">
                    {r.spine_url && <img src={r.spine_url} alt={`${r.title} spine`} className="h-full w-full object-cover" />}
                    <input
                      type="file"
                      accept="image/*"
                      aria-label={`Upload spine image for ${r.title}`}
                      title="Upload spine image"
                      className="absolute inset-0 cursor-pointer opacity-0"
                      onChange={e => e.target.files && onUpload(r, 'spine', e.target.files[0])}
                    />
                  </div>
                </td>

                {/* Title */}
                <td className="p-2">
                  <input
                    aria-label="Title"
                    title="Title"
                    placeholder="Title"
                    value={r.title || ''}
                    onChange={e => setRows(list => list.map(x => x === r ? { ...x, title: e.target.value } : x))}
                    className={`w-56 ${titleField}`}
                  />
                </td>

                {/* Author / Year */}
                {table === 'books' ? (
                  <td className="p-2">
                    <input
                      aria-label="Author"
                      title="Author"
                      placeholder="Author"
                      value={r.author || ''}
                      onChange={e => setRows(list => list.map(x => x === r ? { ...x, author: e.target.value } : x))}
                      className={`w-40 ${authorField}`}
                    />
                  </td>
                ) : (
                  <td className="p-2">
                    <input
                      aria-label="Year"
                      title="Year"
                      placeholder="Year"
                      value={r.year || ''}
                      onChange={e => setRows(list => list.map(x => x === r ? { ...x, year: e.target.value ? Number(e.target.value) : null } : x))}
                      className={`w-24 ${yearField}`}
                    />
                  </td>
                )}

                {/* Rating */}
                <td className="p-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    step={0.5}
                    min={0}
                    max={5}
                    aria-label="Rating"
                    title="Rating"
                    value={Number(r.rating ?? 0)}
                    onChange={(e) => {
                      const raw = Number(e.target.value);
                      const next = Number.isFinite(raw) ? Math.max(0, Math.min(5, raw)) : 0;
                      setRows(list => list.map(x => x === r ? { ...x, rating: next } : x));
                    }}
                    className={`w-16 ${ratingClass(Number(r.rating ?? 0))}`}
                  />
                </td>

                {/* Favorite */}
                <td className="p-2 text-center">
                  <input
                    type="checkbox"
                    aria-label="Favorite"
                    title="Favorite"
                    checked={!!r.favorite}
                    onChange={(e) => setRows(list => list.map(x => x === r ? { ...x, favorite: e.target.checked } : x))}
                    className="accent-yellow-500"
                  />
                </td>

                {/* Cover */}
                <td className="p-2">
                  <div className={`relative h-16 w-12 overflow-hidden rounded bg-white ${r.cover_url ? "ring-2 ring-slate-200" : "border"}`}>
                    {r.cover_url && (
                      <img
                        src={r.cover_url}
                        alt={`${r.title} cover`}
                        className="h-full w-full object-cover"
                      />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      aria-label={`Upload cover image for ${r.title}`}
                      title="Upload cover image"
                      className="absolute inset-0 cursor-pointer opacity-0"
                      onChange={(e) => e.target.files && onUpload(r, 'cover', e.target.files[0])}
                    />
                  </div>
                </td>

                {/* Review */}
                <td className="p-2">
                  <textarea
                    aria-label="Review"
                    title="Review"
                    placeholder="Review"
                    rows={2}
                    value={r.review || ''}
                    onChange={(e) => setRows(list => list.map(x => x === r ? { ...x, review: e.target.value } : x))}
                    className={`w-64 ${reviewField}`}
                  />
                </td>

                {/* Save */}
                <td className="p-2">
                  <button
                    aria-label={`Save ${r.title}`}
                    className="rounded border px-2 py-1 hover:bg-slate-50"
                    onClick={() => saveRow(r)}
                  >
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && <div className="text-sm text-slate-500">Loading…</div>}
      {error   && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}
