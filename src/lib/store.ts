'use client'

import { create } from 'zustand'

interface AppState {
  currentApp: any | null
  currentView: 'pages' | 'entities' | 'functions' | 'workflows' | 'settings' | 'chat' | 'deploy'
  selectedItem: any | null
  setApp: (app: any) => void
  setView: (view: AppState['currentView']) => void
  setSelected: (item: any) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentApp: null,
  currentView: 'pages',
  selectedItem: null,
  setApp: (app) => set({ currentApp: app }),
  setView: (view) => set({ currentView: view, selectedItem: null }),
  setSelected: (item) => set({ selectedItem: item }),
}))

interface ChatState {
  messages: Array<{ id: string; role: 'user' | 'assistant'; content: string; model?: string }>
  isStreaming: boolean
  addMessage: (msg: any) => void
  updateMessage: (id: string, updates: any) => void
  clear: () => void
  setStreaming: (v: boolean) => void
}

export const useChat = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateMessage: (id, updates) => set((s) => ({ messages: s.messages.map((m) => m.id === id ? { ...m, ...updates } : m) })),
  clear: () => set({ messages: [] }),
  setStreaming: (v) => set({ isStreaming: v }),
}))
