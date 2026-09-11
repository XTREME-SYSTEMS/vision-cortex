import { createClientFromRequest, secrets } from '../../runtime/index';
import { COMPANY_BY_NUMBER } from "../../shared/telnyxHelpers.ts";

// ============================================================================
// callValidator — Fetches Telnyx call recordings, transcribes them, and uses
// an LLM agent to validate call quality, score performance, and generate
// improvement feedback. Makes Eden Skye (and other voice agents) better over time.
// ============================================================================

const TELNYX_BASE = 'https://api.telnyx.com/v2';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const apiKey = secrets.get('TELNYX_API_KEY');
    if (!apiKey) return Response.json({ error: 'TELNYX_API_KEY not set' }, { status: 400 });

    const telnyxHeaders = {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
    };

    const body = await req.json().catch(() => ({}));
    const { action = 'fetch_and_validate' } = body;

    // ── Fetch recordings from Telnyx and create CallRecording entries ────
    const fetchRecordings = async (pageSize = 50) => {
      const r = await fetch(`${TELNYX_BASE}/recordings?page[size]=${pageSize}`, {
        headers: telnyxHeaders,
      });
      const data = await r.json().catch(() => ({}));
      return data?.data || [];
    };

    // Get call details to map from/to numbers
    const getCallDetails = async (callControlId) => {
      if (!callControlId) return null;
      try {
        const r = await fetch(`${TELNYX_BASE}/calls/${callControlId}`, {
          headers: telnyxHeaders,
        });
        const data = await r.json().catch(() => ({}));
        return data?.data || null;
      } catch {
        return null;
      }
    };

    // Transcribe a recording using the Telnyx download URL
    const transcribeRecording = async (downloadUrl) => {
      const res = await base44.asServiceRole.integrations.Core.TranscribeAudio({
        audio_url: downloadUrl,
      });
      return res;
    };

    // Validate a transcript using LLM
    const validateCall = async (transcript, fromNumber, toNumber, company) => {
      const prompt = `You are a call quality assurance agent for Vision Cortex. You listen to transcribed sales/outreach calls and evaluate them.

COMPANY: ${company}
FROM: ${fromNumber}
TO: ${toNumber}

TRANSCRIPT:
${transcript}

Score this call on a 0-100 scale across these dimensions:
1. greeting_score — Was the greeting warm, natural, and professional?
2. value_prop_score — Was the value proposition clear and compelling?
3. objection_handling_score — Were objections handled with empathy and reframed well?
4. closing_score — Was there a clear call-to-action? Did they try to close/schedule?
5. tone_score — Was the tone warm, humanistic, and professional (not robotic)?
6. overall_score — Weighted overall score

Also identify:
- strengths: what went well (array of strings)
- weaknesses: what could be improved (array of strings)
- improvement_suggestions: specific actionable suggestions (array of strings)
- objections_raised: what objections the prospect raised (array of strings)
- outcome: scheduled | interested | not_interested | voicemail | no_answer | callback_requested | unknown
- summary: 1-2 sentence summary of the call
- better_script_suggestion: an improved version of the key script segment that could be used next time

Return JSON only.`;

      const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            overall_score: { type: 'number' },
            greeting_score: { type: 'number' },
            value_prop_score: { type: 'number' },
            objection_handling_score: { type: 'number' },
            closing_score: { type: 'number' },
            tone_score: { type: 'number' },
            strengths: { type: 'array', items: { type: 'string' } },
            weaknesses: { type: 'array', items: { type: 'string' } },
            improvement_suggestions: { type: 'array', items: { type: 'string' } },
            objections_raised: { type: 'array', items: { type: 'string' } },
            outcome: { type: 'string' },
            summary: { type: 'string' },
            better_script_suggestion: { type: 'string' },
          },
        },
      });
      return res;
    };

    switch (action) {

      // ── FETCH: pull new recordings from Telnyx, create pending entries ──
      case 'fetch': {
        const recordings = await fetchRecordings(body.page_size || 50);

        // Get existing recording IDs to avoid duplicates
        const existingIds = new Set(
          (await base44.entities.CallRecording.list('-created_date', 200))
            .map(r => r.recording_id)
        );

        let created = 0;
        let skipped = 0;

        for (const rec of recordings) {
          if (existingIds.has(rec.id)) { skipped++; continue; }

          // Get call details for from/to numbers
          const callDetails = await getCallDetails(rec.call_control_id);
          const fromNumber = callDetails?.from || rec.from_number || '';
          const toNumber = callDetails?.to || rec.to_number || '';
          const company = COMPANY_BY_NUMBER[fromNumber] || 'unknown';

          await base44.entities.CallRecording.create({
            recording_id: rec.id,
            call_control_id: rec.call_control_id,
            call_session_id: rec.call_session_id,
            from_number: fromNumber,
            to_number: toNumber,
            company,
            duration_secs: rec.duration_secs || 0,
            recording_url: rec.download_urls?.[0] || rec.download_url || '',
            status: 'pending',
          });
          created++;
        }

        return Response.json({ ok: true, created, skipped, total_fetched: recordings.length });
      }

      // ── VALIDATE: transcribe + validate a single recording ──────────
      case 'validate': {
        const { recording_id } = body;
        if (!recording_id) return Response.json({ error: 'recording_id required' }, { status: 400 });

        const record = await base44.entities.CallRecording.filter({ recording_id });
        if (record.length === 0) return Response.json({ error: 'Recording not found' }, { status: 404 });
        const rec = record[0];

        if (!rec.recording_url) {
          await base44.entities.CallRecording.update(rec.id, { status: 'no_recording' });
          return Response.json({ ok: false, error: 'No download URL available' });
        }

        // Transcribe
        await base44.entities.CallRecording.update(rec.id, { status: 'transcribing' });
        let transcript;
        try {
          transcript = await transcribeRecording(rec.recording_url);
        } catch (e) {
          await base44.entities.CallRecording.update(rec.id, { status: 'failed', error_message: `Transcription failed: ${e.message}` });
          return Response.json({ ok: false, error: `Transcription failed: ${e.message}` });
        }

        // Validate
        await base44.entities.CallRecording.update(rec.id, { status: 'validating', transcript });
        let validation;
        try {
          validation = await validateCall(transcript, rec.from_number, rec.to_number, rec.company);
        } catch (e) {
          await base44.entities.CallRecording.update(rec.id, { status: 'failed', error_message: `Validation failed: ${e.message}`, transcript });
          return Response.json({ ok: false, error: `Validation failed: ${e.message}` });
        }

        await base44.entities.CallRecording.update(rec.id, {
          status: 'validated',
          transcript,
          validation,
          validated_at: new Date().toISOString(),
        });

        return Response.json({ ok: true, recording_id, validation });
      }

      // ── FETCH AND VALIDATE: fetch new recordings, then validate all pending ──
      case 'fetch_and_validate': {
        // Step 1: Fetch new recordings
        const recordings = await fetchRecordings(body.page_size || 50);
        const existingIds = new Set(
          (await base44.entities.CallRecording.list('-created_date', 200))
            .map(r => r.recording_id)
        );

        let created = 0;
        for (const rec of recordings) {
          if (existingIds.has(rec.id)) continue;
          const callDetails = await getCallDetails(rec.call_control_id);
          const fromNumber = callDetails?.from || '';
          const toNumber = callDetails?.to || '';
          const company = COMPANY_BY_NUMBER[fromNumber] || 'unknown';

          await base44.entities.CallRecording.create({
            recording_id: rec.id,
            call_control_id: rec.call_control_id,
            call_session_id: rec.call_session_id,
            from_number: fromNumber,
            to_number: toNumber,
            company,
            duration_secs: rec.duration_secs || 0,
            recording_url: rec.download_urls?.[0] || rec.download_url || '',
            status: 'pending',
          });
          created++;
        }

        // Step 2: Validate all pending recordings
        const pending = await base44.entities.CallRecording.filter({ status: 'pending' });
        let validated = 0;
        let failed = 0;
        const results = [];

        for (const rec of pending) {
          if (!rec.recording_url) {
            await base44.entities.CallRecording.update(rec.id, { status: 'no_recording' });
            continue;
          }

          try {
            // Transcribe
            await base44.entities.CallRecording.update(rec.id, { status: 'transcribing' });
            const transcript = await transcribeRecording(rec.recording_url);

            // Validate
            await base44.entities.CallRecording.update(rec.id, { status: 'validating', transcript });
            const validation = await validateCall(transcript, rec.from_number, rec.to_number, rec.company);

            await base44.entities.CallRecording.update(rec.id, {
              status: 'validated',
              transcript,
              validation,
              validated_at: new Date().toISOString(),
            });

            results.push({
              recording_id: rec.recording_id,
              company: rec.company,
              score: validation.overall_score,
              outcome: validation.outcome,
            });
            validated++;
          } catch (e) {
            await base44.entities.CallRecording.update(rec.id, {
              status: 'failed',
              error_message: e.message,
            });
            failed++;
          }
        }

        return Response.json({
          ok: true,
          new_recordings: created,
          validated,
          failed,
          results,
        });
      }

      // ── SUMMARY: get validation stats ────────────────────────────────
      case 'summary': {
        const all = await base44.entities.CallRecording.list('-created_date', 200);
        const validated = all.filter(r => r.status === 'validated');
        const avgScore = validated.length > 0
          ? Math.round(validated.reduce((s, r) => s + (r.validation?.overall_score || 0), 0) / validated.length)
          : 0;

        const byCompany = {};
        for (const r of validated) {
          const c = r.company || 'unknown';
          if (!byCompany[c]) byCompany[c] = { count: 0, total_score: 0, scores: [] };
          byCompany[c].count++;
          byCompany[c].total_score += r.validation?.overall_score || 0;
          byCompany[c].scores.push(r.validation?.overall_score || 0);
        }

        const companyStats = Object.entries(byCompany).map(([company, data]) => ({
          company,
          count: data.count,
          avg_score: Math.round(data.total_score / data.count),
          best_score: Math.max(...data.scores),
          worst_score: Math.min(...data.scores),
        }));

        // Top improvement suggestions across all calls
        const allSuggestions = validated.flatMap(r => r.validation?.improvement_suggestions || []);
        const suggestionCounts = {};
        for (const s of allSuggestions) {
          suggestionCounts[s] = (suggestionCounts[s] || 0) + 1;
        }
        const topSuggestions = Object.entries(suggestionCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([suggestion, count]) => ({ suggestion, count }));

        return Response.json({
          ok: true,
          total_recordings: all.length,
          validated: validated.length,
          pending: all.filter(r => r.status === 'pending').length,
          failed: all.filter(r => r.status === 'failed').length,
          avg_score: avgScore,
          by_company: companyStats,
          top_improvement_suggestions: topSuggestions,
        });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}