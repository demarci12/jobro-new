import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key, { apiVersion: '2026-05-27.dahlia' });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { invoice_id } = body as Record<string, unknown>;
  if (typeof invoice_id !== 'string') return NextResponse.json({ error: 'invoice_id required' }, { status: 400 });

  const { data: inv } = await createAdminClient()
    .from('invoices')
    .select('id, total, status, line_items, bookings(contacts(name, email))')
    .eq('id', invoice_id)
    .single();

  if (!inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  if (inv.status === 'paid' || inv.status === 'void') {
    return NextResponse.json({ error: `Invoice is ${inv.status}` }, { status: 422 });
  }

  const stripe = getStripe();
  const origin = request.nextUrl.origin;
  const contact = (inv.bookings as any)?.contacts;

  const lineItems: Array<{ description: string; qty: number; unit_price: number }> = inv.line_items ?? [];

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems.length > 0
      ? lineItems.map(li => ({
          price_data: {
            currency: 'usd',
            product_data: { name: li.description || 'Service' },
            unit_amount: Math.round(li.unit_price * 100),
          },
          quantity: li.qty,
        }))
      : [{
          price_data: {
            currency: 'usd',
            product_data: { name: 'Invoice payment' },
            unit_amount: Math.round(Number(inv.total) * 100),
          },
          quantity: 1,
        }],
    customer_email: contact?.email ?? undefined,
    metadata: { invoice_id: inv.id },
    success_url: `${origin}/invoices/${inv.id}?paid=1`,
    cancel_url: `${origin}/invoices/${inv.id}`,
  });

  return NextResponse.json({ url: session.url });
}
