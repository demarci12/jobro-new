import { google } from 'googleapis';
import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${origin}/api/auth/google/callback`,
  );

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set('gcal_oauth_state', state, { httpOnly: true, sameSite: 'lax', maxAge: 300, path: '/' });

  const url = oauth2.generateAuthUrl({
    access_type: 'offline', prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar'],
    state,
  });

  return NextResponse.redirect(url);
}
