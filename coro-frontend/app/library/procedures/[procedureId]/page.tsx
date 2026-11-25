'use client';

import { useParams } from 'next/navigation';
import ProcedureEditor from '@/components/procedures/ProcedureEditor';

/** Version de l'organisation d'une procédure CORO (administrateur). */
export default function ProcedureOrganizationEditPage() {
  const params = useParams();
  return <ProcedureEditor procedureId={params?.procedureId as string} />;
}
