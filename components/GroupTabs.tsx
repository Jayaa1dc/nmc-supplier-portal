'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef, useState } from 'react';

type Tab = { key: string; label: string; href: string };

/** Segmented control with a sliding pill. Each tab is a plain link, so filtering stays server-side. */
export default function GroupTabs({ tabs, active }: { tabs: Tab[]; active: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);

  useLayoutEffect(() => {
    const place = () => {
      const el = wrapRef.current?.querySelector<HTMLElement>('[aria-current="true"]');
      if (el) setPill({ x: el.offsetLeft, w: el.offsetWidth });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [active]);

  return (
    <div ref={wrapRef} className="seg-wrap" role="group" aria-label="Filter by group">
      {pill && <span aria-hidden="true" className="pill" style={{ width: pill.w, transform: `translateX(${pill.x}px)` }} />}
      {tabs.map((t) => (
        <Link key={t.key} href={t.href} scroll={false} className="seg" aria-current={t.key === active ? 'true' : undefined}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}
