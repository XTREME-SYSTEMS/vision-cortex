import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const gatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL || 'https://ai-gateway.vercel.sh/v1'
const apiKey = process.env.AI_GATEWAY_API_KEY || ''

export async function POST(req: NextRequest) {
  try {
    const { prompt, model } = await req.json()
    if (!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 })

    const client = new OpenAI({ apiKey, baseURL: gatewayUrl })
    const response = await client.chat.completions.create({
      model: model || 'openai/gpt-5.6-sol',
      messages: [
        { role: 'system', content: 'You are a system generator. Generate complete, working code based on the user request. Return JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 8000,
      response_format: { type: 'json_object' },
    })

    return NextResponse.json({ result: response.choices[0]?.message?.content })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}