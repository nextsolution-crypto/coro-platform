'use client';

import { useParams } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import SupportTicketThread from '@/components/support/SupportTicketThread';

export default function SupportConsoleTicketPage() {
  const params = useParams();
  const id = params?.id as string;
  return (
    <AppLayout>
      <div style={{ maxWidth: 960 }}>
        <SupportTicketThread ticketId={id} backHref="/support/console" />
      </div>
    </AppLayout>
  );
}
