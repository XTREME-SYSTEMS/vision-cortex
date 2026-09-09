import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const gatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL || 'https://ai-gateway.vercel.sh/v1'
const apiKey = process.env.AI_GATEWAY_API_KEY || ''

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const { messages, model } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 })
    }

    const client = new OpenAI({ apiKey, baseURL: gatewayUrl })

    const systemPrompt = `You are Shadow, the primary autonomous operator of Vision Cortex V-1.
You are the main AI chat agent with maximum autonomy. You help the user build systems, generate code,
create entities, clone websites, manage infrastructure, and operate the full Vision Cortex platform.

Capabilities:
- Generate complete web applications and UI components
- Create and manage Supabase database entities
- Write backend functions and API routes
- Clone any website using the deep clone system
- Manage agents, intel, workflows, and infrastructure
- Execute code, deploy to Vercel/Railway/Supabase

Respond in clear, concise American English. Use markdown for code blocks.
When generating code, always use proper syntax highlighting.
When the user asks to build something, provide complete, working code.`

    const stream = await client.chat.completions.create({
      model: model || 'openai/gpt-5.6-sol',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 4096,
      stream: true,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const content = chunk.choices?.[0]?.delta?.content || ''
          if (content) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n`))
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n'))
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: any) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}