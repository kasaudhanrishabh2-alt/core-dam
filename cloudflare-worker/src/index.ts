/**
 * CORE DAM — Cloudflare Worker
 * Deploy at: track.yourdomain.com
 *
 * Handles short-link redirects with geo + device tracking.
 * Logs open events to Supabase, then redirects to the share viewer.
 */

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  APP_URL: string;
}

interface CloudflareRequest extends Request {
  cf?: {
    country?: string;
    city?: string;
    timezone?: string;
  };
}

interface ShareLink {
  id: string;
  is_active: boolean;
  expires_at: string | null;
  total_opens: number;
  require_email_gate: boolean;
}

function getDeviceType(ua: string): string {
  if (/mobile/i.test(ua)) return 'mobile';
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  return 'desktop';
}

function getBrowser(ua: string): string {
  if (/chrome/i.test(ua) && !/edg/i.test(ua)) return 'Chrome';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  if (/edg/i.test(ua)) return 'Edge';
  return 'Other';
}

export default {
  async fetch(request: CloudflareRequest, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const shortCode = url.pathname.slice(1);

    if (!shortCode || shortCode.includes('/')) {
      return new Response('Not found', { status: 404 });
    }

    const headers = {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };

    // Look up the link
    const linkRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/share_links?short_code=eq.${encodeURIComponent(shortCode)}&select=id,is_active,expires_at,total_opens,require_email_gate`,
      { headers }
    );

    if (!linkRes.ok) {
      return new Response('Service unavailable', { status: 503 });
    }

    const links: ShareLink[] = await linkRes.json();
    const link = links[0];

    if (!link) {
      return new Response('Link not found', { status: 404 });
    }

    if (!link.is_active) {
      return new Response('This link has been deactivated', { status: 410 });
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return new Response('This link has expired', { status: 410 });
    }

    const ua = request.headers.get('user-agent') ?? '';
    const sessionId = crypto.randomUUID();

    // Log open event (fire and forget)
    fetch(`${env.SUPABASE_URL}/rest/v1/link_events`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        link_id: link.id,
        event_type: 'opened',
        session_id: sessionId,
        ip_country: request.cf?.country ?? null,
        ip_city: request.cf?.city ?? null,
        device_type: getDeviceType(ua),
        browser: getBrowser(ua),
        referer: request.headers.get('referer') ?? null,
      }),
    }).catch(() => {}); // Non-blocking

    // Increment open count (fire and forget)
    fetch(`${env.SUPABASE_URL}/rest/v1/share_links?id=eq.${link.id}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ total_opens: link.total_opens + 1 }),
    }).catch(() => {});

    // Redirect to the Next.js share viewer
    return Response.redirect(`${env.APP_URL}/share/${shortCode}`, 302);
  },
};
