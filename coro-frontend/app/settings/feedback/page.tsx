'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** « Nous écrire » est remplacé par le Centre d'aide (24 nov. 2026). */
export default function FeedbackRedirectPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/support'); }, [router]);
  return null;
}
