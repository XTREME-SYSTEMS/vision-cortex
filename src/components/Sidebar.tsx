'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, MessageSquare, Database, Wrench,
  Bot, Settings, FolderTree, Globe, Shield, ChevronLeft,
  Radar, Cpu, FileCode, Zap, Network, Eye
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/chat', label: 'AI Chat', icon: MessageSquare },
  { href: '/builder', label: 'System Generator', icon: Wrench },
  { href: '/entities', label: 'Entities', icon: Database },
  { href: '/functions', label: 'Backend Functions', icon: FileCode },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/clone', label: 'Clone Factory', icon: Globe },
  { href: '/intel', label: 'Intel Feed', icon: Radar },
  { href: '/workflows', label: 'Workflows', icon: Zap },
  { href: '/vault', label: 'Vault', icon: Shield },
  { href: '/browser', label: 'Cloud Browser', icon: Eye },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-60'} flex flex-col bg-background border-r border-border transition-all duration-200`}> 
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Cpu className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">Vision Cortex</span>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 hover:bg-secondary rounded">
          <ChevronLeft className={`w-4 h-4 text-muted-foreground transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary border-r-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-border">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold text-white">
              S
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">Shadow</p>
              <p className="text-xs text-muted-foreground">Autonomous</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold text-white mx-auto">
            S
          </div>
        )}
      </div>
    </aside>
  )
}