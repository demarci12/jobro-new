import { google } from 'googleapis';
import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const cookieStore = await cookies();
  const storedState = cookieStore.get('gcal_oauth_state')?.value;
  cookieStore.delete('gcal_oauth_state');

  if (!state || state !== storedState) return NextResponse.redirect(`${origin}/settings?error=invalid_state`);
  if (!code) return NextResponse.redirect(`${origin}/settings?error=missing_code`);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${origin}/api/auth/google/callback`,
  );

  const { tokens } = await oauth2.getToken(code);

  await createAdminClient().from('oauth_tokens').upsert({
    admin_user_id: user.id,
    provider: 'google',
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token!,
    expires_at: new Date(tokens.expiry_date!).toISOString(),
    status: 'active',
  }, { onConflict: 'admin_user_id,provider' });

  return NextResponse.redirect(`${origin}/settings?connected=1`);
}
