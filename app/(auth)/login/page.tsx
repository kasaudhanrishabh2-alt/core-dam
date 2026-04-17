'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Zap, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type Mode = 'signin' | 'magic_link';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success('Signed in successfully');
    router.push('/assets');
    router.refresh();
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/assets`,
      },
    });

    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    setMagicSent(true);
  }

  return (
    <div className="w-full max-w-md">
      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 p-8">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">CORE</h1>
            <p className="text-xs text-slate-500">Collateral Operations & Revenue Engine</p>
          </div>
        </div>

        <h2 className="text-2xl font-semibold text-slate-900 mb-1">
          Welcome back
        </h2>
        <p className="text-slate-500 text-sm mb-6">
          Sign in to access your marketing asset library
        </p>

        {/* Mode toggle */}
        <div className="flex bg-slate-100 rounded-lg p-1 mb-6">
          <button
            onClick={() => { setMode('signin'); setMagicSent(false); }}
            className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${
              mode === 'signin'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Password
          </button>
          <button
            onClick={() => { setMode('magic_link'); setMagicSent(false); }}
            className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${
              mode === 'magic_link'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Magic Link
          </button>
        </div>

        {/* Magic link sent state */}
        {magicSent ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Mail className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Check your email</h3>
            <p className="text-sm text-slate-500">
              We sent a magic link to <strong>{email}</strong>. Click it to sign in.
            </p>
            <button
              onClick={() => setMagicSent(false)}
              className="mt-4 text-sm text-indigo-600 hover:underline"
            >
              Use a different email
            </button>
          </div>
        ) : mode === 'signin' ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="magic-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="magic-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Sending…' : 'Send magic link'}
            </Button>
          </form>
        )}
      </div>

      <p className="text-center text-slate-400 text-xs mt-6">
        CORE DAM — For authorized marketing team members only
      </p>
    </div>
  );
}
