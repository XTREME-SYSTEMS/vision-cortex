export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary mb-4">Vision Cortex</h1>
        <p className="text-xl text-foreground/60">Autonomous AI Business Operating System</p>
        <p className="text-sm text-foreground/40 mt-4">Self-hosted replica of Base44 platform</p>
        <div className="mt-8 flex gap-4 justify-center">
          <span className="px-4 py-2 bg-primary/10 rounded-lg text-primary">Vercel</span>
          <span className="px-4 py-2 bg-accent/10 rounded-lg text-accent">Supabase</span>
          <span className="px-4 py-2 bg-green-500/10 rounded-lg text-green-500">Railway</span>
          <span className="px-4 py-2 bg-orange-500/10 rounded-lg text-orange-500">GitHub</span>
          <span className="px-4 py-2 bg-yellow-500/10 rounded-lg text-yellow-500">Drive</span>
        </div>
      </div>
    </div>
  );
}