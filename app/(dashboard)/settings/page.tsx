'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, ExternalLink, Loader2, Users, Plug, Bell } from 'lucide-react';
import type { Profile, UserRole } from '@/types';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  marketing_manager: 'Marketing Manager',
  content_creator: 'Content Creator',
  sales_rep: 'Sales Rep',
  viewer: 'Viewer',
};

function SettingsContent() {
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [sfConnected, setSfConnected] = useState(false);

  useEffect(() => {
    fetch('/api/auth/profile')
      .then((r) => r.json())
      .then((d: { profile: Profile }) => {
        setProfile(d.profile);
        setFullName(d.profile.full_name ?? '');
        setSfConnected(!!d.profile.salesforce_access_token);
      });

    // Handle SF callback params
    const sf = searchParams.get('sf');
    if (sf === 'connected') toast.success('Salesforce connected successfully!');
    if (sf === 'error') toast.error(`Salesforce error: ${searchParams.get('message')}`);
  }, [searchParams]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName }),
      });
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : (profile?.email?.[0] ?? 'U').toUpperCase();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Manage your profile, integrations, and notifications</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Profile
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-1.5">
            <Plug className="w-3.5 h-3.5" /> Integrations
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5" /> Notifications
          </TabsTrigger>
        </TabsList>

        {/* Profile tab */}
        <TabsContent value="profile" className="space-y-6 pt-4">
          {/* Avatar + name */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Your Profile</h2>
            <div className="flex items-center gap-4 mb-5">
              <Avatar className="w-16 h-16">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-slate-900">
                  {profile?.full_name ?? profile?.email ?? 'Loading…'}
                </p>
                <p className="text-sm text-slate-500">{profile?.email}</p>
                <span className="inline-flex mt-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium capitalize">
                  {profile?.role?.replace('_', ' ') ?? ''}
                </span>
              </div>
            </div>
            <form onSubmit={saveProfile} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Display Name</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={profile?.email ?? ''} disabled className="bg-slate-50" />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Input
                  value={ROLE_LABELS[profile?.role ?? 'viewer']}
                  disabled
                  className="bg-slate-50"
                />
                <p className="text-xs text-slate-400">Contact an admin to change your role</p>
              </div>
              <Button
                type="submit"
                disabled={savingProfile}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {savingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {savingProfile ? 'Saving…' : 'Save Changes'}
              </Button>
            </form>
          </div>
        </TabsContent>

        {/* Integrations tab */}
        <TabsContent value="integrations" className="space-y-4 pt-4">
          {/* Salesforce */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  SF
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Salesforce CRM</h3>
                  <p className="text-sm text-slate-500">
                    Link shares to opportunities and log collateral activities
                  </p>
                </div>
              </div>
              {sfConnected ? (
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium flex-shrink-0">
                  <Check className="w-4 h-4" /> Connected
                </div>
              ) : (
                <a href="/api/salesforce/connect">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0">
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Connect Salesforce
                  </Button>
                </a>
              )}
            </div>
            {sfConnected && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-3">Salesforce is connected. Token stored securely.</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Test Connection
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={async () => {
                      await fetch('/api/auth/profile', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          salesforce_access_token: null,
                          salesforce_refresh_token: null,
                          salesforce_instance_url: null,
                        }),
                      });
                      setSfConnected(false);
                      toast.success('Salesforce disconnected');
                    }}
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Other integrations (placeholders) */}
          {[
            { name: 'Resend Email', desc: 'Transactional notifications for link opens and weekly digests', color: 'bg-slate-800', label: 'R' },
            { name: 'Cloudflare Workers', desc: 'Advanced link tracking with geo and device data', color: 'bg-orange-500', label: 'CF' },
          ].map(({ name, desc, color, label }) => (
            <div key={name} className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                    {label}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{name}</h3>
                    <p className="text-sm text-slate-500">{desc}</p>
                  </div>
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0">Via .env</span>
              </div>
            </div>
          ))}
        </TabsContent>

        {/* Notifications tab */}
        <TabsContent value="notifications" className="pt-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-slate-900">Email Notifications</h2>
            <p className="text-sm text-slate-500">
              Manage which events trigger email notifications via Resend.
            </p>
            {[
              { label: 'Link opened', desc: 'Get notified when a recipient opens your shared link' },
              { label: 'Asset expiring soon', desc: 'Reminder 7 days before an asset expires' },
              { label: 'New insight shared', desc: 'When a team member posts a win story or learning' },
              { label: 'Weekly digest', desc: 'AI-generated summary of the week\'s content performance' },
            ].map(({ label, desc }) => (
              <div key={label} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-800">{label}</p>
                  <p className="text-xs text-slate-400">{desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
                </label>
              </div>
            ))}
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" size="sm">
              Save Preferences
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="animate-pulse">Loading settings…</div>}>
      <SettingsContent />
    </Suspense>
  );
}
