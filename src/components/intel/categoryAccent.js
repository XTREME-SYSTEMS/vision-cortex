const palette = {
  'Worldwide Intelligence': '#0f766e',
  'Elite Operations': '#1d4ed8',
  'Stock Market': '#16a34a',
  Weather: '#0891b2',
  Trends: '#db2777',
  Economics: '#ca8a04',
  'AI Technology': '#7c3aed',
  'Social Media': '#e11d48',
  'Crypto News': '#f59e0b',
  'Influential Industries': '#0d9488'
};

const fallback = ['#3f3f46', '#475569', '#64748b', '#334155', '#5b21b6'];

export function categoryAccent(name) {
  if (palette[name]) return palette[name];
  const hash = [...(name || '')].reduce((a, c) => a + c.charCodeAt(0), 0);
  return fallback[hash % fallback.length];
}