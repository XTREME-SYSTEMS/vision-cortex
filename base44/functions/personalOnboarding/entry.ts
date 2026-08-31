import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { taxonomyContext } from '../../shared/humanTaxonomy.ts';

// personalOnboarding — the human-personality questionnaire. A curated sequence of
// questions about how the person decides, their risk, jobs, relationships,
// childhood, conditions (ADHD/bipolar/autism/etc.), passions, skills, traumas.
// On completion, synthesizes the answers into a persona profile (archetype,
// Big Five estimate, decision style, strengths, blind spots, entrepreneur fit).

const QUESTIONS = [
  {
    id: 'decision_style',
    question: 'When you face a big decision, what do you actually do?',
    options: ['I gather data and model it out', 'I trust my gut and move', 'I ask people I trust first', 'I decide fast and fix it later'],
  },
  {
    id: 'risk_tolerance',
    question: 'How do you feel about risk?',
    options: ['I protect what I have', 'I take calculated risks', 'High risk, high reward', 'I go all-in or nothing'],
  },
  {
    id: 'jobs_held',
    question: 'How many jobs have you held?',
    options: ['0-1', '2-4', '5-9', '10+'],
  },
  {
    id: 'longest_job',
    question: 'Longest you\u2019ve ever stayed at one job?',
    options: ['Under a year', '1-3 years', '3-7 years', '7+ years'],
  },
  {
    id: 'friendships',
    question: 'How many close friendships do you actually maintain?',
    options: ['1-2 tight ones', '3-5', '6-10', 'Many acquaintances, few close'],
  },
  {
    id: 'relationship_status',
    question: 'What\u2019s your relationship status?',
    options: ['Single', 'Married', 'Divorced', 'It\u2019s complicated'],
  },
  {
    id: 'childhood',
    question: 'How would you describe your childhood?',
    options: ['Stable and supportive', 'Mixed', 'Difficult or traumatic', 'Privileged'],
  },
  {
    id: 'education',
    question: 'Your education path?',
    options: ['High school', 'Some college', 'Degree or beyond', 'Self-taught'],
  },
  {
    id: 'conditions',
    question: 'Do any of these describe you? (pick what fits)',
    options: ['ADHD', 'Bipolar / mood swings', 'Autism spectrum', 'Dyslexia', 'Depression / anxiety', 'None of these'],
    multi: true,
  },
  {
    id: 'passions',
    question: 'What are your top passions? (a few words is fine)',
    free: true,
  },
  {
    id: 'skills',
    question: 'What skills do you bring? (a few words is fine)',
    free: true,
  },
  {
    id: 'traumas',
    question: 'Any major life events that shaped you? (optional)',
    free: true,
    optional: true,
  },
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'start';

    if (action === 'start') {
      return Response.json({ total: QUESTIONS.length, question: QUESTIONS[0] });
    }

    // action === 'answer' — { answers: [{question, answer}] }
    const answers = Array.isArray(body.answers) ? body.answers : [];
    const idx = answers.length;

    if (idx >= QUESTIONS.length) {
      // Synthesize the persona from all answers.
      const answerBlock = answers.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n');
      const prompt = `You are a personality scientist and entrepreneurial profiler. From these onboarding answers, synthesize a realistic persona profile.
${answerBlock}

Use this taxonomy as your reference:
${taxonomyContext()}

Produce a JSON persona with:
- archetype: one entrepreneurial archetype that best fits
- big_five: scores 0-100 for openness, conscientiousness, extraversion, agreeableness, neuroticism
- decision_style: one of Analytical, Intuitive, Impulsive, Collaborative, Deliberative
- risk_tolerance: low | medium | high | extreme
- strengths: 3-5 concrete strengths for building a business
- blind_spots: 2-4 realistic blind spots that could derail them
- entrepreneur_fit: 0-100 score for sustained entrepreneurial success
- summary: 2-3 sentences in plain language describing this person as a founder
Return JSON matching the schema.`;

      const res = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            archetype: { type: 'string' },
            big_five: {
              type: 'object',
              properties: {
                openness: { type: 'number' },
                conscientiousness: { type: 'number' },
                extraversion: { type: 'number' },
                agreeableness: { type: 'number' },
                neuroticism: { type: 'number' },
              },
            },
            decision_style: { type: 'string' },
            risk_tolerance: { type: 'string' },
            strengths: { type: 'array', items: { type: 'string' } },
            blind_spots: { type: 'array', items: { type: 'string' } },
            entrepreneur_fit: { type: 'number' },
            summary: { type: 'string' },
          },
          required: ['archetype', 'decision_style', 'risk_tolerance', 'summary'],
        },
      });

      // Persist the persona.
      const profile = await base44.entities.PersonaProfile.create({
        user_id: user.id,
        vision: body.vision || '',
        archetype: res.archetype,
        big_five: res.big_five,
        decision_style: res.decision_style,
        risk_tolerance: res.risk_tolerance,
        conditions: answers.find((a) => a.question.includes('describe you'))?.answer?.split(', ') || [],
        passions: (answers.find((a) => a.question.includes('passions'))?.answer || '').split(/[,;]/).map((s) => s.trim()).filter(Boolean),
        skills: (answers.find((a) => a.question.includes('skills'))?.answer || '').split(/[,;]/).map((s) => s.trim()).filter(Boolean),
        traumas: (answers.find((a) => a.question.includes('shaped you'))?.answer || '').split(/[,;]/).map((s) => s.trim()).filter(Boolean),
        strengths: res.strengths || [],
        blind_spots: res.blind_spots || [],
        entrepreneur_fit: res.entrepreneur_fit,
        answers,
        summary: res.summary,
        completed: true,
      });

      const conditionsAns = answers.find((a) => a.question.includes('describe you'))?.answer || '';
      const relAns = answers.find((a) => a.question.includes('relationship status') || a.question.includes('relationship status?'))?.answer || '';
      const enriched = {
        ...res,
        conditions: conditionsAns.split(', ').map((s) => s.trim()).filter(Boolean),
        relationship_status: relAns,
      };
      return Response.json({ completed: true, persona: enriched, profile_id: profile.id });
    }

    return Response.json({ question: QUESTIONS[idx] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}