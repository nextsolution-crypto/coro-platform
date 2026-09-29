'use client';

import { useEffect } from 'react';

/**
 * Referral attribution capture (MIG-08A). Behavior lifted verbatim from the legacy `HomePageClient.tsx`
 * (cookie names, 90-day Max-Age, first-touch-wins, `CR-XXXXXX` format, domain/secure scoping) — see
 * docs/website-v2/05-migration/MIG-08-HOMEPAGE-GATE.md §9. Renders nothing; runs once on mount.
 */
const REFERRAL_COOKIE_CODE = 'coro_referral_code';
const REFERRAL_COOKIE_FIRST_TOUCH = 'coro_referral_first_touch';
const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 jours

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  const cookie = document.cookie.split('; ').find((item) => item.startsWith(prefix));
  if (!cookie) return null;
  return decodeURIComponent(cookie.substring(prefix.length));
}

function setReferralCookie(name: string, value: string) {
  if (typeof document === 'undefined') return;
  const isCoroDomain = window.location.hostname === 'getcoro.io' || window.location.hostname.endsWith('.getcoro.io');
  const domain = isCoroDomain ? '; Domain=.getcoro.io' : '';
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${REFERRAL_COOKIE_MAX_AGE}; SameSite=Lax${domain}${secure}`;
}

export function captureReferral(search: string): void {
  const params = new URLSearchParams(search);
  const referralParam = params.get('ref')?.trim().toUpperCase();
  const isValidReferralCode = referralParam && /^CR-[A-HJ-NP-Z2-9]{6}$/.test(referralParam);

  if (isValidReferralCode) {
    const existingReferralCode = getCookie(REFERRAL_COOKIE_CODE);
    if (!existingReferralCode) {
      setReferralCookie(REFERRAL_COOKIE_CODE, referralParam);
      setReferralCookie(REFERRAL_COOKIE_FIRST_TOUCH, new Date().toISOString());
    }
  }
}

export function ReferralCapture() {
  useEffect(() => {
    captureReferral(window.location.search);
  }, []);
  return null;
}
