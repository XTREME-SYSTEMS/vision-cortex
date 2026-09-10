import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const gatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL || 'https://ai-gateway.vercel.sh/v1'
const apiKey = process.env.AI_GATEWAY_API_KEY || ''

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const { messages, model } = await req.json()
    if (!messages?.length) return NextResponse.json({ error: 'messages required' }, { status: 400 })

    const client = new OpenAI({ apiKey, baseURL: gatewayUrl })

    const systemPrompt = `You are the Base44 AI Builder. Users describe what they want to build and you generate complete code.
You can: create entities (database tables), generate pages (React components), write backend functions,
create API routes, and deploy applications. Always return complete, working code with proper syntax.
When the user asks to create an entity, generate the SQL CREATE TABLE statement.
When the user asks to create a page, generate the full React/TSX component.
When the user asks to create a function, generate the complete backend function code.
Use markdown code blocks with the appropriate language tags.`

    const stream = await client.chat.completions.create({
      model: model || 'openai/gpt-5.6-sol',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
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
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}