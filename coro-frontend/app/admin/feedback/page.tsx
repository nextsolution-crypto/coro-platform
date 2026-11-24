'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Les anciens feedbacks sont repris dans la console de support (24 nov. 2026). */
export default function AdminFeedbackRedirectPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/support/console'); }, [router]);
  return null;
}
