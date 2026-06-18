import { createAdminClient } from '@/lib/supabase/admin';
import QuotesClient from './QuotesClient';

export const revalidate = 30;

export default async function QuotesPage() {
  const { data } = await createAdminClient()
    .from('quotes')
    .select('*, bookings(start_time, contacts(name))')
    .order('created_at', { ascending: false });
  return <QuotesClient initialQuotes={data ?? []} />;
}
