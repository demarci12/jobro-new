import { createAdminClient } from '@/lib/supabase/admin';
import InvoicesClient from './InvoicesClient';

export const revalidate = 30;

export default async function InvoicesPage() {
  const db = createAdminClient();
  const { data: invoices } = await db
    .from('invoices')
    .select('*, bookings(start_time, contacts(name,email))')
    .order('created_at', { ascending: false });

  return <InvoicesClient initialInvoices={invoices ?? []} />;
}
