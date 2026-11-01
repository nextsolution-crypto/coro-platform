'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import PortalLayout from '../../../components/PortalLayout';
import { apiGet, getUser } from '../../../store/auth';

type LibrarySource = {
  id: string;
  code: string;
  content: unknown;
  scope: 'GLOBAL' | 'ORGANIZATION' | 'PROJECT';
  version: string;
  fingerprint: string;
};

export default function LibraryKnowledgeSourcePage() {
  const { id } = useParams<{ id: string }>();
  const projectId = useSearchParams().get('projectId');
  const router = useRouter();
  const [source, setSource] = useState<LibrarySource | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getUser()) { router.replace('/login'); return; }
    let active = true;
    const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    apiGet(`/client-portal/knowledge/library-sources/${encodeURIComponent(id)}${query}`)
      .then((value) => { if (active) setSource(value as LibrarySource); })
      .catch(() => { if (active) setError('Cette source est indisponible ou vous ne disposez plus des droits nécessaires.'); });
    return () => { active = false; };
  }, [id, projectId, router]);

  return <PortalLayout><main style={{ padding: 'clamp(16px, 4vw, 32px)', minWidth: 0, maxWidth: 960 }}>
    <Link href="/knowledge">Retour aux connaissances</Link>
    <h1>Source du catalogue</h1>
    {!source && !error && <p role="status">Chargement de la source citée…</p>}
    {error && <p role="alert">{error}</p>}
    {source && <article>
      <h2>Procédure {source.code}</h2>
      <p>Portée : {source.scope.toLowerCase()} · version {source.version.split(':')[0]}</p>
      <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontFamily: 'inherit' }}>{JSON.stringify(source.content, null, 2)}</pre>
      <small>Empreinte SHA-256 : {source.fingerprint}</small>
    </article>}
  </main></PortalLayout>;
}
