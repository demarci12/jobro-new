import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import BookingDetail from './BookingDetail';

export const dynamic = 'force-dynamic';

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: booking } = await createAdminClient()
    .from('bookings')
    .select('*, contacts(name,email,phone), workers(name,email,google_calendar_id), service_types(name), quotes(*)')
    .eq('id', id)
    .single();
  if (!booking) notFound();
  return <BookingDetail booking={booking} />;
}
