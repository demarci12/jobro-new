import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import ContactDetail from './ContactDetail';

export const dynamic = 'force-dynamic';

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createAdminClient();
  const [{ data: contact }, { data: bookings, count }] = await Promise.all([
    db.from('contacts').select('*').eq('id', id).single(),
    db.from('bookings').select('*, workers(name), service_types(name), quotes(id,status)', { count: 'exact' }).eq('contact_id', id).order('start_time', { ascending: false }).limit(20),
  ]);
  if (!contact) notFound();
  return <ContactDetail contact={contact} bookings={bookings ?? []} total={count ?? 0} />;
}
