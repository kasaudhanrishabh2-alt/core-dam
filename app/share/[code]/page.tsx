'use client';

import { use, useState, useEffect, useRef } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Film,
  Download,
  Clock,
  Building2,
  AlertTriangle,
  Loader2,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ContentTypeBadge } from '@/components/shared/ContentTypeBadge';
import type { ShareLink } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface SharePageProps {
  params: Promise<{ code: string }>;
}

interface ShareAsset {
  id: string;
  name: string;
  description: string | null;
  file_url: string;
  file_type: string;
  mime_type: string | null;
  content_type: string | null;
  tags: Record<string, unknown>;
}

// Omit the base ShareLink.asset type and override with the richer public shape
type LinkWithAsset = Omit<ShareLink, 'asset'> & { asset: ShareAsset | null };

export default function SharePage({ params }: SharePageProps) {
  const { code } = use(params);
  const [link, setLink] = useState<LinkWithAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailGate, setEmailGate] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const sessionId = useRef(uuidv4());
  const startTime = useRef(Date.now());

  useEffect(() => {
    fetch(`/api/share/${code}`)
      .then((r) => r.json())
      .then((d: { link?: LinkWithAsset; error?: string }) => {
        if (d.error) {
          setError(d.error);
        } else if (d.link) {
          setLink(d.link);
          if (d.link.require_email_gate) {
            setEmailGate(true);
          } else {
            logEvent('opened');
          }
        }
      })
      .finally(() => setLoading(false));

    // Track time on page unload
    return () => {
      const seconds = Math.round((Date.now() - startTime.current) / 1000);
      if (seconds > 2) {
        navigator.sendBeacon(
          `/api/links/${code}/events`,
          JSON.stringify({
            event_type: 'page_viewed',
            session_id: sessionId.current,
            duration_seconds: seconds,
          })
        );
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function logEvent(eventType: string, extra?: Record<string, unknown>) {
    try {
      await fetch(`/api/links/${link?.id ?? code}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: eventType,
          session_id: sessionId.current,
          ...extra,
        }),
      });
    } catch {
      // Non-blocking — tracking errors shouldn't break the viewer
    }
  }

  async function handleEmailGate(e: React.FormEvent) {
    e.preventDefault();
    if (!emailInput) return;
    setEmailSubmitted(true);
    await logEvent('email_gated', { referer: emailInput });
    await logEvent('opened');
    setEmailGate(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Link unavailable</h1>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!link || !link.asset) return null;

  const asset = link.asset;
  const isImage = asset.mime_type?.startsWith('image/');
  const isVideo = asset.mime_type?.startsWith('video/');
  const isPdf = asset.file_type === 'pdf';

  // Email gate
  if (emailGate && !emailSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6 text-indigo-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Enter your email to view</h2>
          <p className="text-slate-500 text-sm mb-5">
            Please provide your email to access <strong>{asset.name}</strong>
          </p>
          <form onSubmit={handleEmailGate} className="space-y-3 text-left">
            <div className="space-y-1.5">
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="you@company.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              View Asset
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">C</span>
          </div>
          <div className="min-w-0">
            <h1 className="font-semibold text-slate-900 text-sm truncate">{asset.name}</h1>
            <div className="flex items-center gap-2">
              <ContentTypeBadge contentType={asset.content_type as never} />
              {link.recipient_company && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {link.recipient_company}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {link.expires_at && (
            <span className="text-xs text-amber-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Expires {new Date(link.expires_at).toLocaleDateString()}
            </span>
          )}
          <a
            href={asset.file_url}
            download
            onClick={() => logEvent('downloaded')}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* Content viewer */}
      <main className="flex-1 flex flex-col items-center p-4 lg:p-8">
        <div className="w-full max-w-4xl">
          {isPdf ? (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <iframe
                src={`${asset.file_url}#toolbar=0&navpanes=0`}
                className="w-full"
                style={{ height: '80vh' }}
                title={asset.name}
                onLoad={() => logEvent('page_viewed', { page_number: 1 })}
              />
            </div>
          ) : isImage ? (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset.file_url}
                alt={asset.name}
                className="max-w-full max-h-[75vh] mx-auto object-contain"
              />
            </div>
          ) : isVideo ? (
            <div className="bg-black rounded-xl overflow-hidden shadow-sm">
              <video
                controls
                className="w-full max-h-[75vh]"
                onPlay={() => logEvent('page_viewed')}
              >
                <source src={asset.file_url} type={asset.mime_type ?? 'video/mp4'} />
                Your browser does not support video playback.
              </video>
            </div>
          ) : (
            // Generic file viewer (PPTX, DOCX, XLSX)
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-10 h-10 text-slate-300" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">{asset.name}</h2>
              {asset.description && (
                <p className="text-slate-500 mb-6 max-w-md mx-auto">{asset.description}</p>
              )}
              <a
                href={asset.file_url}
                download
                onClick={() => logEvent('downloaded')}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                <Download className="w-4 h-4" />
                Download {asset.file_type.toUpperCase()}
              </a>
            </div>
          )}

          {/* Asset description */}
          {asset.description && (isPdf || isImage || isVideo) && (
            <div className="mt-4 bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-sm text-slate-600 leading-relaxed">{asset.description}</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-slate-400">
        Powered by{' '}
        <span className="font-semibold text-slate-500">CORE</span> — Collateral Operations & Revenue Engine
      </footer>
    </div>
  );
}
