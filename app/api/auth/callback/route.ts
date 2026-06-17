import { createClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/calendar';
  const oauthError = searchParams.get('error_description') ?? searchParams.get('error');

  if (oauthError) return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(oauthError)}`);
  if (!code) return NextResponse.redirect(`${origin}/login?error=Missing authorization code.`);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);

  return NextResponse.redirect(`${origin}${next.startsWith('/') ? next : '/calendar'}`);
}
