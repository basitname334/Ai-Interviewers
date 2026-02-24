'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getNavForPathname } from '@/components/layout/navConfig';

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [recruiterLoggedIn, setRecruiterLoggedIn] = useState(false);
  const [candidateLoggedIn, setCandidateLoggedIn] = useState(false);
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [candidateName, setCandidateName] = useState('');

  const { items: navLinks, area } = getNavForPathname(pathname ?? '');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const rToken = localStorage.getItem('recruiterToken');
    const cToken = localStorage.getItem('candidateToken');
    const aToken = localStorage.getItem('adminToken');
    const name = localStorage.getItem('candidateName');
    setRecruiterLoggedIn(Boolean(rToken));
    setCandidateLoggedIn(Boolean(cToken));
    setAdminLoggedIn(Boolean(aToken));
    setCandidateName(name || '');
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '/admin') return pathname === '/admin' || pathname === '/admin/';
    if (href.startsWith('/#')) return false;
    return pathname === href || (href !== '/recruiter' && href !== '/candidate/dashboard' && pathname?.startsWith(href));
  };

  const linkClass = (href: string) =>
    `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      isActive(href)
        ? 'text-[var(--landing-text)] bg-white/10'
        : 'text-[var(--landing-muted)] hover:text-[var(--landing-text)] hover:bg-white/5'
    }`;

  const handleLogout = (role: 'recruiter' | 'candidate' | 'admin') => {
    if (typeof window === 'undefined') return;
    if (role === 'recruiter') {
      localStorage.removeItem('recruiterToken');
      localStorage.removeItem('recruiterEmail');
      localStorage.removeItem('recruiterName');
      router.push('/recruiter/login');
    } else if (role === 'candidate') {
      localStorage.removeItem('candidateToken');
      localStorage.removeItem('candidateName');
      localStorage.removeItem('candidateEmail');
      router.push('/candidate/login');
    } else {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminEmail');
      router.push('/admin/login');
    }
    setMobileOpen(false);
    router.refresh();
  };

  const renderRight = () => {
    if (area === 'admin') {
      return (
        <>
          <Link href="/" className="rounded-md px-3 py-2 text-sm font-medium text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-text)] hover:bg-white/5">
            Home
          </Link>
          {adminLoggedIn && (
            <button type="button" onClick={() => handleLogout('admin')} className="rounded-md px-3 py-2 text-sm font-medium text-[var(--landing-muted)] hover:bg-white/5">
              Logout
            </button>
          )}
        </>
      );
    }
    if (area === 'recruiter') {
      if (recruiterLoggedIn) {
        return (
          <>
            <Link href="/recruiter" className="rounded-full bg-[var(--landing-accent-solid)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--landing-accent)]">
              New interview
            </Link>
            <button type="button" onClick={() => handleLogout('recruiter')} className="rounded-md px-3 py-2 text-sm font-medium text-[var(--landing-muted)] hover:bg-white/5">
              Logout
            </button>
          </>
        );
      }
      return (
        <>
          <Link href="/candidate/login" className="rounded-md px-3 py-2 text-sm font-medium text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-text)] hover:bg-white/5">
            Sign In
          </Link>
          <Link href="/candidate/signup" className="rounded-full bg-[var(--landing-accent-solid)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--landing-accent)]">
            Sign up
          </Link>
        </>
      );
    }
    if (area === 'candidate') {
      if (candidateLoggedIn) {
        return (
          <>
            <Link href="/candidate/dashboard" className="rounded-md px-3 py-2 text-sm font-medium text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-text)] hover:bg-white/5">
              {candidateName || 'Dashboard'}
            </Link>
            <button type="button" onClick={() => handleLogout('candidate')} className="rounded-md px-3 py-2 text-sm font-medium text-[var(--landing-muted)] hover:bg-white/5">
              Logout
            </button>
          </>
        );
      }
      return (
        <>
          <Link href="/candidate/login" className="rounded-md px-3 py-2 text-sm font-medium text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-text)] hover:bg-white/5">
            Sign In
          </Link>
          <Link href="/candidate/signup" className="rounded-full bg-[var(--landing-accent-solid)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--landing-accent)]">
            Sign up
          </Link>
        </>
      );
    }
    // public
    if (recruiterLoggedIn) {
      return (
        <>
          <Link href="/candidate/dashboard" className="rounded-md px-3 py-2 text-sm font-medium text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-text)] hover:bg-white/5">
            Dashboard
          </Link>
          <button type="button" onClick={() => handleLogout('recruiter')} className="rounded-md px-3 py-2 text-sm font-medium text-[var(--landing-muted)] hover:bg-white/5">
            Logout
          </button>
        </>
      );
    }
    if (candidateLoggedIn) {
      return (
        <>
          <Link href="/candidate/dashboard" className="rounded-md px-3 py-2 text-sm font-medium text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-text)] hover:bg-white/5">
            {candidateName || 'Dashboard'}
          </Link>
          <button type="button" onClick={() => handleLogout('candidate')} className="rounded-md px-3 py-2 text-sm font-medium text-[var(--landing-muted)] hover:bg-white/5">
            Logout
          </button>
        </>
      );
    }
    return (
      <>
        <Link href="/recruiter/login" className="rounded-md px-3 py-2 text-sm font-medium text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-text)] hover:bg-white/5">
          Recruiter
        </Link>
        <Link href="/candidate/login" className="rounded-full border border-[var(--landing-muted)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--landing-text)] transition-colors hover:border-[var(--landing-text)] hover:bg-white/5">
          Sign In
        </Link>
        <Link href="/candidate/signup" className="rounded-full bg-[var(--landing-accent-solid)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--landing-accent)]">
          Sign up
        </Link>
      </>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--landing-border)] bg-[var(--landing-surface-solid)] backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href={area === 'admin' ? '/admin' : '/'}
          className="flex shrink-0 items-center gap-2.5 text-[var(--landing-text)] transition-opacity hover:opacity-90"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--landing-muted)] bg-transparent" />
          <span className="font-display text-lg font-semibold tracking-tight">
            {area === 'admin' ? 'Admin' : 'AI Interviewer'}
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.href)}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {renderRight()}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--landing-border)] text-[var(--landing-muted)] hover:bg-white/5 md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-[var(--landing-border)] bg-[var(--landing-surface-solid)] px-4 py-4 md:hidden">
          <div className="flex flex-col gap-0.5">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className={`rounded-md px-3 py-2.5 text-sm font-medium ${linkClass(link.href)}`}>
                {link.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-1 border-t border-[var(--landing-border)] pt-3">
              {area === 'admin' && (
                <>
                  <Link href="/" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-medium text-[var(--landing-muted)] hover:bg-white/5">Home</Link>
                  {adminLoggedIn && (
                    <button type="button" onClick={() => handleLogout('admin')} className="rounded-md px-3 py-2.5 text-left text-sm font-medium text-[var(--landing-muted)] hover:bg-white/5">Logout</button>
                  )}
                </>
              )}
              {area === 'recruiter' && recruiterLoggedIn && (
                <>
                  <Link href="/recruiter" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-medium text-[var(--landing-muted)] hover:bg-white/5">New interview</Link>
                  <button type="button" onClick={() => handleLogout('recruiter')} className="rounded-md px-3 py-2.5 text-left text-sm font-medium text-[var(--landing-muted)] hover:bg-white/5">Logout</button>
                </>
              )}
              {area === 'recruiter' && !recruiterLoggedIn && (
                <>
                  <Link href="/candidate/login" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-medium text-[var(--landing-muted)] hover:bg-white/5">Sign In</Link>
                  <Link href="/candidate/signup" onClick={() => setMobileOpen(false)} className="rounded-full bg-[var(--landing-accent-solid)] px-3 py-2.5 text-center text-sm font-semibold text-white">Sign up</Link>
                </>
              )}
              {area === 'candidate' && candidateLoggedIn && (
                <>
                  <Link href="/candidate/dashboard" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-medium text-[var(--landing-muted)] hover:bg-white/5">{candidateName || 'Dashboard'}</Link>
                  <button type="button" onClick={() => handleLogout('candidate')} className="rounded-md px-3 py-2.5 text-left text-sm font-medium text-[var(--landing-muted)] hover:bg-white/5">Logout</button>
                </>
              )}
              {area === 'candidate' && !candidateLoggedIn && (
                <>
                  <Link href="/candidate/login" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-medium text-[var(--landing-muted)] hover:bg-white/5">Sign In</Link>
                  <Link href="/candidate/signup" onClick={() => setMobileOpen(false)} className="rounded-full bg-[var(--landing-accent-solid)] px-3 py-2.5 text-center text-sm font-semibold text-white">Sign up</Link>
                </>
              )}
              {area === 'public' && !recruiterLoggedIn && !candidateLoggedIn && (
                <>
                  <Link href="/recruiter/login" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-medium text-[var(--landing-muted)] hover:bg-white/5">Recruiter login</Link>
                  <Link href="/candidate/login" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-medium text-[var(--landing-muted)] hover:bg-white/5">Login</Link>
                  <Link href="/candidate/signup" onClick={() => setMobileOpen(false)} className="rounded-full bg-[var(--landing-accent-solid)] px-3 py-2.5 text-center text-sm font-semibold text-white">Sign up</Link>
                </>
              )}
              {area === 'public' && (recruiterLoggedIn || candidateLoggedIn) && (
                <>
                  <Link href="/candidate/dashboard" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-medium text-[var(--landing-muted)] hover:bg-white/5">{candidateName || 'Dashboard'}</Link>
                  <button type="button" onClick={() => handleLogout(recruiterLoggedIn ? 'recruiter' : 'candidate')} className="rounded-md px-3 py-2.5 text-left text-sm font-medium text-[var(--landing-muted)] hover:bg-white/5">Logout</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
