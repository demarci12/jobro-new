import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function getAuthenticatedCalendarClient() {
  // Lock the token row to prevent concurrent refresh races
  const { data: token, error } = await supabaseAdmin
    .from('oauth_tokens')
    .select('*')
    .eq('provider', 'google')
    .eq('status', 'active')
    .single();

  if (error || !token) throw new Error('No active Google OAuth token found');

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );

  oauth2.setCredentials({
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expiry_date: new Date(token.expires_at).getTime(),
  });

  // Refresh if expired (with 60s buffer)
  const expiresAt = new Date(token.expires_at).getTime();
  if (Date.now() > expiresAt - 60_000) {
    try {
      const { credentials } = await oauth2.refreshAccessToken();

      // Re-read to handle TOCTOU: another request may have already refreshed
      const { data: freshToken } = await supabaseAdmin
        .from('oauth_tokens')
        .select('access_token, refresh_token, expires_at')
        .eq('id', token.id)
        .single();

      const freshExpiry = freshToken ? new Date(freshToken.expires_at).getTime() : 0;
      if (freshExpiry > Date.now()) {
        // Another request already refreshed; use the fresh token from DB
        oauth2.setCredentials({
          access_token: freshToken!.access_token,
          refresh_token: freshToken!.refresh_token,
          expiry_date: freshExpiry,
        });
      } else {
        await supabaseAdmin.from('oauth_tokens').update({
          access_token: credentials.access_token!,
          expires_at: new Date(credentials.expiry_date!).toISOString(),
        }).eq('id', token.id);
        oauth2.setCredentials(credentials);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('invalid_grant')) {
        await supabaseAdmin.from('oauth_tokens').update({ status: 'revoked' }).eq('id', token.id);
        throw new Error('GOOGLE_TOKEN_REVOKED');
      }
      throw err;
    }
  }

  return google.calendar({ version: 'v3', auth: oauth2 });
}

export interface CalendarEventParams {
  summary: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  attendeeEmails: string[];
  workerCalendarId: string;
}

export async function createCalendarEvent(params: CalendarEventParams) {
  const calendar = await getAuthenticatedCalendarClient();

  const res = await withRetry(() =>
    calendar.events.insert({
      calendarId: params.workerCalendarId,
      sendUpdates: 'all',
      requestBody: {
        summary: params.summary,
        description: params.description,
        location: params.location,
        start: { dateTime: params.startTime },
        end: { dateTime: params.endTime },
        attendees: params.attendeeEmails.map(email => ({ email })),
        conferenceData: { createRequest: { requestId: crypto.randomUUID() } },
      },
      conferenceDataVersion: 1,
    })
  );

  return {
    googleEventId: res.data.id!,
    meetLink: res.data.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri ?? null,
  };
}

export async function updateCalendarEvent(
  googleEventId: string,
  workerCalendarId: string,
  params: Partial<CalendarEventParams>,
) {
  const calendar = await getAuthenticatedCalendarClient();

  await withRetry(() =>
    calendar.events.patch({
      calendarId: workerCalendarId,
      eventId: googleEventId,
      sendUpdates: 'all',
      requestBody: {
        ...(params.summary && { summary: params.summary }),
        ...(params.startTime && { start: { dateTime: params.startTime } }),
        ...(params.endTime && { end: { dateTime: params.endTime } }),
        ...(params.location && { location: params.location }),
      },
    })
  );
}

export async function cancelCalendarEvent(googleEventId: string, workerCalendarId: string) {
  const calendar = await getAuthenticatedCalendarClient();

  await withRetry(() =>
    calendar.events.delete({
      calendarId: workerCalendarId,
      eventId: googleEventId,
      sendUpdates: 'all',
    })
  );
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const status = (err as { code?: number }).code;
      if (status === 429 && i < attempts - 1) {
        await new Promise(r => setTimeout(r, (i + 1) * 1000));
        continue;
      }
      throw err;
    }
  }
  throw new Error('unreachable');
}
