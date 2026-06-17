import { createClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const provider = String(form.get('provider') ?? 'google') as 'google';
  const next = String(form.get('next') ?? '/calendar');
  const origin = request.nextUrl.origin;

  const supabase = await createClient();
  const callbackUrl = new URL(`${origin}/api/auth/callback`);
  if (next.startsWith('/')) callbackUrl.searchParams.set('next', next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callbackUrl.toString() },
  });

  if (error || !data.url) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error?.message ?? 'Could not start login.')}`, { status: 303 });
  }
  return NextResponse.redirect(data.url, { status: 303 });
}
