'use client'

import { useState, useRef, useEffect } from 'react'
import { useChatStore } from '@/lib/store'
import { pickModel, MODELS } from '@/lib/ai'
import { Send, Sparkles, Cpu, ChevronDown, Code2, Database, Globe, Wrench } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const modelOptions = [
  { value: 'auto', label: 'Auto', icon: Sparkles },
  { value: MODELS.fast, label: 'GPT-5.6 Sol', icon: Cpu },
  { value: MODELS.deep, label: 'Claude Opus', icon: Cpu },
  { value: MODELS.code, label: 'Claude Sonnet', icon: Code2 },
  { value: MODELS.search, label: 'Gemini Pro', icon: Globe },
]

const quickActions = [
  { label: 'Generate App', icon: Wrench, prompt: 'Generate a new web application with authentication, dashboard, and CRUD entities.' },
  { label: 'Clone URL', icon: Globe, prompt: 'Clone the website at [URL] using the deep clone system.' },
  { label: 'Create Entity', icon: Database, prompt: 'Create a new database entity with fields: name, email, status, created_at.' },
  { label: 'Write Function', icon: Code2, prompt: 'Write a backend function that sends an email notification when a new record is created.' },
]

export function ChatInterface() {
  const { messages, addMessage, updateMessage, isStreaming, setStreaming, selectedModel, setModel } = useChatStore()
  const [input, setInput] = useState('')
  const [showModelPicker, setShowModelPicker] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return
    const userMsg = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      content: input,
      timestamp: new Date().toISOString(),
    }
    addMessage(userMsg)
    setInput('')
    setStreaming(true)

    const assistantId = crypto.randomUUID()
    addMessage({
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    })

    try {
      const model = selectedModel === 'auto' ? pickModel(input) : selectedModel
      const allMessages = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMessages, model }),
      })

      if (!response.ok) throw new Error('Chat request failed')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        const lines = accumulated.split('\n')
        accumulated = lines.pop() || ''
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta?.content || ''
              if (delta) {
                updateMessage(assistantId, {
                  content: (messages.find(m => m.id === assistantId)?.content || '') + delta,
                  model,
                })
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      updateMessage(assistantId, { content: `Error: ${err.message}` })
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">AI Chat</h1>
        </div>
        <div className="relative">
          <button onClick={() => setShowModelPicker(!showModelPicker)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-secondary rounded-lg hover:bg-secondary/80">
            <Cpu className="w-4 h-4" />
            {modelOptions.find(m => m.value === selectedModel)?.label || 'Auto'}
            <ChevronDown className="w-3 h-3" />
          </button>
          {showModelPicker && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-xl z-50">
              {modelOptions.map(m => (
                <button key={m.value} onClick={() => { setModel(m.value); setShowModelPicker(false) }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-secondary text-left">
                  <m.icon className="w-4 h-4" />
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Vision Cortex AI</h2>
              <p className="text-muted-foreground">Autonomous AI Business Operating System</p>
            </div>
            <div className="grid grid-cols-2 gap-3 max-w-lg">
              {quickActions.map(action => (
                <button key={action.label} onClick={() => setInput(action.prompt)}
                  className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg hover:bg-secondary border border-border text-left">
                  <action.icon className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-foreground'
            }`}>
              {msg.role === 'assistant' && msg.model && (
                <div className="text-xs text-muted-foreground mb-1">{msg.model}</div>
              )}
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.content || '...'}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-border">
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-secondary rounded-xl border border-border focus-within:border-primary">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="Ask anything, generate anything..."
              rows={1}
              className="w-full bg-transparent px-4 py-3 text-sm resize-none focus:outline-none"
              style={{ maxHeight: '200px' }}
            />
          </div>
          <button onClick={sendMessage} disabled={!input.trim() || isStreaming}
            className="p-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}