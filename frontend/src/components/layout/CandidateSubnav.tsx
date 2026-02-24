'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/candidate/dashboard', label: 'Overview' },
  { href: '/candidate/profile', label: 'Profile Details' },
  { href: '/candidate/applications', label: 'Applied Jobs' },
];

export function CandidateSubnav() {
  const pathname = usePathname();
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-violet-50/60 text-indigo-800 hover:bg-indigo-100'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
