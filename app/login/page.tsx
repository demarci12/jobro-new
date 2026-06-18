import { Suspense } from 'react';

function LoginContent({ searchParams }: { searchParams: Record<string, string> }) {
  const error = searchParams.error;
  const next = searchParams.next ?? '/calendar';
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="bg-white border border-slate-200 rounded-2xl p-10 w-full max-w-sm text-center shadow-sm">
        <a href="/" className="inline-flex items-center gap-2.5 text-xl font-extrabold no-underline text-slate-900 tracking-tight mb-7">
          <span className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center text-lg font-black">J</span>
          Jobro
        </a>
        <h1 className="text-2xl font-extrabold tracking-tight mb-2">Welcome back</h1>
        <p className="text-sm text-slate-500 leading-relaxed mb-7">Sign in to manage bookings, clients, and workers.</p>

        {error && (
          <div className="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-5 text-left">
            {error}
          </div>
        )}

        <form method="POST" action="/api/auth/signin">
          <input type="hidden" name="provider" value="google" />
          <input type="hidden" name="next" value={next} />
          <button
            type="submit"
            className="flex items-center justify-center gap-2.5 w-full h-12 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"/>
              <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33Z"/>
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"/>
            </svg>
            Continue with Google
          </button>
        </form>

        <p className="mt-6 text-xs text-slate-400">
          <a href="/" className="hover:text-slate-600 transition-colors no-underline">← Back to homepage</a>
        </p>
      </div>
    </div>
  );
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <Suspense>
      <LoginContent searchParams={sp} />
    </Suspense>
  );
}
