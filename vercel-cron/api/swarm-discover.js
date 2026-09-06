export default async function handler(req, res) {
  // Vercel cron calls this every 5 minutes — it triggers the zero-credit intelligence cycle.
  // The Base44 function reads from Supabase + calls Groq directly, bypassing Base44 credits.
  const CYCLE_URL = process.env.VISION_CORTEX_CYCLE_URL || 'https://visioncortex.base44.app/functions/runIntelligenceCycle';
  const CRON_TOKEN = process.env.VISION_CORTEX_WEBHOOK_KEY;

  if (!CRON_TOKEN) {
    return res.status(500).json({ error: 'VISION_CORTEX_WEBHOOK_KEY not set' });
  }

  try {
    const response = await fetch(CYCLE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-token': CRON_TOKEN
      },
      body: JSON.stringify({ mode: 'process', trigger: 'vercel-cron', timestamp: new Date().toISOString() })
    });

    const data = await response.json();
    return res.status(200).json({ triggered: true, cycle: data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}