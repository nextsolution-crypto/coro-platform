'use client';

import { useParams } from 'next/navigation';
import ProcedureEditor from '@/components/procedures/ProcedureEditor';

/** Procédure d'un projet : version du projet (projet > organisation > CORO). */
export default function ProcedureProjectEditPage() {
  const params = useParams();
  return (
    <ProcedureEditor
      projectId={params?.projectId as string}
      procedureId={params?.procedureId as string}
    />
  );
}
