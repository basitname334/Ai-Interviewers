/**
 * Central nav config: links change by route and role.
 * Used by SiteHeader (global navbar) and AppShell.
 */

export type NavItem = { href: string; label: string; primary?: boolean };

export const recruiterNavItems: NavItem[] = [
  { href: '/recruiter', label: 'Dashboard' },
  { href: '/recruiter/applicants', label: 'Applicants' },
  { href: '/recruiter/jobs', label: 'Jobs & applications' },
  { href: '/recruiter/results', label: 'Interview results' },
];

export const candidateNavItems: NavItem[] = [
  { href: '/candidate/dashboard', label: 'Dashboard' },
  { href: '/candidate/applications', label: 'Applications' },
  { href: '/candidate/profile', label: 'Profile' },
];

export const adminNavItems: NavItem[] = [
  { href: '/admin', label: 'Admin' },
  { href: '/admin/recruiters', label: 'Recruiters' },
];

export const publicNavItems: NavItem[] = [
  { href: '/', label: 'Home' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/#product', label: 'Product' },
  { href: '/#features', label: 'Features' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/#faq', label: 'FAQ' },
];

export function getRecruiterNav(): NavItem[] {
  return recruiterNavItems;
}

export function getCandidateNav(): NavItem[] {
  return candidateNavItems;
}

export function getAdminNav(): NavItem[] {
  return adminNavItems;
}

export function getPublicNav(): NavItem[] {
  return publicNavItems;
}

export type NavArea = 'public' | 'recruiter' | 'candidate' | 'admin';

/** Get nav links and area based on pathname (use role-specific nav only on app pages, not login/signup). */
export function getNavForPathname(pathname: string): { items: NavItem[]; area: NavArea } {
  const p = pathname ?? '';
  if (p === '/recruiter/login' || p === '/candidate/login' || p === '/candidate/signup' || p === '/admin/login') {
    return { items: publicNavItems, area: 'public' };
  }
  if (p.startsWith('/admin')) return { items: adminNavItems, area: 'admin' };
  if (p.startsWith('/recruiter')) return { items: recruiterNavItems, area: 'recruiter' };
  if (p.startsWith('/candidate')) return { items: candidateNavItems, area: 'candidate' };
  return { items: publicNavItems, area: 'public' };
}

/** Resolve role from pathname for AppShell */
export function getRoleFromPathname(pathname: string): 'recruiter' | 'candidate' | null {
  if (pathname.startsWith('/recruiter')) return 'recruiter';
  if (pathname.startsWith('/candidate')) return 'candidate';
  return null;
}
