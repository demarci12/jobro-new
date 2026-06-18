import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import SettingsClient from './SettingsClient';

export default async function SettingsPage() {
  const supabase = createAdminClient();
  const { data: token } = await supabase.from('oauth_tokens').select('status, expires_at').eq('provider', 'google').maybeSingle();

  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();

  return (
    <SettingsClient
      user={user ? { email: user.email, full_name: user.user_metadata?.full_name } : null}
      gcalConnected={token?.status === 'active'}
      gcalRevoked={token?.status === 'revoked'}
      gcalExpires={token?.expires_at ?? null}
    />
  );
}
