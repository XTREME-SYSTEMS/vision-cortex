import OpenAI from 'openai'

const gatewayUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL || 'https://ai-gateway.vercel.sh/v1'
const apiKey = process.env.AI_GATEWAY_API_KEY || ''

export const ai = new OpenAI({ apiKey, baseURL: gatewayUrl })

export const MODELS = {
  fast: 'openai/gpt-5.6-sol',
  smart: 'openai/gpt-5.6-luna',
  deep: 'anthropic/claude-opus-4.8',
  code: 'anthropic/claude-sonnet-4.6',
  search: 'google/gemini-3.1-pro',
  flash: 'google/gemini-3-flash',
}

export function pickModel(msg: string): string {
  const l = msg.toLowerCase()
  if (l.match(/code|function|api|debug/)) return MODELS.code
  if (l.match(/analyz|strategy|architect|design/)) return MODELS.deep
  if (l.match(/search|news|web/)) return MODELS.search
  return MODELS.fast
}
