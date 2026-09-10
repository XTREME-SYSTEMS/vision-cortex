// status — returns the current autonomous loop state from Supabase.
// The Base44 Dashboard calls this (or reads Supabase directly) to show
// credit-free loop activity without consuming Base44 credits.
import { getSupabase } from '../lib/supabase.js';

export default async function handler(req, res) {
  try {
    const sb = getSupabase();
    const [state, recentRuns, recentLogs, queue] = await Promise.all([
      sb.from('loop_state').select('*').eq('id', 1).single(),
      sb.from('deep_runs').select('*').order('created_at', { ascending: false }).limit(10),
      sb.from('agent_logs').select('*').order('created_at', { ascending: false }).limit(20),
      sb.from('agent_schedule').select('*').eq('status', 'scheduled').order('priority', { ascending: true }).limit(10),
    ]);

    res.status(200).json({
      ok: true,
      state: state.data,
      recent_runs: recentRuns.data,
      recent_logs: recentLogs.data,
      queue: queue.data,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}