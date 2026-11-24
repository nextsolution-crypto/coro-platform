'use client';

import { useParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import SupportTicketThread from '@/components/support/SupportTicketThread';

export default function SupportTicketPage() {
  const params = useParams();
  const id = params?.id as string;
  return (
    <AppLayout>
      <div style={{ maxWidth: 900 }}>
        <SupportTicketThread ticketId={id} backHref="/support" />
      </div>
    </AppLayout>
  );
}
