// humanTaxonomy.ts — a curated, research-grounded taxonomy of human personality,
// psychology, life patterns, and leadership principles. Used by the personal
// onboarding synthesizer and the life simulator to model realistic human futures.
//
// Sources synthesized: Big Five / OCEAN, Myers-Briggs (16 types), Enneagram (9),
// ADHD-entrepreneur research (PMC), bipolar/hypomania & entrepreneurship (Springer),
// habit-loop neuroscience (cue-routine-reward; ~66% of daily behavior is habitual),
// Maxwell's 21 Irrefutable Laws of Leadership, the Hermetic universal laws.

export const BIG_FIVE = [
  { trait: 'Openness', low: 'Practical, conventional, prefers routine', high: 'Curious, creative, open to new experiences' },
  { trait: 'Conscientiousness', low: 'Flexible, spontaneous, disorganized', high: 'Disciplined, reliable, achievement-oriented' },
  { trait: 'Extraversion', low: 'Introverted, reserved, solitary', high: 'Outgoing, energetic, socially dominant' },
  { trait: 'Agreeableness', low: 'Competitive, critical, skeptical', high: 'Cooperative, trusting, compassionate' },
  { trait: 'Neuroticism', low: 'Emotionally stable, resilient, calm', high: 'Reactive, anxious, prone to stress' },
];

// Entrepreneurial archetypes — distilled from MBTI + founder research.
export const ENTREPRENEUR_ARCHETYPES = [
  { name: 'The Visionary', traits: 'high openness, intuitive, future-focused', strengths: 'sees markets before they exist', blind_spots: 'executes poorly, loses interest in operations' },
  { name: 'The Operator', traits: 'high conscientiousness, systems-thinker', strengths: 'builds repeatable engines', blind_spots: 'may miss paradigm shifts' },
  { name: 'The Hustler', traits: 'high extraversion, high agency', strengths: 'sells anything, relentless', blind_spots: 'burnout, over-promises' },
  { name: 'The Architect', traits: 'introverted, analytical, deep', strengths: 'builds moats, long-term compounding', blind_spots: 'slow to ship, perfectionism' },
  { name: 'The Maverick', traits: 'low agreeableness, high risk, impulsive', strengths: 'breaks orthodoxy, moves fast', blind_spots: 'alienates teams, legal/ethical risk' },
  { name: 'The Steward', traits: 'high agreeableness, patient, capital-preserving', strengths: 'compounds slowly, loyal teams', blind_spots: 'misses aggressive windows' },
  { name: 'The Catalyst', traits: 'high openness + extraversion, charismatic', strengths: 'mobilizes people, raises capital', blind_spots: 'shiny-object syndrome' },
];

export const PSYCHOLOGICAL_PROFILES = [
  { name: 'ADHD', prevalence: '~4.4% general, ~29% entrepreneurs', link: '300% more likely to start a business; impulsivity + novelty-seeking + hyperfocus drive venture creation', strengths: 'creativity, risk-taking, rapid pivoting, hyperfocus', risks: 'inconsistency, burnout, unfinished projects, impulsivity' },
  { name: 'Bipolar / Hypomania', prevalence: 'elevated in self-made industrialists', link: 'hypomanic traits — optimism, confidence, creativity, impulsivity, risk tolerance — correlate with entrepreneurial intent', strengths: 'ambitious goals, zealous pursuit, creative mania', risks: 'depression cycles, reckless decisions, instability' },
  { name: 'Autism Spectrum', prevalence: '~1-2%', link: 'high-functioning autism brings deep focus, pattern recognition, and systemizing — strong in technical ventures', strengths: 'deep expertise, pattern recognition, integrity', risks: 'social friction, rigidity, burnout' },
  { name: 'Dyslexia', prevalence: '~20% of entrepreneurs (vs ~10% general)', link: 'compensatory big-picture thinking and delegation', strengths: 'spatial reasoning, narrative thinking, delegation', risks: 'detail errors, slower administrative work' },
  { name: 'Narcissism', prevalence: 'spectrum trait', link: 'hubristic pride correlates with entrepreneurial intent; drives vision-selling', strengths: 'unshakable confidence, charisma, risk tolerance', risks: 'hubris, alienation, ethical lapses, blind spots' },
  { name: 'Depression / Melancholy', prevalence: 'common; correlates with goal disengagement cycles', link: 'depression cycles follow setbacks — men post-divorce especially', strengths: 'depth, realism, empathy, resilience after rebuild', risks: 'goal disengagement, fall-off periods, lost time' },
  { name: 'Anxiety', prevalence: 'common', link: 'risk-aversion can either protect capital or stall action', strengths: 'risk-awareness, thoroughness', risks: 'paralysis, over-preparation' },
];

