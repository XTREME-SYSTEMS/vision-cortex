import React from 'react';
import { Github, HardDrive, Database, Cloud, Container, Cpu } from 'lucide-react';

const nodes = {
  engine: { x: 300, y: 120, icon: Cpu, label: 'Provisioning Engine', color: '#3B82F6' },
  github: { x: 90, y: 50, icon: Github, label: 'GitHub', color: '#8A93A6' },
  drive: { x: 90, y: 190, icon: HardDrive, label: 'Google Drive', color: '#8A93A6' },
  supabase: { x: 510, y: 50, icon: Database, label: 'Supabase', color: '#10B981' },
  vercel: { x: 510, y: 190, icon: Cloud, label: 'Vercel Edge', color: '#3B82F6' },
  railway: { x: 300, y: 230, icon: Container, label: 'Railway Mesh', color: '#F97316' },
};

const edges = [
  ['engine', 'github'],
  ['engine', 'drive'],
  ['engine', 'supabase'],
  ['engine', 'vercel'],
  ['engine', 'railway'],
];

export default function TopologyMap({ activeFlow }) {
  return (
    <div className="border rounded-lg bg-[#0B0D12] overflow-hidden border-border">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="font-mono text-xs font-semibold text-foreground">ARCHITECTURE TOPOLOGY</span>
        <span className="font-mono text-[10px] text-muted-foreground">{activeFlow ? 'ROUTING ASSETS…' : 'IDLE'}</span>
      </div>
      <div className="relative">
        <svg viewBox="0 0 600 280" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
          <style>{`@keyframes dash-flow { to { stroke-dashoffset: -16; } }`}</style>
          {edges.map(([from, to], i) => {
            const a = nodes[from];
            const b = nodes[to];
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={activeFlow ? b.color : '#2B3245'}
                strokeWidth={activeFlow ? 1.5 : 1}
                strokeDasharray="4 4"
                style={activeFlow ? { animation: 'dash-flow 1s linear infinite' } : {}}
                opacity={activeFlow ? 0.8 : 0.4}
              />
            );
          })}
          {Object.entries(nodes).map(([key, n]) => {
            const Icon = n.icon;
            const isActive = activeFlow && (key === 'engine' || edges.some(([, t]) => t === key));
            return (
              <g key={key}>
                <circle
                  cx={n.x}
                  cy={n.y}
                  r="26"
                  fill="#131722"
                  stroke={isActive ? n.color : '#2B3245'}
                  strokeWidth={isActive ? 2 : 1}
                />
                <foreignObject x={n.x - 12} y={n.y - 12} width="24" height="24">
                  <Icon className="w-6 h-6" style={{ color: isActive ? n.color : '#8A93A6' }} />
                </foreignObject>
                <text
                  x={n.x}
                  y={n.y + 40}
                  textAnchor="middle"
                  className="font-mono"
                  style={{ fontSize: 10, fill: isActive ? n.color : '#8A93A6' }}
                >
                  {n.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}