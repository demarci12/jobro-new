import { Suspense } from 'react';

function SignUpContent({ searchParams }: { searchParams: Record<string, string> }) {
  const error = searchParams.error;
  const success = searchParams.success;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="bg-white border border-slate-200 rounded-2xl p-10 w-full max-w-sm shadow-sm">
        <a href="/" className="inline-flex items-center gap-2.5 text-xl font-extrabold no-underline text-slate-900 tracking-tight mb-7">
          <span className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center text-lg font-black">J</span>
          Jobro
        </a>
        <h1 className="text-2xl font-extrabold tracking-tight mb-1">Create an account</h1>
        <p className="text-sm text-slate-500 leading-relaxed mb-7">Start managing your field service business.</p>

        {error && (
          <div className="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-5">
            {error}
          </div>
        )}
        {success && (
          <div className="px-3.5 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 mb-5">
            {success}
          </div>
        )}

        <form method="POST" action="/api/auth/signup" className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="At least 8 characters"
              minLength={8}
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            />
          </div>
          <button
            type="submit"
            className="h-10 w-full rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors mt-1"
          >
            Create account
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
          <div className="relative flex justify-center text-xs text-slate-400 bg-white px-2">or</div>
        </div>

        <form method="POST" action="/api/auth/signin">
          <input type="hidden" name="provider" value="google" />
          <button
            type="submit"
            className="flex items-center justify-center gap-2.5 w-full h-10 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"/>
              <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33Z"/>
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"/>
            </svg>
            Continue with Google
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 font-medium hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  );
}

export default async function SignUpPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <Suspense>
      <SignUpContent searchParams={sp} />
    </Suspense>
  );
}
