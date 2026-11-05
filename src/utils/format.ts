import type { ListingType } from '@/types';

/** 12500000 -> "₹1.25 Cr", 4500000 -> "₹45 L", rent 28000 -> "₹28,000/mo" */
export function formatPrice(price: number, listingType: ListingType = 'Buy'): string {
  if (!Number.isFinite(price)) return '—';
  if (listingType === 'Rent') return `₹${Math.round(price).toLocaleString('en-IN')}/mo`;
  if (price >= 10_000_000) return `₹${trim(price / 10_000_000)} Cr`;
  if (price >= 100_000) return `₹${trim(price / 100_000)} L`;
  return `₹${Math.round(price).toLocaleString('en-IN')}`;
}

function trim(n: number): string {
  return n.toFixed(2).replace(/\.?0+$/, '');
}

export function formatArea(area: number): string {
  return `${Math.round(area).toLocaleString('en-IN')} sq ft`;
}

export function formatBhk(bhk: number | null): string {
  return bhk ? `${bhk} BHK` : '—';
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

export function startOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function isSameDay(a: Date | string, b: Date | string = new Date()): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

/** "Today, 4:30 PM" / "Tomorrow, 11:00 AM" / "12 Nov 2026, 3:00 PM" */
export function formatSmartDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameDay(d)) return `Today, ${formatTime(iso)}`;
  if (isSameDay(d, tomorrow)) return `Tomorrow, ${formatTime(iso)}`;
  return formatDateTime(iso);
}

/** "just now", "5 min ago", "3 h ago", "2 d ago", else a date. */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return '';
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} d ago`;
  return formatDate(iso);
}

export function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

/** Parses a user-typed numeric string ("1,25,000") into a number, or NaN. */
export function parseNumber(value: string): number {
  return Number(value.replace(/[,\s₹]/g, ''));
}
