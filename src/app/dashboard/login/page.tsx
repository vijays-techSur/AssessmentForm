'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Dashboard Login — open to all users with a valid email.
// Route: /dashboard/login
// POST to /api/auth/login with { email }; stores JWT in localStorage "dashboard_token" on success.
export default function DashboardLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data?.error?.code === 'INVALID_EMAIL_FORMAT') {
          setError('Please enter a valid email address.');
        } else {
          setError('Login failed. Please try again.');
        }
        return;
      }

      // Store dashboard JWT in localStorage
      localStorage.setItem('dashboard_token', data.token);
      router.replace('/dashboard');
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 w-full max-w-md">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">System Owner Login</h1>
        <p className="text-gray-500 text-sm mb-6">
          Enter your email address to access the response summary and analytics dashboard.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              System Owner Email *
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="you@company.com"
              className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                error ? 'border-red-400' : 'border-gray-300'
              }`}
            />
            {error && (
              <p className="mt-1 text-sm text-red-600" role="alert" aria-live="polite">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full bg-blue-600 text-white rounded-md py-2 px-4 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in…' : 'Access Dashboard'}
          </button>
        </form>

        <p className="mt-6 text-xs text-gray-400 text-center">
          <a href="/" className="text-blue-500 underline">
            ← Back to Assessment Form
          </a>
        </p>
      </div>
    </div>
  );
}
