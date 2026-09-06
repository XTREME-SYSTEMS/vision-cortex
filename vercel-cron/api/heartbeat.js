export default async function handler(req, res) {
  // Vercel cron calls this every 10 minutes — it triggers the Vision Cortex autonomous heartbeat
  const HEARTBEAT_URL = process.env.VISION_CORTEX_HEARTBEAT_URL || 'https://visioncortex.base44.app/functions/masterAutonomousCycle';
  const CRON_TOKEN = process.env.VISION_CORTEX_WEBHOOK_KEY;

  if (!CRON_TOKEN) {
    return res.status(500).json({ error: 'VISION_CORTEX_WEBHOOK_KEY not set' });
  }

  try {
    const response = await fetch(HEARTBEAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-token': CRON_TOKEN
      },
      body: JSON.stringify({ trigger: 'vercel-cron', timestamp: new Date().toISOString() })
    });

    const data = await response.json();
    return res.status(200).json({ triggered: true, heartbeat: data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}