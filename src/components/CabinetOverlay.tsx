import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import FileIndexNav from './FileIndexNav';

export default function CabinetOverlay() {
  const [open, setOpen] = useState(false);
  const [peek, setPeek] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onClose = () => { setOpen(false); setPeek(false); };
    const onPeek = () => setPeek(true);
    const onPeekEnd = () => setPeek(false);
    window.addEventListener('cabinet-open', onOpen as any);
    window.addEventListener('cabinet-close', onClose as any);
    window.addEventListener('cabinet-peek', onPeek as any);
    window.addEventListener('cabinet-peek-end', onPeekEnd as any);
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('cabinet-open', onOpen as any);
      window.removeEventListener('cabinet-close', onClose as any);
      window.removeEventListener('cabinet-peek', onPeek as any);
      window.removeEventListener('cabinet-peek-end', onPeekEnd as any);
      window.removeEventListener('keydown', onEsc);
    };
  }, []);

  const show = open || peek;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[80] grid place-items-center bg-black/60 backdrop-blur"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => window.dispatchEvent(new CustomEvent('cabinet-close'))}
        >
          <motion.div
            className="
              h-[min(92vh,100svh)] w-[min(98vw,100svw)]
              sm:h-[90vh] sm:w-[min(1200px,96vw)]
              rounded-3xl bg-slate-50 shadow-2xl dark:bg-neutral-200 drawer-vt
              grid grid-rows-[auto,1fr] overflow-hidden
            "
            initial={{ y: 12, scale: 0.985, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 12, scale: 0.985, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search bar */}
            <div className="z-[2] grid grid-cols-[1fr,auto] items-center gap-2 p-3 sm:p-4">
              <div className="rounded-full border-2 border-black/60 bg-white p-2 search-bevel">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search subpages…"
                  className="w-full rounded-full bg-neutral-300 px-3 py-2 outline-none placeholder:text-neutral-700"
                />
              </div>
            </div>

            {/* Cabinet body (relative => preview anchors inside) */}
            <div id="cabinet-body" className="relative min-h-0 p-3 sm:p-4">
              <FileIndexNav query={query} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
