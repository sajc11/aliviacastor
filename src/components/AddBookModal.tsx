import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { uploadLibraryImage } from '../lib/library';
import StarRating from './StarRating';
import { nanoid } from 'nanoid';

type Props = {
  open: boolean;
  onClose: () => void;
  onAdded?: () => void;
};

type Mode = 'upload' | 'generate';

export default function AddBookModal({ open, onClose, onAdded }: Props) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState(0);
  const [description, setDescription] = useState('');
  const [genres, setGenres] = useState('');
  const [keywords, setKeywords] = useState('');

  // New: single choice for spine creation
  const [mode, setMode] = useState<Mode>('upload');

  // Upload path
  const [spineFile, setSpineFile] = useState<File | null>(null);

  // Generate path
  const [spineColor, setSpineColor] = useState('#FFE578');
  const [labelColor, setLabelColor] = useState('#111111');

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string>('');

  useEffect(() => {
    if (!open) {
      // reset form on close
      setTitle(''); setAuthor(''); setRating(0);
      setDescription(''); setGenres(''); setKeywords('');
      setMode('upload'); setSpineFile(null);
      setSpineColor('#FFE578'); setLabelColor('#111111');
      setSaving(false); setErr('');
    }
  }, [open]);

  function onSwitch(m: Mode) {
    setMode(m);
    // clear the other mode’s state so it’s obvious what will be saved
    if (m === 'upload') { setSpineColor('#FFE578'); setLabelColor('#111111'); }
    if (m === 'generate') { setSpineFile(null); }
  }

  async function onSave() {
    try {
      setSaving(true); setErr('');
      if (!title.trim()) { setErr('Title is required'); setSaving(false); return; }

      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { setErr('Please sign in first'); setSaving(false); return; }

      const id = nanoid();
      let spine_url: string | null = null;
      let spine_style: { bg: string; labelColor: string; border?: string } | null = null;

      if (mode === 'upload') {
        if (!spineFile) { setErr('Please choose a spine image'); setSaving(false); return; }
        const up = await uploadLibraryImage(u.user.id, 'spines', id, spineFile);
        spine_url = up.path;                 // store storage path (UI can sign as needed)
      } else {
        spine_style = { bg: spineColor, labelColor, border: '#000' };
      }

      const payload: any = {
        id,
        user_id: u.user.id,
        title: title.trim(),
        author: author.trim() || null,
        rating: Number(rating.toFixed(1)),
        description: description.trim() || null,
        genres: genres ? genres.split(',').map(s => s.trim()).filter(Boolean) : [],
        keywords: keywords ? keywords.split(',').map(s => s.trim()).filter(Boolean) : [],
        spine_url,
        spine_style,
        order: Date.now()
      };

      const { error } = await supabase.from('books').insert(payload);
      if (error) throw error;

      onAdded?.();
      onClose();
    } catch (e: any) {
      setErr(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const accent = 'focus:ring-2 focus:ring-violet-400';

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Add a Book">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white text-slate-900 shadow-2xl ring-1 ring-black/10">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="font-display text-xl font-semibold tracking-tight">Add a Book</h2>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-900 px-3 py-1 text-white shadow-[0_2px_0_#000] hover:bg-slate-800"
            aria-label="Close"
            title="Close"
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div className="grid gap-4 px-5 py-4">
          {/* Title / Author */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., S,M,L,XL"
                className={`mt-1 w-full rounded border border-violet-300 bg-white p-2 text-slate-900 placeholder:text-slate-400 ${accent}`}
              />
            </label>
            <label className="text-sm font-medium">
              Author
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g., Rem Koolhaas"
                className={`mt-1 w-full rounded border border-sky-300 bg-white p-2 text-slate-900 placeholder:text-slate-400 ${accent}`}
              />
            </label>
          </div>

          {/* Rating */}
          <div className="grid grid-cols-[auto_1fr] items-center gap-3">
            <span className="text-sm font-medium">Rating</span>
            <StarRating value={rating} onChange={setRating} />
          </div>

          {/* Description */}
          <label className="text-sm font-medium">
            Description
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why did this book matter to you?"
              className={`mt-1 w-full rounded border border-amber-300 bg-white p-2 text-slate-900 placeholder:text-slate-400 ${accent}`}
            />
          </label>

          {/* Genres / Keywords */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Genres (comma separated)
              <input
                value={genres}
                onChange={(e) => setGenres(e.target.value)}
                placeholder="architecture, theory"
                className={`mt-1 w-full rounded border border-emerald-300 bg-white p-2 text-slate-900 placeholder:text-slate-400 ${accent}`}
              />
            </label>
            <label className="text-sm font-medium">
              Keywords (comma separated)
              <input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="urbanism, form, OMA"
                className={`mt-1 w-full rounded border border-pink-300 bg-white p-2 text-slate-900 placeholder:text-slate-400 ${accent}`}
              />
            </label>
          </div>

          {/* Spine mode switch */}
          <div className="rounded-xl border border-slate-200 p-3">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <span>Spine</span>
              <div role="tablist" aria-label="Spine input mode" className="ml-3 inline-flex rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'upload'}
                  onClick={() => onSwitch('upload')}
                  className={`rounded-md px-3 py-1 text-sm ${mode === 'upload' ? 'bg-white shadow ring-1 ring-black/10' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Upload image
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'generate'}
                  onClick={() => onSwitch('generate')}
                  className={`rounded-md px-3 py-1 text-sm ${mode === 'generate' ? 'bg-white shadow ring-1 ring-black/10' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Generate spine
                </button>
              </div>
            </div>

            {/* Upload mode */}
            {mode === 'upload' && (
              <label className="block text-sm font-medium">
                Spine image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSpineFile(e.target.files?.[0] ?? null)}
                  className="mt-1 block w-full text-sm file:mr-4 file:rounded file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-white hover:file:bg-slate-800"
                />
              </label>
            )}

            {/* Generate mode */}
            {mode === 'generate' && (
              <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <span>Color</span>
                    <input
                      type="color"
                      value={spineColor}
                      onChange={(e) => setSpineColor(e.target.value)}
                      className="h-9 w-12 cursor-pointer rounded border"
                      aria-label="Spine color"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
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
          </div>

          {err && <div className="rounded bg-rose-50 p-2 text-rose-700">{err}</div>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="rounded border px-4 py-2 hover:bg-slate-50"
            aria-label="Cancel"
            title="Cancel"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="rounded bg-[#FFD84A] px-5 py-2 font-semibold text-black shadow-[0_2px_0_#000] hover:brightness-95 disabled:opacity-60"
            aria-label="Save"
            title="Save"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
