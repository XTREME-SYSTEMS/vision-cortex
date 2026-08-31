import React, { useState } from 'react';
import { Users, Play, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import UserCard from '@/components/usersim/UserCard';
import AggregatePanel from '@/components/usersim/AggregatePanel';

export default function UserSimulator() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [count, setCount] = useState(8);

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await base44.functions.invoke('simulateUserJourney', { count });
      setResult(res);
    } catch (e) {
      setError(e.message || 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl tracking-tight flex items-center gap-2.5">
          <Users className="w-7 h-7" /> User Simulator
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Generates diverse user personas across the full spectrum of humanity — beginners, retirees, blue-collar workers, neurodivergent folks, skeptics — and simulates each one's complete journey through Vision Cortex. Scores the system's ability to serve virtually any human, and exposes where it fails.
        </p>
      </div>

      <Card className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
        <div>
          <div className="text-sm font-medium mb-1">Stress-test the system</div>
          <p className="text-xs text-muted-foreground">
            Each simulated user gives a vision, gets a system recommendation, and is scored on experience + success probability. The aggregate verdict answers: can this serve anyone?
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <label className="text-xs text-muted-foreground">Users:</label>
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="bg-transparent border border-input rounded-md px-2 py-1.5 text-sm"
            disabled={loading}
          >
            <option value={6}>6</option>
            <option value={8}>8</option>
            <option value={10}>10</option>
            <option value={12}>12</option>
          </select>
          <Button onClick={run} disabled={loading} className="min-w-[140px]">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Simulating…</> : <><Play className="w-4 h-4" /> Run Simulation</>}
          </Button>
        </div>
      </Card>

      {error && (
        <Card className="p-4 border-rose-500/40 bg-rose-500/5 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
          <p className="text-sm text-rose-600">{error}</p>
        </Card>
      )}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: count }).map((_, i) => (
            <Card key={i} className="p-5 h-96 animate-pulse bg-muted/30" />
          ))}
        </div>
      )}

      {result && !loading && (
        <>
          <AggregatePanel aggregate={result.aggregate} count={result.users?.length || count} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {result.users?.map((u, i) => <UserCard key={i} user={u} />)}
          </div>
        </>
      )}

      {!result && !loading && !error && (
        <Card className="p-12 text-center text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Run the simulation to see how Vision Cortex performs across diverse user types.</p>
        </Card>
      )}
    </div>
  );
}