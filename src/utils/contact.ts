import * as Clipboard from 'expo-clipboard';
import { Alert, Linking, Share } from 'react-native';

import type { Property } from '@/types';
import { formatArea, formatBhk, formatPrice } from '@/utils/format';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Strips everything but digits; a bare 10-digit Indian number gets the 91 country code. */
export function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

export function isValidEmail(email?: string | null): boolean {
  return !!email && EMAIL_RE.test(email.trim());
}

async function open(url: string, fallbackUrl?: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    if (fallbackUrl) {
      try {
        await Linking.openURL(fallbackUrl);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

export async function callNumber(mobile?: string | null): Promise<void> {
  const phone = normalizePhone(mobile);
  if (!phone) {
    Alert.alert('No phone number', 'This contact does not have a valid mobile number.');
    return;
  }
  const ok = await open(`tel:+${phone}`);
  if (!ok) Alert.alert('Cannot place call', 'No phone app is available on this device.');
}

export async function openWhatsApp(mobile?: string | null, message?: string): Promise<void> {
  const phone = normalizePhone(mobile);
  if (!phone) {
    Alert.alert('No phone number', 'This contact does not have a valid mobile number for WhatsApp.');
    return;
  }
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  const ok = await open(`whatsapp://send?phone=${phone}${message ? `&text=${encodeURIComponent(message)}` : ''}`, `https://wa.me/${phone}${text}`);
  if (!ok) Alert.alert('Cannot open WhatsApp', 'WhatsApp is not installed and the browser link could not be opened.');
}

export async function sendEmail(email?: string | null, subject?: string, body?: string): Promise<void> {
  if (!isValidEmail(email)) {
    Alert.alert('No email address', 'This contact does not have a valid email address.');
    return;
  }
  const params: string[] = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  const ok = await open(`mailto:${email!.trim()}${params.length ? `?${params.join('&')}` : ''}`);
  if (!ok) Alert.alert('Cannot open email', 'No email app is configured on this device.');
}

/** Returns true when the text was copied. */
export async function copyText(text: string | null | undefined, label = 'Text'): Promise<boolean> {
  if (!text) {
    Alert.alert('Nothing to copy', `${label} is not available.`);
    return false;
  }
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    Alert.alert('Copy failed', 'Could not access the clipboard.');
    return false;
  }
}

export function propertyShareText(p: Property): string {
  const lines = [
    `🏠 ${p.title}`,
    `📍 ${p.location}`,
    `💰 ${formatPrice(p.price, p.listingType)} (${p.listingType})`,
    `🛏 ${formatBhk(p.bhk)}  •  📐 ${formatArea(p.area)}  •  ${p.type}`,
  ];
  if (p.description) lines.push('', p.description);
  lines.push('', 'Shared via Hously Finntech Realty');
  return lines.join('\n');
}

export async function shareProperty(p: Property): Promise<void> {
  try {
    await Share.share({ title: p.title, message: propertyShareText(p) });
  } catch {
    Alert.alert('Share failed', 'The share sheet could not be opened.');
  }
}
