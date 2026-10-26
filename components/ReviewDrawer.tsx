'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Right-hand drawer. The server-rendered form is passed in as children and is not modified. */
export default function ReviewDrawer({ title, triggerLabel, children }: { title: string; triggerLabel: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open) {
      closeRef.current?.focus();
      const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
      document.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
      wasOpen.current = true;
      return () => {
        document.removeEventListener('keydown', onKey);
        document.body.style.overflow = '';
      };
    }
    if (wasOpen.current) triggerRef.current?.focus();
  }, [open]);

  return (
    <>
      <button ref={triggerRef} type="button" className="btn" onClick={() => setOpen(true)}>
        {triggerLabel}
      </button>

      <div className="scrim fixed inset-0 z-30 bg-zinc-900/30" data-open={open} onClick={() => setOpen(false)} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-open={open}
        inert={!open}
        className="drawer fixed right-0 top-0 z-40 h-full w-full max-w-md overflow-y-auto border-l border-zinc-200 bg-white p-7 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          <button ref={closeRef} type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
        <div className="mt-6" onSubmit={() => setTimeout(() => setOpen(false), 150)}>
          {children}
        </div>
      </aside>
    </>
  );
}
