import { createClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const provider = form.get('provider') as string | null;
  const next = String(form.get('next') ?? '/calendar');
  const origin = request.nextUrl.origin;

  const supabase = await createClient();

  // Email/password sign-in
  if (provider === 'email') {
    const email = form.get('email') as string;
    const password = form.get('password') as string;
    if (!email || !password) {
      return NextResponse.redirect(`${origin}/login?error=Email and password are required.`, { status: 303 });
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`, { status: 303 });
    }
    return NextResponse.redirect(`${origin}${next.startsWith('/') ? next : '/calendar'}`, { status: 303 });
  }

  // OAuth sign-in (google)
  const callbackUrl = new URL(`${origin}/api/auth/callback`);
  if (next.startsWith('/')) callbackUrl.searchParams.set('next', next);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: (provider ?? 'google') as 'google',
    options: { redirectTo: callbackUrl.toString() },
  });

  if (error || !data.url) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error?.message ?? 'Could not start login.')}`, { status: 303 });
  }
  return NextResponse.redirect(data.url, { status: 303 });
}
