import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  MORTALITY, LIFE_EVENTS, GOOD_CHOICES, BAD_CHOICES,
  CHILDHOOD_PRESETS, EDUCATION_PRESETS, CAREER_PRESETS, MARRIAGE_PRESETS,
  HEALTH_PRESETS, FINANCE_PRESETS, SOCIAL_PRESETS, RISK_PRESETS, REGION_PRESETS,
} from '../../shared/lifeTaxonomy.ts';

// --- Seeded RNG (mulberry32) so a given config reproduces the same 50 lives ---
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const gauss = (rng) => { // Box-Muller
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

// Build the aggregate event-probability multiplier from all active presets/choices
function buildMultipliers(cfg) {
  const m = {};
  const apply = (obj) => { if (!obj) return; for (const [k, v] of Object.entries(obj)) m[k] = (m[k] || 1) * v; };
  apply(CHILDHOOD_PRESETS[cfg.childhood]?.mult);
  apply(EDUCATION_PRESETS[cfg.education]?.mult);
  apply(CAREER_PRESETS[cfg.career]?.mult);
  apply(MARRIAGE_PRESETS[cfg.marriage]?.mult);
  apply(HEALTH_PRESETS[cfg.health]?.mult);
  apply(FINANCE_PRESETS[cfg.finance]?.mult);
  apply(SOCIAL_PRESETS[cfg.social]?.mult);
  apply(RISK_PRESETS[cfg.risk]?.mult);
  apply(REGION_PRESETS[cfg.region]?.mult);
  for (const id of cfg.choices?.good || []) {
    const c = GOOD_CHOICES.find((x) => x.id === id);
    if (c) apply(c.mult);
  }
  for (const id of cfg.choices?.bad || []) {
    const c = BAD_CHOICES.find((x) => x.id === id);
    if (c) apply(c.mult);
  }
  return m;
}

function simulateOne(rng, cfg, multipliers, lifeIndex) {
  const child = CHILDHOOD_PRESETS[cfg.childhood] || CHILDHOOD_PRESETS.middle;
  const edu = EDUCATION_PRESETS[cfg.education] || EDUCATION_PRESETS.hs;
  const career = CAREER_PRESETS[cfg.career] || CAREER_PRESETS.employee;
  const finance = FINANCE_PRESETS[cfg.finance] || FINANCE_PRESETS.balanced;
  const social = SOCIAL_PRESETS[cfg.social] || SOCIAL_PRESETS.balanced;
  const risk = RISK_PRESETS[cfg.risk] || RISK_PRESETS.medium;
  const region = REGION_PRESETS[cfg.region] || REGION_PRESETS.suburban;
  const healthP = HEALTH_PRESETS[cfg.health] || HEALTH_PRESETS.good;

  let netWorth = cfg.startNetWorth ?? child.startNw;
  let health = child.healthStart;
  let happy = child.happyStart;
  let rel = child.relStart;
  let alive = true;
  let diedAtAge = 100;
  let cause = 'old age';
  const occurred = new Set();
  const eventLog = [];
  const yearly = [];

  // aggregate continuous modifiers from active choices
  let nwAnnualChoice = 0, healthDriftChoice = 0, happyDriftChoice = 0, relDriftChoice = 0;
  for (const id of cfg.choices?.good || []) {
    const c = GOOD_CHOICES.find((x) => x.id === id);
    if (c) { nwAnnualChoice += c.nwAnnual; healthDriftChoice += c.healthDrift; happyDriftChoice += c.happyDrift; relDriftChoice += c.relDrift; }
  }
  for (const id of cfg.choices?.bad || []) {
    const c = BAD_CHOICES.find((x) => x.id === id);
    if (c) { nwAnnualChoice += c.nwAnnual; healthDriftChoice += c.healthDrift; happyDriftChoice += c.happyDrift; relDriftChoice += c.relDrift; }
  }

  for (let age = 0; age <= 100 && alive; age++) {
    // --- Mortality: SSA base × health penalty ---
    const baseMort = MORTALITY[cfg.sex]?.[Math.min(age, 100)] ?? 0.4;
    const healthFactor = clamp(1.6 - health / 100, 0.4, 3); // poor health → up to 3×
    if (rng() < baseMort * healthFactor) {
      alive = false; diedAtAge = age; cause = health < 40 ? 'health-related' : 'natural';
      yearly.push({ age, netWorth: Math.round(netWorth), health: Math.round(health), happy: Math.round(happy), rel: Math.round(rel), alive: false, events: [] });
      break;
    }

    const yearEvents = [];

    // --- Life events: roll each age-appropriate event ---
    for (const ev of LIFE_EVENTS) {
      if (age < ev.ageMin || age > ev.ageMax) continue;
      if (!ev.repeat && occurred.has(ev.id)) continue;
      // probability ramps across the window (peak at midpoint)
      const span = ev.ageMax - ev.ageMin || 1;
      const ramp = 1 - Math.abs((age - (ev.ageMin + ev.ageMax) / 2) / (span / 2)) * 0.5;
      let p = ev.baseProb * ramp * (multipliers[ev.id] || 1);
      // health/happiness influence some events
      if (ev.id === 'mental_health_onset') p *= clamp(1 + (60 - happy) / 100, 0.5, 2.5);
      if (ev.id === 'health_scare' || ev.id === 'stroke' || ev.id === 'chronic_disease') p *= clamp(1 + (70 - health) / 80, 0.5, 2.5);
      p = clamp(p, 0, 0.9);
      if (rng() < p) {
        occurred.add(ev.id);
        // impact magnitude jittered ±25%
        const j = 0.75 + rng() * 0.5;
        netWorth += ev.impacts.nw * j * (finance.nwMult || 1) * (child.nwMult || 1) * (region.nwMult || 1);
        health = clamp(health + ev.impacts.health * j, 0, 100);
        happy = clamp(happy + ev.impacts.happy * j, 0, 100);
        rel = clamp(rel + ev.impacts.rel * j, 0, 100);
        yearEvents.push({ id: ev.id, label: ev.label, age });
        eventLog.push({ id: ev.id, label: ev.label, age });
        // cascade: schedule a follow-on event chance boost handled next years via multiplier already
        if (ev.cascade && !occurred.has(ev.cascade)) {
          // immediate small chance to trigger the cascade this same year
          const casc = LIFE_EVENTS.find((x) => x.id === ev.cascade);
          if (casc && age >= casc.ageMin && age <= casc.ageMax && rng() < 0.3) {
            occurred.add(casc.id);
            netWorth += casc.impacts.nw * j * (finance.nwMult || 1);
            health = clamp(health + casc.impacts.health * j, 0, 100);
            happy = clamp(happy + casc.impacts.happy * j, 0, 100);
            rel = clamp(rel + casc.impacts.rel * j, 0, 100);
            yearEvents.push({ id: casc.id, label: casc.label, age });
            eventLog.push({ id: casc.id, label: casc.label, age });
          }
        }
      }
    }

    // --- Continuous income / drift ---
    // Income only begins at working age (education-dependent). Before that,
    // the person is a dependent — net worth holds at starting capital.
    const workAge = { dropout: 16, hs: 18, college: 22, grad: 25 }[cfg.education] || 18;
    const retireAge = 65;
    const earning = age >= workAge && age < retireAge;
    const baseIncome = edu.nwAnnual * career.nwAnnual * (finance.nwMult || 1) * (child.nwMult || 1) * (region.nwMult || 1);
    const vol = career.vol * risk.vol;
    const yearIncome = earning ? baseIncome + baseIncome * vol * gauss(rng) * 0.15 : 0;
    // living cost in retirement (drawdown), small childhood cost borne implicitly
    const livingCost = age >= retireAge ? -baseIncome * 0.5 : 0;
    // savings/investment choices only apply while earning
    const choiceAccrual = earning ? nwAnnualChoice : 0;
    netWorth += yearIncome + choiceAccrual + livingCost;
    // investment growth on positive net worth (real return ~5%, jittered)
    if (netWorth > 0) netWorth *= 1 + (0.05 + gauss(rng) * 0.02);
    else if (netWorth < 0) netWorth *= 1 + 0.08; // debt compounds faster

    // habit drifts (good/bad choices) kick in at adolescence (~13), not birth
    const habitAge = age >= 13;
    const hDrift = healthP.healthDrift + (habitAge ? healthDriftChoice : 0) - (age > 50 ? 0.4 : 0);
    health = clamp(health + hDrift, 0, 100);
    happy = clamp(happy + social.happyDrift + (habitAge ? happyDriftChoice : 0), 0, 100);
    rel = clamp(rel + social.relDrift + (habitAge ? relDriftChoice : 0), 0, 100);
    // mild mean-reversion (people adapt — Our World in Data)
    happy = happy + (68 - happy) * 0.04;
    rel = rel + (70 - rel) * 0.03;

    yearly.push({
      age,
      netWorth: Math.round(netWorth),
      health: Math.round(health),
      happy: Math.round(happy),
      rel: Math.round(rel),
      alive: true,
      events: yearEvents.map((e) => e.label),
    });
  }

  return {
    id: lifeIndex,
    diedAtAge,
    cause,
    finalNetWorth: Math.round(netWorth),
    finalHealth: Math.round(health),
    finalHappy: Math.round(happy),
    finalRel: Math.round(rel),
    eventCount: eventLog.length,
    topEvents: eventLog.slice(-8).map((e) => e.label),
    yearly,
  };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const cfg = {
      sex: body.sex === 'female' ? 'female' : 'male',
      childhood: ['poor', 'middle', 'wealthy'].includes(body.childhood) ? body.childhood : 'middle',
      education: ['dropout', 'hs', 'college', 'grad'].includes(body.education) ? body.education : 'hs',
      career: ['employee', 'entrepreneur', 'executive', 'creative', 'gig'].includes(body.career) ? body.career : 'employee',
      marriage: ['never', 'early', 'late', 'right'].includes(body.marriage) ? body.marriage : 'right',
      health: ['excellent', 'good', 'poor'].includes(body.health) ? body.health : 'good',
      finance: ['saver', 'balanced', 'spender'].includes(body.finance) ? body.finance : 'balanced',
      social: ['connected', 'balanced', 'isolated'].includes(body.social) ? body.social : 'balanced',
      risk: ['low', 'medium', 'high', 'extreme'].includes(body.risk) ? body.risk : 'medium',
      region: ['urban', 'suburban', 'rural'].includes(body.region) ? body.region : 'suburban',
      choices: {
        good: Array.isArray(body.choices?.good) ? body.choices.good : [],
        bad: Array.isArray(body.choices?.bad) ? body.choices.bad : [],
      },
      startNetWorth: Number(body.startNetWorth) || 0,
    };
    const simCount = Math.min(Math.max(Number(body.simulations) || 50, 1), 200);
    const seed = Number(body.seed) || 12345;

    const multipliers = buildMultipliers(cfg);
    const rng = mulberry32(seed);
    const lives = [];
    for (let i = 0; i < simCount; i++) lives.push(simulateOne(rng, cfg, multipliers, i));

    // --- Aggregate statistics ---
    const finals = lives.map((l) => l.finalNetWorth).sort((a, b) => a - b);
    const pct = (arr, q) => arr.length ? arr[Math.floor(q * (arr.length - 1))] : 0;
    const deaths = lives.map((l) => l.diedAtAge).sort((a, b) => a - b);
    const reach100 = lives.filter((l) => l.diedAtAge >= 100).length;
    const eventFreq = {};
    for (const l of lives) for (const e of l.topEvents) eventFreq[e] = (eventFreq[e] || 0) + 1;
    const topEvents = Object.entries(eventFreq).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([event, count]) => ({ event, count }));

    const stats = {
      p10: pct(finals, 0.10),
      p25: pct(finals, 0.25),
      p50: pct(finals, 0.50),
      p75: pct(finals, 0.75),
      p90: pct(finals, 0.90),
      mean: finals.reduce((a, b) => a + b, 0) / (finals.length || 1),
      min: finals[0] || 0,
      max: finals[finals.length - 1] || 0,
      medianAgeAtDeath: pct(deaths, 0.5),
      pctReach100: Math.round((reach100 / lives.length) * 100),
      avgFinalHealth: Math.round(lives.reduce((a, l) => a + l.finalHealth, 0) / lives.length),
      avgFinalHappy: Math.round(lives.reduce((a, l) => a + l.finalHappy, 0) / lives.length),
      avgFinalRel: Math.round(lives.reduce((a, l) => a + l.finalRel, 0) / lives.length),
      avgEventCount: +(lives.reduce((a, l) => a + l.eventCount, 0) / lives.length).toFixed(1),
      topEvents,
    };

    return Response.json({ config: cfg, simulations: simCount, lives, stats });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}