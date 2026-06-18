const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL ?? 'Jobro <noreply@jobro.app>';

interface BookingEmailData {
  clientName: string;
  clientEmail: string;
  workerName: string;
  serviceName?: string;
  startTime: string;
  endTime: string;
  address?: string;
  bookingId: string;
}

export async function sendBookingConfirmation(data: BookingEmailData): Promise<void> {
  if (!RESEND_API_KEY) return; // silently skip if not configured

  const date = new Date(data.startTime).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const start = new Date(data.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const end   = new Date(data.endTime).toLocaleTimeString('en-GB',   { hour: '2-digit', minute: '2-digit' });

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 32px 16px; }
  .card { background: #fff; border-radius: 12px; max-width: 480px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; }
  .logo { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 24px; }
  .logo span { background: #2563eb; color: #fff; border-radius: 6px; padding: 2px 8px; margin-right: 6px; }
  h1 { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 8px; }
  p { color: #64748b; font-size: 15px; line-height: 1.6; margin: 0 0 20px; }
  .detail { background: #f8fafc; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px; }
  .row { display: flex; gap: 12px; margin-bottom: 8px; font-size: 14px; }
  .row:last-child { margin-bottom: 0; }
  .label { color: #94a3b8; width: 64px; shrink: 0; }
  .value { color: #0f172a; font-weight: 500; }
  .footer { margin-top: 24px; font-size: 12px; color: #94a3b8; text-align: center; }
</style></head>
<body>
  <div class="card">
    <div class="logo"><span>J</span>Jobro</div>
    <h1>Booking confirmed ✓</h1>
    <p>Hi ${data.clientName}, your booking has been confirmed. Here are the details:</p>
    <div class="detail">
      <div class="row"><span class="label">Date</span><span class="value">${date}</span></div>
      <div class="row"><span class="label">Time</span><span class="value">${start} – ${end}</span></div>
      <div class="row"><span class="label">Service</span><span class="value">${data.serviceName ?? 'Service'}</span></div>
      <div class="row"><span class="label">Worker</span><span class="value">${data.workerName}</span></div>
      ${data.address ? `<div class="row"><span class="label">Address</span><span class="value">${data.address}</span></div>` : ''}
    </div>
    <p>If you need to reschedule or have any questions, please contact us directly.</p>
    <div class="footer">Powered by Jobro</div>
  </div>
</body>
</html>`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [data.clientEmail],
      subject: `Booking confirmed — ${date} at ${start}`,
      html,
    }),
  });
}

export async function sendBookingReminder(data: BookingEmailData): Promise<void> {
  if (!RESEND_API_KEY) return;

  const date = new Date(data.startTime).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const start = new Date(data.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [data.clientEmail],
      subject: `Reminder: Your booking tomorrow at ${start}`,
      html: `<p>Hi ${data.clientName},</p><p>Just a reminder that your booking is tomorrow, <strong>${date} at ${start}</strong> with ${data.workerName}.</p>${data.address ? `<p>Address: ${data.address}</p>` : ''}<p>See you then!</p>`,
    }),
  });
}
