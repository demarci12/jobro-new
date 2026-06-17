import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import InvoiceDetail from './InvoiceDetail';

export const dynamic = 'force-dynamic';

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: invoice } = await createAdminClient()
    .from('invoices')
    .select('*, bookings(id, start_time, end_time, address, status, contacts(name,email,phone), workers(name))')
    .eq('id', id)
    .single();

  if (!invoice) notFound();
  return <InvoiceDetail invoice={invoice} />;
}
