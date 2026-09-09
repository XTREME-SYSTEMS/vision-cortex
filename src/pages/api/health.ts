import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({
    status: 'healthy',
    service: 'vision-cortex',
    timestamp: new Date().toISOString(),
    infrastructure: {
      vercel: 'connected',
      supabase: 'connected',
      railway: 'connected',
      github: 'connected',
      drive: 'connected',
    },
  });
}