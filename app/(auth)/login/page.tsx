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
    <div className="w-full">
      {/* Card */}
      <div className="rounded-2xl p-8 shadow-raised"
           style={{ background: 'oklch(1 0 0)', border: '1px solid oklch(0.888 0.010 78 / 0.5)' }}>
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
            <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold" style={{ color: 'var(--foreground)' }}>HOABL CORE</h1>
            <p className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>Marketing Asset Intelligence Platform</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--foreground)', letterSpacing: '-0.025em' }}>
          Welcome back
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>
          Sign in to access HOABL&apos;s marketing intelligence platform
        </p>

        {/* Mode toggle */}
        <div className="flex rounded-xl p-1 mb-6" style={{ background: 'var(--muted)' }}>
          <button
            onClick={() => { setMode('signin'); setMagicSent(false); }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-all ${
              mode === 'signin'
                ? 'bg-white shadow-sm'
                : 'hover:opacity-70'
            }`}
            style={{ color: mode === 'signin' ? 'var(--foreground)' : 'var(--muted-foreground)' }}
          >
            Password
          </button>
          <button
            onClick={() => { setMode('magic_link'); setMagicSent(false); }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-all ${
              mode === 'magic_link'
                ? 'bg-white shadow-sm'
                : 'hover:opacity-70'
            }`}
            style={{ color: mode === 'magic_link' ? 'var(--foreground)' : 'var(--muted-foreground)' }}
          >
            Magic Link
          </button>
        </div>

        {/* Magic link sent state */}
        {magicSent ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                 style={{ background: 'oklch(0.455 0.215 268 / 0.1)' }}>
              <Mail className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            </div>
            <h3 className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Check your email</h3>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              We sent a magic link to <strong style={{ color: 'var(--foreground)' }}>{email}</strong>. Click it to sign in.
            </p>
            <button
              onClick={() => setMagicSent(false)}
              className="mt-4 text-sm underline-offset-4 hover:underline"
              style={{ color: 'var(--primary)' }}
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
              className="w-full text-white font-semibold"
              style={{ background: 'var(--primary)' }}
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
              className="w-full text-white font-semibold"
              style={{ background: 'var(--primary)' }}
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

      <p className="text-center text-xs mt-5" style={{ color: 'rgba(255,255,255,0.25)' }}>
        HOABL CORE — For authorized marketing team members only
      </p>
    </div>
  );
}
