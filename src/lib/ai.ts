import OpenAI from 'openai'

const gatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL || 'https://ai-gateway.vercel.sh/v1'
const apiKey = process.env.AI_GATEWAY_API_KEY || ''

export const ai = new OpenAI({
  apiKey,
  baseURL: gatewayUrl,
})

export const MODELS = {
  fast: 'openai/gpt-5.6-sol',
  smart: 'openai/gpt-5.6-luna',
  deep: 'anthropic/claude-opus-4.8',
  code: 'anthropic/claude-sonnet-4.6',
  search: 'google/gemini-3.1-pro',
  flash: 'google/gemini-3-flash',
}

export async function chat(messages: Array<{role: string, content: string}>, model: string = MODELS.fast) {
  const response = await ai.chat.completions.create({
    model,
    messages: messages as any,
    temperature: 0.7,
    max_tokens: 4096,
  })
  return response.choices[0]?.message?.content || ''
}

export async function chatStream(messages: Array<{role: string, content: string}>, model: string = MODELS.fast) {
  const stream = await ai.chat.completions.create({
    model,
    messages: messages as any,
    temperature: 0.7,
    max_tokens: 4096,
    stream: true,
  })
  return stream
}

export async function generateImage(prompt: string) {
  const response = await ai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1024',
  })
  return response.data[0]?.url || ''
}

export function pickModel(message: string): string {
  const lower = message.toLowerCase()
  if (lower.match(/code|implement|debug|fix|build|function|api/)) return MODELS.code
  if (lower.match(/analyz|strategy|reason|architect|design|plan/)) return MODELS.deep
  if (lower.match(/search|news|latest|current|web/)) return MODELS.search
  if (lower.match(/image|logo|design|visual/)) return MODELS.flash
  if (message.length > 2000) return MODELS.smart
  return MODELS.fast
}