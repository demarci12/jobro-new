import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const { origin } = request.nextUrl;
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return NextResponse.redirect(`${origin}/sign-up?error=Email and password are required.`, { status: 303 });
  }
  if (password.length < 8) {
    return NextResponse.redirect(`${origin}/sign-up?error=Password must be at least 8 characters.`, { status: 303 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/api/auth/callback` },
  });

  if (error) {
    return NextResponse.redirect(`${origin}/sign-up?error=${encodeURIComponent(error.message)}`, { status: 303 });
  }

  return NextResponse.redirect(
    `${origin}/sign-up?success=${encodeURIComponent('Check your email to confirm your account.')}`,
    { status: 303 }
  );
}
