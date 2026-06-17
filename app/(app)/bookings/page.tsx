import { createAdminClient } from '@/lib/supabase/admin';
import BookingsClient from './BookingsClient';

export const dynamic = 'force-dynamic';

export default async function BookingsPage() {
  const db = createAdminClient();
  const [{ data: bookings }, { data: workers }] = await Promise.all([
    db.from('bookings').select('*, contacts(name), workers(name), service_types(name), quotes(id,status)').order('start_time', { ascending: false }).limit(100),
    db.from('workers').select('id, name').order('name'),
  ]);
  return <BookingsClient initialBookings={bookings ?? []} workers={workers ?? []} />;
}
