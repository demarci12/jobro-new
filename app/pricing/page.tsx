import { Check } from 'lucide-react';

const PLANS = [
  {
    name: 'Starter',
    price: 29,
    description: 'Perfect for solo operators and small crews.',
    features: [
      'Up to 3 workers',
      'Unlimited bookings',
      'Quotes & invoices',
      'Google Calendar sync',
      'PDF invoice export',
      'Email support',
    ],
    cta: 'Get started',
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
    highlighted: false,
  },
  {
    name: 'Pro',
    price: 79,
    description: 'For growing teams that need advanced features.',
    features: [
      'Unlimited workers',
      'Everything in Starter',
      'Stripe payment links',
      'Team roles & permissions',
      'Priority support',
      'Early access to new features',
    ],
    cta: 'Start free trial',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    highlighted: true,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-20 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <a href="/" className="inline-flex items-center gap-2 text-xl font-extrabold no-underline text-slate-900 tracking-tight mb-8">
            <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm font-black">J</span>
            Jobro
          </a>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-4">Simple, honest pricing</h1>
          <p className="text-lg text-slate-500 max-w-md mx-auto">Start for free. Upgrade when you need more.</p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-8 flex flex-col ${
                plan.highlighted
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-200'
                  : 'bg-white border border-slate-200'
              }`}
            >
              <div className="mb-6">
                <h2 className={`text-lg font-bold mb-1 ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}>
                  {plan.name}
                </h2>
                <p className={`text-sm mb-4 ${plan.highlighted ? 'text-blue-100' : 'text-slate-500'}`}>
                  {plan.description}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-extrabold tracking-tight ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}>
                    ${plan.price}
                  </span>
                  <span className={`text-sm ${plan.highlighted ? 'text-blue-200' : 'text-slate-400'}`}>/month</span>
                </div>
              </div>

              <ul className="flex flex-col gap-2.5 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-sm">
                    <Check className={`w-4 h-4 shrink-0 ${plan.highlighted ? 'text-blue-200' : 'text-blue-600'}`} />
                    <span className={plan.highlighted ? 'text-blue-50' : 'text-slate-600'}>{feature}</span>
                  </li>
                ))}
              </ul>

              <form method="POST" action="/api/stripe/subscribe">
                <input type="hidden" name="priceId" value={plan.priceId ?? ''} />
                <button
                  type="submit"
                  className={`w-full h-11 rounded-xl text-sm font-semibold transition-all ${
                    plan.highlighted
                      ? 'bg-white text-blue-600 hover:bg-blue-50'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {plan.cta}
                </button>
              </form>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-slate-400 mt-10">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  );
}
