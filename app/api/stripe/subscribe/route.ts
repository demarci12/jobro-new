import { createClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key, { apiVersion: '2026-05-27.dahlia' });
}

export async function POST(request: NextRequest) {
  const { origin } = request.nextUrl;
  const form = await request.formData();
  const priceId = form.get('priceId') as string;

  if (!priceId) {
    return NextResponse.redirect(`${origin}/pricing?error=Invalid plan.`, { status: 303 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?next=/pricing`, { status: 303 });
  }

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email ?? undefined,
    metadata: { user_id: user.id },
    success_url: `${origin}/dashboard?subscribed=1`,
    cancel_url: `${origin}/pricing`,
  });

  return NextResponse.redirect(session.url!, { status: 303 });
}
