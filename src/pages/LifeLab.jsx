import React, { useState, useEffect } from 'react';
import { FlaskConical, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ConfigPanel from '@/components/lifelab/ConfigPanel';
import StatsCards from '@/components/lifelab/StatsCards';
import TrajectoryChart from '@/components/lifelab/TrajectoryChart';
import EventFrequency from '@/components/lifelab/EventFrequency';
import LifeGrid from '@/components/lifelab/LifeGrid';
import PathComparison from '@/components/lifelab/PathComparison';

const DEFAULT_CFG = {
  sex: 'male',
  childhood: 'middle',
  education: 'college',
  career: 'employee',
  marriage: 'right',
  health: 'good',
  finance: 'saver',
  social: 'connected',
  risk: 'medium',
  region: 'suburban',
  startNetWorth: 0,
  seed: 12345,
  choices: { good: ['save_early', 'exercise_regularly', 'marry_right', 'no_smoking', 'index_invest'], bad: [] },
};

export default function LifeLab() {
  const [cfg, setCfg] = useState(DEFAULT_CFG);
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [choices, setChoices] = useState({ good: [], bad: [] });

  // fetch the choice catalogs from the backend taxonomy via a lightweight call
  useEffect(() => {
    // The catalogs live in the backend shared module; we mirror labels here so the
    // UI is self-contained and doesn't need a round-trip just to render toggles.
    setChoices({
      good: [
        { id: 'save_early', label: 'Start saving early (15% of income)' },
        { id: 'college_degree_choice', label: 'Get a college degree' },
        { id: 'marry_right', label: 'Marry the right person (stable marriage)' },
        { id: 'buy_home_early', label: 'Buy a home early' },
        { id: 'exercise_regularly', label: 'Exercise regularly' },
        { id: 'eat_well', label: 'Eat well / maintain healthy weight' },
        { id: 'index_invest', label: 'Invest in index funds' },
        { id: 'start_business', label: 'Start a business' },
        { id: 'build_friendships', label: 'Build strong friendships' },
        { id: 'planned_children', label: 'Have planned children' },
        { id: 'live_below_means', label: 'Live below your means' },
        { id: 'preventive_care', label: 'Get preventive healthcare' },
        { id: 'manage_stress', label: 'Learn to manage stress' },
        { id: 'further_education', label: 'Pursue further education' },
        { id: 'network_actively', label: 'Network actively' },
        { id: 'life_insurance', label: 'Buy life insurance' },
        { id: 'estate_plan', label: 'Create an estate plan' },
        { id: 'stay_married', label: 'Stay married / work on marriage' },
        { id: 'move_opportunity', label: 'Move to an opportunity city' },
        { id: 'avoid_debt', label: 'Avoid consumer debt' },
        { id: 'emergency_fund', label: 'Keep an emergency fund' },
        { id: 'max_retirement', label: 'Maximize retirement contributions' },
        { id: 'high_income_skill', label: 'Learn a high-income skill' },
        { id: 'mentor_others', label: 'Mentor others' },
        { id: 'stay_close_family', label: 'Stay close to family' },
        { id: 'practice_gratitude', label: 'Practice gratitude' },
        { id: 'sleep_well', label: 'Sleep 7–8 hours' },
        { id: 'no_smoking', label: 'Don’t smoke' },
        { id: 'drink_moderately', label: 'Drink moderately or not at all' },
        { id: 'wear_seatbelt', label: 'Wear a seatbelt' },
        { id: 'get_vaccinated', label: 'Stay vaccinated' },
        { id: 'dental_care', label: 'Consistent dental care' },
        { id: 'therapy', label: 'Mental health therapy' },
        { id: 'financial_literacy', label: 'Financial literacy education' },
        { id: 'diversify_income', label: 'Diversify income streams' },
        { id: 'disability_insurance', label: 'Buy disability insurance' },
        { id: 'plan_longterm_care', label: 'Plan for long-term care' },
      ],
      bad: [
        { id: 'dropout_choice', label: 'Drop out of high school' },
        { id: 'teen_pregnancy_choice', label: 'Teen pregnancy' },
        { id: 'drug_addiction', label: 'Drug addiction' },
        { id: 'smoking', label: 'Smoking' },
        { id: 'gambling_addiction', label: 'Gambling addiction' },
        { id: 'credit_debt', label: 'Credit card debt / lifestyle inflation' },
        { id: 'no_emergency_savings', label: 'No emergency savings' },
        { id: 'day_trading', label: 'Day trading / speculation' },
        { id: 'unplanned_divorce', label: 'Divorce (unplanned)' },
        { id: 'affair_choice', label: 'Have an affair' },
        { id: 'crime_incarceration', label: 'Commit crime / incarceration' },
        { id: 'no_health_insurance', label: 'No health insurance' },
        { id: 'avoid_preventive', label: 'Avoid preventive care' },
        { id: 'sedentary', label: 'Sedentary lifestyle' },
        { id: 'poor_diet', label: 'Poor diet / obesity' },
        { id: 'no_retirement_savings', label: 'No retirement savings' },
        { id: 'too_much_house', label: 'Buy too much house' },
        { id: 'cosign_loans', label: 'Co-sign loans for others' },
        { id: 'lend_to_family', label: 'Lend money to family' },
        { id: 'quit_no_plan', label: 'Quit job without a plan' },
        { id: 'career_stagnation', label: 'Career stagnation' },
        { id: 'isolate_socially', label: 'Isolate socially' },
        { id: 'neglect_relationships', label: 'Neglect close relationships' },
        { id: 'dui_texting', label: 'DUI / texting while driving' },
        { id: 'no_seatbelt', label: 'Don’t wear a seatbelt' },
        { id: 'skip_vaccines', label: 'Skip vaccinations' },
        { id: 'avoid_mental_care', label: 'Avoid mental health care' },
        { id: 'children_too_early', label: 'Have children too early / unplanned' },
        { id: 'too_many_children', label: 'Have more children than you can support' },
        { id: 'marry_too_young', label: 'Marry too young' },
        { id: 'marry_for_money', label: 'Marry for money' },
        { id: 'move_from_support', label: 'Move away from support network' },
        { id: 'overwork_burnout', label: 'Overwork to burnout' },
        { id: 'neglect_sleep', label: 'Chronically neglect sleep' },
        { id: 'opioid_use', label: 'Opioid use' },
        { id: 'vaping', label: 'Vaping' },
        { id: 'unprotected_sex', label: 'Unprotected sex / STI risk' },
        { id: 'no_estate_plan', label: 'No estate plan' },
        { id: 'identity_negligence', label: 'Identity-theft negligence' },
        { id: 'payday_loans', label: 'Payday loans' },
      ],
    });
  }, []);

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('lifeChoiceGenerator', { ...cfg, simulations: 50 });
      setResult(res.data);
    } catch (e) {
      setError(e.message || 'Simulation failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <FlaskConical className="w-4 h-4" /> Life Lab
        </div>
        <h1 className="font-display text-4xl mt-1">The Life Simulation Machine</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          A research-grounded Monte Carlo engine that generates 50 full lives from birth to 100.
          Grounded in the SSA mortality table, the Harvard happiness study, and life-course
          sociology. Change any variable — every choice cascades through every outcome.
        </p>
      </header>

      <div className="grid lg:grid-cols-[380px_1fr] gap-8 items-start">
        <div className="lg:sticky lg:top-20">
          <ConfigPanel
            cfg={cfg}
            setCfg={setCfg}
            onRun={run}
            running={running}
            goodChoices={choices.good}
            badChoices={choices.bad}
          />
        </div>

        <div className="space-y-4 min-h-[60vh]">
          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-300">
              {error}
            </div>
          )}
          {!result && !running && (
            <div className="rounded-xl border border-dashed border-border p-16 text-center text-muted-foreground">
              Configure your variables and generate 50 lives to see the statistics.
            </div>
          )}
          {running && (
            <div className="rounded-xl border border-dashed border-border p-16 text-center text-muted-foreground flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin" />
              Running 50 Monte Carlo simulations, 0→100 years each…
            </div>
          )}
          {result && (
            <>
              <StatsCards stats={result.stats} count={result.simulations} />
              <TrajectoryChart lives={result.lives} />
              <PathComparison lives={result.lives} />
              <div className="grid md:grid-cols-2 gap-4">
                <EventFrequency stats={result.stats} />
                <LifeGrid lives={result.lives} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}