export const DECISION_STYLES = [
  { style: 'Analytical', desc: 'gathers data, models outcomes, decides slowly with evidence' },
  { style: 'Intuitive', desc: 'reads patterns fast, trusts gut, decides on feel' },
  { style: 'Impulsive', desc: 'decides fast, acts first, adjusts after — high variance' },
  { style: 'Collaborative', desc: 'seeks counsel, weighs others, decides by consensus' },
  { style: 'Deliberative', desc: 'lists pros/cons, sits with it, decides with conviction' },
];

// The human daily loop — everyone sleeps, wakes, works, eats, socializes, sleeps.
export const DAILY_LOOP = [
  { phase: 'Sleep', hours: 7.5, note: 'recovery + memory consolidation' },
  { phase: 'Wake & routine', hours: 1.5, note: 'cue-driven habits (66% of behavior is habitual)' },
  { phase: 'Deep work', hours: 4, note: 'peak cognitive window' },
  { phase: 'Shallow work / comms', hours: 3, note: 'meetings, email, reactive tasks' },
  { phase: 'Health / movement', hours: 1, note: 'often skipped first to erode' },
  { phase: 'Social / family', hours: 3, note: 'relationship maintenance' },
  { phase: 'Recreation / scroll', hours: 2, note: 'dopamine, often the leak' },
  { phase: 'Wind-down', hours: 2, note: 'cue for sleep habit' },
];

export const HABIT_LOOP = {
  cue: 'a trigger (time, place, emotion, prior action) starts the behavior',
  routine: 'the behavior itself — automatic, low conscious effort',
  reward: 'the payoff that reinforces the loop and makes it sticky',
  note: '~66% of daily behavior is habitual; changing outcomes means changing loops, not willpower',
};

// Life events that reshape a trajectory — with rough probability modifiers.
export const LIFE_EVENTS = [
  { kind: 'Death of a loved one', baseProb: 0.05, ageSlope: 0.012, impact: 'grief, focus loss, possible inheritance', financial: 'mixed' },
  { kind: 'Divorce', baseProb: 0.42, appliesIf: 'married', impact: 'men lose ~50% assets; depression + rebuild cycle common', financial: 'severe-negative' },
  { kind: 'Depression cycle / burnout', baseProb: 0.3, impact: '3-9 month productivity collapse; rebuild after', financial: 'negative' },
  { kind: 'Health crisis', baseProb: 0.08, ageSlope: 0.01, impact: 'forced pause, medical cost', financial: 'negative' },
  { kind: 'Market crash / recession', baseProb: 0.15, impact: 'portfolio drawdown; high-risk strategies hit hardest', financial: 'negative-to-catastrophic' },
  { kind: 'Windfall / liquidity event', baseProb: 0.05, impact: 'exit, acquisition, or viral spike', financial: 'strong-positive' },
  { kind: 'Relocation', baseProb: 0.2, impact: 'cost + new network; net positive long-term', financial: 'neutral-positive' },
  { kind: 'Marriage / partnership', baseProb: 0.3, appliesIf: 'single', impact: 'stability, dual income, compounding', financial: 'positive' },
  { kind: 'Hyperfocus breakthrough', baseProb: 0.2, appliesIf: 'ADHD', impact: 'a manic productive window ships a major asset', financial: 'positive' },
  { kind: 'Legal / regulatory hit', baseProb: 0.06, appliesIf: 'high-risk', impact: 'fines, shutdown risk', financial: 'negative' },
];

export const CHILDHOOD_EXPERIENCES = [
  { kind: 'Stable & supportive', effect: 'secure attachment, baseline resilience, lower trauma load' },
  { kind: 'Mixed', effect: 'some adversity + support; common; moderate resilience' },
  { kind: 'Difficult / traumatic', effect: 'higher drive + hypervigilance; higher burnout + relationship risk' },
  { kind: 'Privileged', effect: 'resources + network; risk of low friction tolerance' },
];

