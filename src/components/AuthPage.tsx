import React, { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

interface AuthPageProps {
  onAuthSuccess: (token: string, userData: AuthUserData) => void;
}

export interface AuthUserData {
  user: { id: string; name: string; email: string };
  workspace: { id: string; name: string; slug: string; plan: string; eventQuota: number; eventsUsed: number; members: any[] };
  projects: Array<{ id: string; name: string; domain: string; publicKey: string; secretKey: string; status: string }>;
  apiKeys: Array<{ id: string; name: string; key: string; type: string }>;
}

type AuthMode = 'login' | 'register';

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [websiteName, setWebsiteName] = useState('');
  const [websiteDomain, setWebsiteDomain] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    if (mode === 'register' && !name) {
      setError('Please enter your full name.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === 'register' ? '/api/v1/auth/register' : '/api/v1/auth/login';
      const body =
        mode === 'register'
          ? { name, email, password, websiteName, websiteDomain }
          : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }

      onAuthSuccess(data.token, {
        user: data.user,
        workspace: data.workspace,
        projects: data.projects,
        apiKeys: data.apiKeys,
      });
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex">
      {/* Left panel — branding image */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden border-r border-slate-800 bg-gradient-to-b from-[#f4f7fc] to-[#cacfd5]">
        {/* Whole image stays visible at any panel shape; its top/bottom edges fade into the panel colour */}
        <img
          src="/brand.jpg"
          alt="PulseTrack — Website monitoring center and dashboard"
          className="absolute inset-0 m-auto max-w-full max-h-full w-auto h-auto"
          style={{ WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 5%, #000 95%, transparent)', maskImage: 'linear-gradient(to bottom, transparent, #000 5%, #000 95%, transparent)' }}
          fetchPriority="high"
        />
      </div>

      {/* Right panel — auth form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          {/* Logo + brand banner (the side panel is desktop-only) */}
          <div className="lg:hidden space-y-4 mb-6">
            <img src="/logo-dark.png" alt="PulseTrack" width={160} height={34} className="h-8 w-auto" />
            <img src="/brand.jpg" alt="" aria-hidden className="w-full h-32 sm:h-44 rounded-xl object-cover object-[50%_72%] border border-slate-800" loading="lazy" />
          </div>

          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold text-white">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {mode === 'login'
                ? 'Sign in to your PulseTrack dashboard.'
                : 'Start monitoring your website in under 2 minutes.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Rivera"
                  autoComplete="name"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'At least 8 characters' : '••••••••'}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  required
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div className="space-y-4 pt-1 border-t border-slate-800">
                <p className="text-xs text-slate-500 pt-2">Your first project (you can add more later)</p>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Website Name</label>
                  <input
                    type="text"
                    value={websiteName}
                    onChange={(e) => setWebsiteName(e.target.value)}
                    placeholder="My Awesome App"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Website Domain</label>
                  <input
                    type="text"
                    value={websiteDomain}
                    onChange={(e) => setWebsiteDomain(e.target.value)}
                    placeholder="myapp.com"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="px-3.5 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{mode === 'register' ? 'Creating account…' : 'Signing in…'}</span>
                </>
              ) : (
                <span>{mode === 'register' ? 'Create account & get your script' : 'Sign in to dashboard'}</span>
              )}
            </button>
          </form>

          {/* Toggle mode */}
          <p className="text-center text-sm text-slate-500">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => { setMode('register'); setError(''); }}
                  className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                >
                  Sign up free
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('login'); setError(''); }}
                  className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                >
                  Sign in
                </button>
              </>
            )}
          </p>

          <p className="text-center text-xs text-slate-700">
            By continuing you agree to the Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};
