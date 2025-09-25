import useImage from 'use-image';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { uploadJournalThumb } from '../lib/storage';
import StickerPalette from './StickerPalette';
import { nanoid } from 'nanoid';

type NodeT = {
  id: string;
  type: 'text' | 'image' | 'sticker';
  x: number;
  y: number;
  w?: number;
  h?: number;
  text?: string;
  url?: string;
  rotation?: number;
  font?: string;
  size?: number;
  color?: string;
  visible?: boolean;
  locked?: boolean;
  outlineColor?: string;
  outlineWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowX?: number;
  shadowY?: number;
};

export default function JournalEditor() {
  // Lazy-load react-konva only in the browser
  const [RK, setRK] = useState<any>(null);
  useEffect(() => {
    let mounted = true;
    if (typeof window !== 'undefined') {
      import('react-konva')
        .then((m) => mounted && setRK(m))
        .catch((e) => console.error('[react-konva] load failed', e));
    }
    return () => {
      mounted = false;
    };
  }, []);

  // If SSR or module not yet loaded, render nothing
  if (typeof window === 'undefined' || !RK) return null;

  const { Stage, Layer, Rect, Image: KImage, Text: KText, Transformer } = RK;

  // State & refs
  const stageRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  const [nodes, setNodes] = useState<NodeT[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [snap, setSnap] = useState(true);
  const [grid, setGrid] = useState(16);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [wrapW, setWrapW] = useState(1000);

  const passRef = useRef<HTMLInputElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);

  // Resize observer to keep canvas responsive
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWrapW(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const baseW = 1000;
  const baseH = 640;
  const scale = wrapW ? Math.min(1, wrapW / baseW) : 1;

  // Helpers
  function addText() {
    const s = 24;
    setNodes((n) => [
      ...n,
      { id: nanoid(), type: 'text', x: 80, y: 80, text: 'Type…', font: 'Space Grotesk', size: s, color: '#111' },
    ]);
  }
  async function addImageFromFile(f: File) {
    const url = URL.createObjectURL(f);
    setNodes((n) => [...n, { id: nanoid(), type: 'image', x: 100, y: 120, url }]);
  }
  function addSticker(url: string) {
    setNodes((n) => [...n, { id: nanoid(), type: 'sticker', x: 160, y: 160, url }]);
  }

  function onDragEnd(id: string, x: number, y: number) {
    setNodes((s) => s.map((m) => (m.id === id ? { ...m, x, y } : m)));
  }
  function bringFront(id: string) {
    setNodes((s) => {
      const i = s.findIndex((n) => n.id === id);
      if (i < 0) return s;
      const out = s.slice();
      const [sp] = out.splice(i, 1);
      out.push(sp);
      return out;
    });
  }
  function sendBack(id: string) {
    setNodes((s) => {
      const i = s.findIndex((n) => n.id === id);
      if (i < 0) return s;
      const out = s.slice();
      const [sp] = out.splice(i, 1);
      out.unshift(sp);
      return out;
    });
  }

  // Keep selection transformer synced
  useEffect(() => {
    if (!trRef.current || !stageRef.current) return;
    const st = stageRef.current;
    const konvaNodes = selected.map((id) => st.findOne('#' + id)).filter(Boolean);
    trRef.current.nodes(konvaNodes);
    trRef.current.getLayer()?.batchDraw();
  }, [selected, nodes]);

  // Image node renderer using useImage
  function Img({ url, ...rest }: any) {
    const [img] = useImage(url, 'anonymous');
    return img ? <KImage image={img} {...rest} /> : null;
  }

  async function saveEntry() {
    const title = titleRef.current?.value || 'Untitled';
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) {
      alert('Please sign in first');
      return;
    }
    // Save the doc
    const ins = await supabase
      .from('journal_entries')
      .insert({ user_id: u.user.id, title, doc: { nodes }, is_highlight: true })
      .select('id')
      .single();

    if (ins.error) {
      alert(ins.error.message);
      return;
    }

    try {
      const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2 });
      const signed = await uploadJournalThumb(u.user.id, ins.data.id, dataUrl);
      await supabase.from('journal_entries').update({ thumb_url: signed }).eq('id', ins.data.id);
    } catch (e) {
      // ignore thumb failure
    }

    alert('Saved');
  }

  return (
    <div className="grid gap-4 md:grid-cols-[1fr,320px]">
      {/* Canvas column */}
      <div
        ref={wrapRef}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const url = e.dataTransfer.getData('text/uri-list');
          if (url) addSticker(url);
          else if (e.dataTransfer.files?.length) addImageFromFile(e.dataTransfer.files[0]);
        }}
        className="overflow-auto rounded-2xl border bg-white p-2 dark:bg-slate-900"
      >
        <Stage
          width={baseW}
          height={baseH}
          scaleX={scale}
          scaleY={scale}
          ref={stageRef}
          className="mx-auto block max-w-full"
          onMouseDown={(e: any) => {
            if (e.target === e.target.getStage()) setSelected([]);
          }}
        >
          <Layer>
            {/* grid */}
            {snap &&
              Array.from({ length: Math.ceil(baseW / grid) }).map((_, i) => (
                <Rect key={'v' + i} x={i * grid} y={0} width={1} height={baseH} fill="#e5e7eb" opacity={0.3} />
              ))}
            {snap &&
              Array.from({ length: Math.ceil(baseH / grid) }).map((_, i) => (
                <Rect key={'h' + i} x={0} y={i * grid} width={baseW} height={1} fill="#e5e7eb" opacity={0.3} />
              ))}

            <Rect x={0} y={0} width={baseW} height={baseH} cornerRadius={24} fill="#f8fafc" />

            {nodes
              .filter((n) => n.visible !== false)
              .map((n) =>
                n.type === 'text' ? (
                  <KText
                    key={n.id}
                    id={n.id}
                    text={n.text || ''}
                    x={n.x}
                    y={n.y}
                    fontSize={n.size || 24}
                    fontFamily={n.font}
                    fill={n.color}
                    stroke={n.outlineColor || '#000'}
                    strokeWidth={n.outlineWidth || 0}
                    shadowColor={n.shadowColor || 'rgba(0,0,0,0.35)'}
                    shadowBlur={n.shadowBlur || 0}
                    shadowOffsetX={n.shadowX || 0}
                    shadowOffsetY={n.shadowY || 0}
                    draggable={!n.locked}
                    onClick={(e: any) => {
                      if (e.evt.shiftKey) setSelected((s) => Array.from(new Set([...s, n.id])));
                      else setSelected([n.id]);
                    }}
                    onDblClick={() => {
                      const t = prompt('Edit text', n.text || '') ?? n.text;
                      setNodes((s) => s.map((m) => (m.id === n.id ? { ...m, text: t || '' } : m)));
                    }}
                    onDragEnd={(e: any) => {
                      let { x, y } = e.target.position();
                      if (snap) {
                        x = Math.round(x / grid) * grid;
                        y = Math.round(y / grid) * grid;
                        e.target.position({ x, y });
                      }
                      onDragEnd(n.id, x, y);
                    }}
                  />
                ) : (
                  <Img
                    key={n.id}
                    id={n.id}
                    url={n.url}
                    x={n.x}
                    y={n.y}
                    draggable={!n.locked}
                    onClick={(e: any) => {
                      if (e.evt.shiftKey) setSelected((s) => Array.from(new Set([...s, n.id])));
                      else setSelected([n.id]);
                    }}
                    onDragEnd={(e: any) => {
                      let { x, y } = e.target.position();
                      if (snap) {
                        x = Math.round(x / grid) * grid;
                        y = Math.round(y / grid) * grid;
                        e.target.position({ x, y });
                      }
                      onDragEnd(n.id, x, y);
                    }}
                  />
                )
              )}

            <Transformer ref={trRef} rotateEnabled resizeEnabled keepRatio />
          </Layer>
        </Stage>
      </div>

      {/* Sidebar column */}
      <aside className="space-y-4 rounded-2xl border p-4">
        <h3 className="font-semibold">Journal tools</h3>
        <input ref={titleRef} placeholder="Entry title" className="mt-1 w-full rounded-md border p-2" />

        <div className="mt-2 flex flex-wrap gap-2">
          <button onClick={addText} className="rounded bg-slate-900 px-3 py-1 text-white">
            Add text
          </button>
          <label className="cursor-pointer rounded border px-3 py-1">
            Add image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files && addImageFromFile(e.target.files[0])}
            />
          </label>
        </div>

        <StickerPalette onPick={(u) => addSticker(u)} />

        <div className="mt-2 flex items-center justify-between text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} /> Snap to grid
          </label>
          <input
            type="number"
            min={4}
            max={64}
            step={2}
            value={grid}
            onChange={(e) => setGrid(Number(e.target.value) || 16)}
            className="w-16 rounded border p-1"
          />
        </div>

        <div className="mt-2 space-y-2">
          <input ref={passRef} type="password" placeholder="Optional encryption password" className="w-full rounded-md border p-2" />
          <button onClick={saveEntry} className="w-full rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white">
            Save entry
          </button>
        </div>
      </aside>
    </div>
  );
}
