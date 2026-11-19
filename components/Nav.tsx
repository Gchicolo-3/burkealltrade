'use client';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/', label: 'Today', icon: '☀' },
  { href: '/quote', label: 'Quote', icon: '$' },
  { href: '/schedule', label: 'Schedule', icon: '▦' },
  { href: '/jobs', label: 'Jobs', icon: '✓' },
  { href: '/customers', label: 'People', icon: '☺' },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-xl grid-cols-5">
        {items.map((i) => {
          const active = i.href === '/' ? path === '/' : path.startsWith(i.href);
          return (
            <a
              key={i.href}
              href={i.href}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold ${active ? 'text-brand' : 'text-stone-500'}`}
            >
              <span className="text-xl leading-none" aria-hidden>{i.icon}</span>
              {i.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
