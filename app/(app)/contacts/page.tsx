import { createAdminClient } from '@/lib/supabase/admin';
import ContactsClient from './ContactsClient';

export const dynamic = 'force-dynamic';

export default async function ContactsPage() {
  const db = createAdminClient();
  const { data, count } = await db
    .from('contacts')
    .select('*, bookings(count)', { count: 'exact' })
    .order('name')
    .limit(20);

  return <ContactsClient initialData={data ?? []} initialTotal={count ?? 0} />;
}
