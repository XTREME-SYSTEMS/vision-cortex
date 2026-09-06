export default async function handler(req, res) {
  // Vercel cron calls this every 2 hours — triggers the autonomous master loop
  // (self-reflect → architect → implement → validate → harden → optimize → push)
  const LOOP_URL = process.env.VISION_CORTEX_AUTONOMOUS_URL || 'https://visioncortex.base44.app/functions/autonomousMasterLoop';
  const CRON_TOKEN = process.env.VISION_CORTEX_WEBHOOK_KEY;

  if (!CRON_TOKEN) {
    return res.status(500).json({ error: 'VISION_CORTEX_WEBHOOK_KEY not set' });
  }

  try {
    const response = await fetch(LOOP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-token': CRON_TOKEN
      },
      body: JSON.stringify({ trigger: 'vercel-cron-autonomous', timestamp: new Date().toISOString() })
    });

    const data = await response.json();
    return res.status(200).json({ triggered: true, cycle: data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}