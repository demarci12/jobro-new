import { createAdminClient } from '@/lib/supabase/admin';
import CalendarWrapper from './CalendarWrapper';

export default async function CalendarPage() {
  const { data: workers } = await createAdminClient()
    .from('workers').select('id, name').order('name');

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      <CalendarWrapper workers={workers ?? []} />
    </div>
  );
}
