'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getUser } from '../../../store/auth';
import PortalLayout from '../../../components/PortalLayout';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

export default function KnowledgeSourcePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [source, setSource] = useState<{ url: string; name: string; pdf: boolean } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getUser()) {
      router.replace('/login');
      return;
    }
    const controller = new AbortController();
    let objectUrl: string | undefined;
    setSource(null);
    setError('');
    setLoading(true);

    async function load() {
      try {
        const token = localStorage.getItem('coro_client_token');
        if (!token) {
          router.replace('/login');
          return;
        }
        const response = await fetch(
          `${API_URL}/project-files/client/file/${encodeURIComponent(id)}/content`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
            signal: controller.signal,
          },
        );
        if (!response.ok) throw new Error('SOURCE_UNAVAILABLE');
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        const disposition = response.headers.get('content-disposition') || '';
        const name = disposition.match(/filename="([^"]+)"/i)?.[1] || 'document-source';
        objectUrl = URL.createObjectURL(blob);
        setSource({ url: objectUrl, name, pdf: blob.type.split(';')[0] === 'application/pdf' });
      } catch {
        if (!controller.signal.aborted) {
          setError('Ce document source est indisponible ou vous ne disposez plus des droits nécessaires pour le consulter.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, router]);

  return (
    <PortalLayout>
      <main style={{ padding: 'clamp(16px, 4vw, 32px)', minWidth: 0 }}>
        <Link href="/knowledge">Retour aux connaissances</Link>
        <h1>Document source</h1>
        {loading && <p role="status">Chargement du document cité…</p>}
        {error && <p role="alert">{error}</p>}
        {source && (
          <>
            <p>{source.name}</p>
            <p><a href={source.url} download={source.name}>Télécharger le document source</a></p>
            {source.pdf ? (
              <iframe
                title="Aperçu du document source"
                src={source.url}
                style={{ width: '100%', height: '75vh', minHeight: 400, border: '1px solid #dbe7f2', borderRadius: 8 }}
              />
            ) : <p>Téléchargez ce fichier pour le consulter.</p>}
          </>
        )}
      </main>
    </PortalLayout>
  );
}
