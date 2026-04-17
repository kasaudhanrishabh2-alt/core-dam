import type {
  SalesforceOpportunity,
  SalesforceQueryResult,
  ShareLink,
} from '@/types';

// ── OAuth ────────────────────────────────────────────────────

export function getSalesforceAuthUrl(): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.SALESFORCE_CLIENT_ID!,
    redirect_uri: process.env.SALESFORCE_REDIRECT_URI!,
    scope: 'api refresh_token offline_access',
  });
  return `https://login.salesforce.com/services/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  instance_url: string;
}> {
  const res = await fetch('https://login.salesforce.com/services/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: process.env.SALESFORCE_CLIENT_ID!,
      client_secret: process.env.SALESFORCE_CLIENT_SECRET!,
      redirect_uri: process.env.SALESFORCE_REDIRECT_URI!,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Salesforce token exchange failed: ${err}`);
  }

  return res.json();
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; instance_url: string }> {
  const res = await fetch('https://login.salesforce.com/services/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.SALESFORCE_CLIENT_ID!,
      client_secret: process.env.SALESFORCE_CLIENT_SECRET!,
    }),
  });

  if (!res.ok) {
    throw new Error('Failed to refresh Salesforce token');
  }

  return res.json();
}

// ── Opportunities ────────────────────────────────────────────

export async function searchOpportunities(
  accessToken: string,
  instanceUrl: string,
  query: string
): Promise<SalesforceOpportunity[]> {
  // Sanitize query to prevent SOQL injection
  const safe = query.replace(/['\\]/g, '');
  const soql = `SELECT Id, Name, StageName, Amount, CloseDate, Account.Name
                FROM Opportunity
                WHERE Name LIKE '%${safe}%'
                AND IsClosed = false
                ORDER BY LastModifiedDate DESC
                LIMIT 10`;

  const res = await fetch(
    `${instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(soql)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    throw new Error(`Salesforce query failed: ${res.statusText}`);
  }

  const result: SalesforceQueryResult<SalesforceOpportunity> = await res.json();
  return result.records;
}

// ── Activity write-back ──────────────────────────────────────

export interface EngagementSummary {
  assetName: string;
  contentType: string;
  timesOpened: number;
  totalSeconds: number;
  score: number;
}

export async function writeCollateralActivity(
  accessToken: string,
  instanceUrl: string,
  linkData: Pick<
    ShareLink,
    | 'salesforce_opportunity_id'
    | 'recipient_name'
    | 'recipient_email'
    | 'recipient_company'
  >,
  engagementData: EngagementSummary
): Promise<string> {
  const activity = {
    WhatId: linkData.salesforce_opportunity_id,
    Subject: `Collateral Shared: ${engagementData.assetName}`,
    Description: [
      `Collateral shared via CORE DAM`,
      `Asset: ${engagementData.assetName}`,
      `Type: ${engagementData.contentType}`,
      `Recipient: ${linkData.recipient_name ?? 'Unknown'} (${linkData.recipient_email ?? 'no email'})`,
      `Company: ${linkData.recipient_company ?? 'Unknown'}`,
      `Times Opened: ${engagementData.timesOpened}`,
      `Total Engagement: ${Math.round(engagementData.totalSeconds / 60)} minutes`,
      `Engagement Score: ${engagementData.score}/100`,
    ].join('\n'),
    ActivityDate: new Date().toISOString().split('T')[0],
    Status: 'Completed',
    Type: 'Other',
  };

  const res = await fetch(
    `${instanceUrl}/services/data/v59.0/sobjects/Task`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(activity),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to write SF activity: ${err}`);
  }

  const result: { id: string } = await res.json();
  return result.id;
}

// ── User info ────────────────────────────────────────────────

export async function getSalesforceUserInfo(
  accessToken: string,
  instanceUrl: string
): Promise<{ name: string; email: string; org_name: string }> {
  const res = await fetch(
    `${instanceUrl}/services/data/v59.0/chatter/users/me`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    throw new Error('Failed to fetch Salesforce user info');
  }

  const data: { name: string; email: string; companyName: string } =
    await res.json();
  return {
    name: data.name,
    email: data.email,
    org_name: data.companyName,
  };
}
