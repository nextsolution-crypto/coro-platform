'use client';

import { usePathname } from 'next/navigation';
import { isLegacyFooterVisible } from '@/lib/site/v2-migration';
import ChatWidget from './ChatWidget';
import CookieBanner from './CookieBanner';
import Footer from './Footer';
import ScrollToTop from './ScrollToTop';

/**
 * Root-level chrome. The legacy footer is suppressed only on routes listed in the V2 migration registry
 * (they render SiteFooterV2 through V2Shell). Cookie notice, scroll-to-top and chat stay global on every route.
 */
export default function LegacyChrome() {
  const pathname = usePathname();
  return (
    <>
      {isLegacyFooterVisible(pathname) && <Footer />}
      <CookieBanner />
      <ScrollToTop />
      <ChatWidget />
    </>
  );
}