export const RELATIONSHIP_PATTERNS = [
  { pattern: 'Secure attachment', desc: 'stable, trusting, low-drama partnerships', divorceRisk: 'lower' },
  { pattern: 'Anxious attachment', desc: 'fear of loss, over-investment, volatility', divorceRisk: 'higher' },
  { pattern: 'Avoidant attachment', desc: 'independence over intimacy, distance', divorceRisk: 'higher' },
  { pattern: 'Serial monogamy', desc: 'intense short cycles, repeated rebuilds', divorceRisk: 'higher' },
];

// Maxwell's 21 Irrefutable Laws of Leadership (condensed).
export const LEADERSHIP_LAWS = [
  'The Law of the Lid — your leadership ability caps your potential',
  'The Law of Influence — leadership is influence, nothing more',
  'The Law of Process — leaders develop daily, not in a day',
  'The Law of Navigation — chart the course before the journey',
  'The Law of Addition — leaders add value by serving others',
  'The Law of Solid Ground — trust is the foundation of leadership',
  'The Law of Respect — people follow stronger leaders',
  'The Law of Intuition — leaders read everything through a leadership lens',
  'The Law of Magnetism — who you are is who you attract',
  'The Law of Connection — touch a heart before you ask for a hand',
  'The Law of the Inner Circle — your potential = those closest to you',
  'The Law of the Picture — people do what people see',
  'The Law of Buy-In — people buy into the leader, then the vision',
  'The Law of Momentum — momentum is a leader\u2019s best friend',
  'The Law of Victory — leaders find a way to win',
  'The Law of Priorities — activity is not accomplishment',
  'The Law of Sacrifice — give up to go up',
  'The Law of Timing — when to lead is as important as what and where',
  'The Law of Explosive Growth — lead leaders to multiply',
  'The Law of Legacy — lasting value is measured by succession',
];

// The Hermetic / universal laws — the user referenced "universal law".
export const UNIVERSAL_LAWS = [
  'Law of Mentalism — the universe is mental; everything starts as a thought',
  'Law of Correspondence — as above, so below; inner patterns mirror outer results',
  'Law of Vibration — everything is energy in motion; momentum is real',
  'Law of Polarity — every outcome has an opposite; failure and success are poles of one thing',
  'Law of Rhythm — everything has cycles; after every peak a trough, after every trough a rise',
  'Law of Cause and Effect — nothing is random; today\u2019s choices are tomorrow\u2019s reality',
  'Law of Gender / Gestation — ideas need time to gestate before they manifest',
];

export const COMMON_PASSIONS = [
  'building systems', 'writing', 'music', 'fitness', 'gaming', 'investing', 'teaching',
  'design', 'storytelling', 'competition', 'helping others', 'nature', 'technology',
  'cooking', 'travel', 'spirituality', 'art', 'sports', 'science', 'community',
];

export const SKILL_DOMAINS = [
  'sales', 'engineering', 'design', 'writing', 'marketing', 'finance', 'operations',
  'leadership', 'negotiation', 'data', 'public speaking', 'networking', 'crafting',
  'research', 'storytelling', 'systems thinking', 'emotional regulation', 'delegation',
];

// Build a compact context string the LLM can use to ground a simulation.
export function taxonomyContext() {
  return [
    `BIG_FIVE: ${BIG_FIVE.map((b) => b.trait).join(', ')}`,
    `ARCHETYPES: ${ENTREPRENEUR_ARCHETYPES.map((a) => a.name).join(', ')}`,
    `PROFILES: ${PSYCHOLOGICAL_PROFILES.map((p) => p.name).join(', ')}`,
    `DECISION_STYLES: ${DECISION_STYLES.map((d) => d.style).join(', ')}`,
    `LIFE_EVENTS: ${LIFE_EVENTS.map((e) => e.kind).join(', ')}`,
    `LAWS: leadership(${LEADERSHIP_LAWS.length}), universal(${UNIVERSAL_LAWS.length})`,
    `HABITS: 66% of daily behavior is habitual (cue-routine-reward loop)`,
  ].join('\n');
}