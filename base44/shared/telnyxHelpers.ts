// ============================================================================
// telnyxHelpers — Shared Telnyx API helpers for backend functions
// Plain module — no Deno.serve. Import from functions via:
//   import { getMessagingProfile, normalizePhone, sendTelnyxMessage, sleep } from "../../shared/telnyxHelpers.ts";
// ============================================================================

import { secrets } from 'base44:runtime';

export const TELNYX_BASE = 'https://api.telnyx.com/v2';

export function getTelnyxHeaders() {
  const apiKey = secrets.get('TELNYX_API_KEY');
  if (!apiKey) return null;
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

export async function getMessagingProfile() {
  const headers = getTelnyxHeaders();
  if (!headers) return null;
  const r = await fetch(`${TELNYX_BASE}/messaging_profiles`, { headers });
  const data = await r.json().catch(() => ({}));
  const profiles = data?.data || [];
  if (profiles.length > 0) return profiles[0].id;
  const cr = await fetch(`${TELNYX_BASE}/messaging_profiles`, {
    method: 'POST', headers,
    body: JSON.stringify({ name: 'Vision Cortex Outreach', enabled: true }),
  });
  const cd = await cr.json().catch(() => ({}));
  return cd?.data?.id || null;
}

export function normalizePhone(phone) {
  if (!phone) return null;
  let p = phone.replace(/[^\d+]/g, '');
  if (!p.startsWith('+')) p = '+' + p;
  if (p.length < 11) return null;
  return p;
}

export async function sendTelnyxMessage(to, from, text, mediaUrls = [], profileId = null) {
  const headers = getTelnyxHeaders();
  if (!headers) return { ok: false, error: 'TELNYX_API_KEY not set' };
  const pid = profileId || await getMessagingProfile();
  if (!pid) return { ok: false, error: 'No messaging profile available' };

  const payload = { from, to, text, messaging_profile_id: pid };
  if (mediaUrls.length > 0) payload.media_urls = mediaUrls;

  const r = await fetch(`${TELNYX_BASE}/messages`, {
    method: 'POST', headers,
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, data: data?.data, error: data?.errors?.[0]?.detail };
}

// Telnyx from-numbers mapped to their companies
// Each number is dedicated to a specific company — NOT round-robin
export const COMPANY_NUMBERS = {
  strategic_minds: '+19548848885',   // Strategic Minds — AI voice / Eden Skye
  property_intel: '+18337001239',    // Property Intel — toll-free
  xps: '+18334843799',              // XPS (Xtreme Polishing Systems) — toll-free
};

// Reverse lookup: number -> company key
export const COMPANY_BY_NUMBER = Object.fromEntries(
  Object.entries(COMPANY_NUMBERS).map(([k, v]) => [v, k])
);

// Default number for AI voice campaigns (Eden Skye)
export const DEFAULT_VOICE_NUMBER = COMPANY_NUMBERS.strategic_minds;

// Default number for SMS/MMS outreach
export const DEFAULT_MESSAGING_NUMBER = COMPANY_NUMBERS.property_intel;

// Get the from-number for a given company key
export function getFromNumberForCompany(company) {
  return COMPANY_NUMBERS[company] || DEFAULT_MESSAGING_NUMBER;
}

// Backward compat — returns the default messaging number
export function getNextFromNumber() {
  return DEFAULT_MESSAGING_NUMBER;
}

export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}