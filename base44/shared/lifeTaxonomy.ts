// =============================================================================
// Vision Cortex — Life Taxonomy
// Exhaustive, research-grounded taxonomy of life-changing events, good
// choices, and bad choices for the Life Lab Monte Carlo engine.
//
// Sources:
//  - SSA Period Life Table 2023 (annual probability of death within one year)
//  - Harvard Study of Adult Development (80-yr longitudinal: relationships,
//    smoking, alcohol, marriage quality → health & longevity)
//  - Our World in Data: Happiness & Life Satisfaction (event adaptation,
//    unemployment lasting negative shock)
//  - Life-course sociology (age-graded transitions: childhood → adolescence →
//    adulthood → old age)
//  - Behavioral economics / financial-decision literature (savings rate,
//    lifestyle inflation, college wage premium, divorce wealth destruction)
// =============================================================================

// --- SSA 2023 period life table: annual probability of death within one year ---
// Index = age (0..100). male/female.
export const MORTALITY = {
  male: [0.006015,0.000479,0.000320,0.000249,0.000194,0.000159,0.000137,0.000125,0.000120,0.000120,0.000125,0.000140,0.000173,0.000233,0.000327,0.000463,0.000634,0.000819,0.000999,0.001138,0.001235,0.001315,0.001378,0.001439,0.001509,0.001595,0.001685,0.001783,0.001876,0.001970,0.002085,0.002202,0.002308,0.002407,0.002490,0.002577,0.002665,0.002764,0.002864,0.002987,0.003115,0.003253,0.003419,0.003600,0.003777,0.003931,0.004073,0.004245,0.004477,0.004795,0.005126,0.005496,0.005917,0.006404,0.006923,0.007491,0.008173,0.008938,0.009714,0.010494,0.011337,0.012232,0.013196,0.014229,0.015316,0.016455,0.017574,0.018735,0.019981,0.021366,0.022903,0.024615,0.026504,0.028648,0.031071,0.033802,0.037010,0.041158,0.045461,0.050346,0.055633,0.061757,0.068358,0.075420,0.083364,0.092680,0.103459,0.115502,0.129018,0.143810,0.159458,0.176551,0.195360,0.216286,0.238799,0.262268,0.286291,0.310944,0.332325,0.349036,0.366568],
  female: [0.005125,0.000392,0.000229,0.000188,0.000155,0.000133,0.000115,0.000105,0.000100,0.000098,0.000101,0.000126,0.000152,0.000188,0.000229,0.000273,0.000323,0.000372,0.000410,0.000441,0.000476,0.000513,0.000546,0.000582,0.000609,0.000641,0.000683,0.000740,0.000808,0.000878,0.000947,0.001018,0.001089,0.001154,0.001209,0.001263,0.001347,0.001438,0.001533,0.001643,0.001742,0.001845,0.001954,0.002075,0.002187,0.002306,0.002438,0.002595,0.002791,0.003030,0.003288,0.003554,0.003847,0.004172,0.004532,0.004923,0.005365,0.005815,0.006333,0.006923,0.007555,0.008220,0.008881,0.009514,0.010188,0.010880,0.011659,0.012543,0.013581,0.014769,0.016153,0.017705,0.019495,0.021533,0.023846,0.026458,0.029700,0.033135,0.036982,0.041183,0.045959,0.051282,0.057262,0.064107,0.071752,0.080490,0.090566,0.102204,0.115178,0.129176,0.144229,0.160353,0.177635,0.196502,0.216846,0.238750,0.261359,0.283899,0.306491,0.329680],
};

// =============================================================================
// LIFE EVENTS — every life-changing event that typically occurs, 0→100.
// baseProb = annual probability at the midpoint of the age window (a person
// in that window has this chance per year). The engine scales probability by
// age within the window and by the user's config + prior events.
// impacts: nw = net-worth delta (USD), health/happy/rel = -100..+100 shift.
// repeat: can occur more than once. cascade: id of event(s) this can trigger.
// =============================================================================
export const LIFE_EVENTS = [
  // --- Early childhood (0–5) ---
  { id: 'premature_birth', label: 'Born premature / low birth weight', category: 'childhood', ageMin: 0, ageMax: 0, baseProb: 0.10, impacts: { nw: -5000, health: -8, happy: 0, rel: 0 }, repeat: false },
  { id: 'childhood_illness', label: 'Serious childhood illness', category: 'childhood', ageMin: 0, ageMax: 8, baseProb: 0.04, impacts: { nw: -15000, health: -10, happy: -5, rel: 0 }, repeat: false },
  { id: 'parents_divorce', label: 'Parents divorce', category: 'childhood', ageMin: 3, ageMax: 17, baseProb: 0.03, impacts: { nw: -2000, health: -3, happy: -12, rel: -8 }, repeat: false, cascade: 'mental_health_onset' },
  { id: 'abuse_neglect', label: 'Abuse or neglect', category: 'childhood', ageMin: 0, ageMax: 14, baseProb: 0.012, impacts: { nw: -10000, health: -15, happy: -25, rel: -20 }, repeat: false, cascade: 'mental_health_onset' },
  { id: 'sibling_born', label: 'Sibling born', category: 'childhood', ageMin: 1, ageMax: 10, baseProb: 0.06, impacts: { nw: -3000, health: 0, happy: 3, rel: 5 }, repeat: true },
  { id: 'family_move', label: 'Family relocates', category: 'childhood', ageMin: 2, ageMax: 16, baseProb: 0.05, impacts: { nw: -2000, health: 0, happy: -4, rel: -6 }, repeat: true },

  // --- Adolescence (10–19) ---
  { id: 'puberty', label: 'Puberty', category: 'adolescence', ageMin: 10, ageMax: 14, baseProb: 0.95, impacts: { nw: 0, health: 0, happy: -3, rel: 0 }, repeat: false },
  { id: 'first_relationship', label: 'First romantic relationship', category: 'adolescence', ageMin: 13, ageMax: 19, baseProb: 0.20, impacts: { nw: 0, health: 0, happy: 8, rel: 6 }, repeat: true },
  { id: 'bullying', label: 'Bullying experienced', category: 'adolescence', ageMin: 9, ageMax: 17, baseProb: 0.05, impacts: { nw: 0, health: -4, happy: -15, rel: -10 }, repeat: false, cascade: 'mental_health_onset' },
  { id: 'first_job', label: 'First part-time job', category: 'adolescence', ageMin: 14, ageMax: 19, baseProb: 0.30, impacts: { nw: 2000, health: 0, happy: 4, rel: 2 }, repeat: false },
  { id: 'teen_pregnancy', label: 'Teen pregnancy / parenthood', category: 'adolescence', ageMin: 14, ageMax: 19, baseProb: 0.01, impacts: { nw: -20000, health: -5, happy: -10, rel: -5 }, repeat: false, cascade: 'dropout' },
  { id: 'sports_injury', label: 'Serious sports injury', category: 'adolescence', ageMin: 10, ageMax: 22, baseProb: 0.03, impacts: { nw: -8000, health: -8, happy: -6, rel: 0 }, repeat: false },
  { id: 'mental_health_onset', label: 'Depression / anxiety onset', category: 'adolescence', ageMin: 12, ageMax: 40, baseProb: 0.04, impacts: { nw: -5000, health: -8, happy: -20, rel: -8 }, repeat: false },
  { id: 'substance_experiment', label: 'Substance experimentation', category: 'adolescence', ageMin: 13, ageMax: 22, baseProb: 0.25, impacts: { nw: -1000, health: -3, happy: 2, rel: 2 }, repeat: false, cascade: 'addiction' },
  { id: 'dropout', label: 'Dropped out of high school', category: 'adolescence', ageMin: 15, ageMax: 19, baseProb: 0.02, impacts: { nw: -250000, health: -5, happy: -8, rel: -3 }, repeat: false },

  // --- Young adulthood (18–30) ---
  { id: 'graduate_hs', label: 'Graduated high school', category: 'young_adult', ageMin: 17, ageMax: 19, baseProb: 0.85, impacts: { nw: 0, health: 0, happy: 5, rel: 2 }, repeat: false },
  { id: 'college_degree', label: 'Earned college degree', category: 'young_adult', ageMin: 21, ageMax: 25, baseProb: 0.35, impacts: { nw: -80000, health: 0, happy: 6, rel: 4 }, repeat: false },
  { id: 'grad_degree', label: 'Earned graduate degree', category: 'young_adult', ageMin: 24, ageMax: 30, baseProb: 0.12, impacts: { nw: -120000, health: 0, happy: 4, rel: 2 }, repeat: false },
  { id: 'first_real_job', label: 'Started first career job', category: 'young_adult', ageMin: 18, ageMax: 25, baseProb: 0.70, impacts: { nw: 35000, health: 0, happy: 8, rel: 2 }, repeat: false },
  { id: 'leave_home', label: 'Moved out of parents’ home', category: 'young_adult', ageMin: 18, ageMax: 24, baseProb: 0.60, impacts: { nw: -8000, health: 0, happy: 6, rel: 0 }, repeat: false },
  { id: 'engagement', label: 'Got engaged', category: 'young_adult', ageMin: 20, ageMax: 40, baseProb: 0.08, impacts: { nw: -5000, health: 0, happy: 12, rel: 8 }, repeat: false },
  { id: 'marriage', label: 'Got married', category: 'young_adult', ageMin: 20, ageMax: 45, baseProb: 0.10, impacts: { nw: 20000, health: 2, happy: 15, rel: 12 }, repeat: false },
  { id: 'first_child', label: 'Had first child', category: 'young_adult', ageMin: 22, ageMax: 42, baseProb: 0.08, impacts: { nw: -25000, health: -2, happy: 12, rel: 6 }, repeat: false },
  { id: 'additional_child', label: 'Had another child', category: 'young_adult', ageMin: 24, ageMax: 42, baseProb: 0.06, impacts: { nw: -22000, health: -2, happy: 8, rel: 4 }, repeat: true },
  { id: 'career_change', label: 'Changed careers', category: 'young_adult', ageMin: 22, ageMax: 55, baseProb: 0.04, impacts: { nw: -15000, health: 0, happy: 4, rel: 0 }, repeat: true },
  { id: 'military_service', label: 'Military service', category: 'young_adult', ageMin: 18, ageMax: 28, baseProb: 0.03, impacts: { nw: 15000, health: -3, happy: -2, rel: 4 }, repeat: false },
  { id: 'startup_founded', label: 'Founded a startup', category: 'young_adult', ageMin: 22, ageMax: 50, baseProb: 0.03, impacts: { nw: -40000, health: -5, happy: 6, rel: -2 }, repeat: true, cascade: 'business_exit' },
  { id: 'travel_year', label: 'Year living abroad', category: 'young_adult', ageMin: 18, ageMax: 35, baseProb: 0.04, impacts: { nw: -12000, health: 0, happy: 10, rel: 4 }, repeat: false },

  // --- Midlife (30–60) ---
  { id: 'divorce', label: 'Divorced', category: 'midlife', ageMin: 25, ageMax: 60, baseProb: 0.025, impacts: { nw: -120000, health: -6, happy: -18, rel: -15 }, repeat: true, cascade: 'mental_health_onset' },
  { id: 'remarriage', label: 'Remarried', category: 'midlife', ageMin: 28, ageMax: 65, baseProb: 0.04, impacts: { nw: 15000, health: 2, happy: 10, rel: 8 }, repeat: false },
  { id: 'promotion', label: 'Major promotion', category: 'midlife', ageMin: 28, ageMax: 58, baseProb: 0.05, impacts: { nw: 25000, health: -2, happy: 6, rel: 0 }, repeat: true },
  { id: 'layoff', label: 'Laid off / job loss', category: 'midlife', ageMin: 25, ageMax: 62, baseProb: 0.04, impacts: { nw: -40000, health: -5, happy: -15, rel: -4 }, repeat: true, cascade: 'mental_health_onset' },
  { id: 'career_pivot', label: 'Major career pivot', category: 'midlife', ageMin: 35, ageMax: 55, baseProb: 0.03, impacts: { nw: -20000, health: 0, happy: 5, rel: 0 }, repeat: false },
  { id: 'midlife_crisis', label: 'Midlife crisis', category: 'midlife', ageMin: 38, ageMax: 52, baseProb: 0.04, impacts: { nw: -15000, health: -3, happy: -8, rel: -6 }, repeat: false, cascade: 'divorce' },
  { id: 'affair', label: 'Extramarital affair', category: 'midlife', ageMin: 30, ageMax: 58, baseProb: 0.03, impacts: { nw: -5000, health: -2, happy: -4, rel: -18 }, repeat: false, cascade: 'divorce' },
  { id: 'health_scare', label: 'Serious health scare (cancer/heart)', category: 'midlife', ageMin: 35, ageMax: 80, baseProb: 0.02, impacts: { nw: -60000, health: -25, happy: -15, rel: 2 }, repeat: false },
  { id: 'parent_death', label: 'Parent died', category: 'midlife', ageMin: 30, ageMax: 65, baseProb: 0.04, impacts: { nw: 30000, health: -3, happy: -20, rel: -5 }, repeat: true },
  { id: 'caregiving_parent', label: 'Became caregiver for parent', category: 'midlife', ageMin: 38, ageMax: 65, baseProb: 0.05, impacts: { nw: -20000, health: -8, happy: -10, rel: 4 }, repeat: false },
  { id: 'empty_nest', label: 'Last child left home', category: 'midlife', ageMin: 42, ageMax: 60, baseProb: 0.06, impacts: { nw: 5000, health: 0, happy: 4, rel: -3 }, repeat: false },
  { id: 'menopause', label: 'Menopause', category: 'midlife', ageMin: 45, ageMax: 55, baseProb: 0.08, impacts: { nw: 0, health: -4, happy: -5, rel: -2 }, repeat: false },
  { id: 'weight_gain', label: 'Significant weight gain', category: 'midlife', ageMin: 30, ageMax: 60, baseProb: 0.05, impacts: { nw: -3000, health: -10, happy: -6, rel: -2 }, repeat: false },
  { id: 'sobriety', label: 'Got sober / quit addiction', category: 'midlife', ageMin: 25, ageMax: 65, baseProb: 0.02, impacts: { nw: 8000, health: 18, happy: 12, rel: 8 }, repeat: false },
  { id: 'relocation_job', label: 'Relocated for a job', category: 'midlife', ageMin: 28, ageMax: 55, baseProb: 0.03, impacts: { nw: 20000, health: -2, happy: 0, rel: -8 }, repeat: true },
  { id: 'inheritance', label: 'Received inheritance', category: 'midlife', ageMin: 35, ageMax: 70, baseProb: 0.03, impacts: { nw: 80000, health: 0, happy: 5, rel: 0 }, repeat: true },
  { id: 'lawsuit', label: 'Sued / lawsuit', category: 'midlife', ageMin: 25, ageMax: 70, baseProb: 0.015, impacts: { nw: -45000, health: -5, happy: -12, rel: -3 }, repeat: false },
  { id: 'business_exit', label: 'Business exit / acquisition', category: 'midlife', ageMin: 28, ageMax: 65, baseProb: 0.01, impacts: { nw: 250000, health: 2, happy: 18, rel: 2 }, repeat: false },
  { id: 'bankruptcy', label: 'Filed bankruptcy', category: 'midlife', ageMin: 25, ageMax: 65, baseProb: 0.012, impacts: { nw: -100000, health: -8, happy: -20, rel: -8 }, repeat: false },

  // --- Late life (60–100) ---
  { id: 'retirement', label: 'Retired', category: 'late_life', ageMin: 60, ageMax: 70, baseProb: 0.15, impacts: { nw: -30000, health: 4, happy: 10, rel: 6 }, repeat: false },
  { id: 'spouse_death', label: 'Spouse / partner died', category: 'late_life', ageMin: 55, ageMax: 100, baseProb: 0.04, impacts: { nw: -20000, health: -10, happy: -30, rel: -25 }, repeat: true, cascade: 'mental_health_onset' },
  { id: 'grandchild_born', label: 'Grandchild born', category: 'late_life', ageMin: 48, ageMax: 75, baseProb: 0.08, impacts: { nw: -3000, health: 1, happy: 12, rel: 8 }, repeat: true },
  { id: 'downsize_home', label: 'Downsized home', category: 'late_life', ageMin: 60, ageMax: 80, baseProb: 0.04, impacts: { nw: 40000, health: 0, happy: 4, rel: 0 }, repeat: false },
  { id: 'assisted_living', label: 'Moved to assisted living', category: 'late_life', ageMin: 75, ageMax: 95, baseProb: 0.05, impacts: { nw: -60000, health: -5, happy: -8, rel: 4 }, repeat: false },
  { id: 'chronic_disease', label: 'Chronic disease (diabetes/dementia/arthritis)', category: 'late_life', ageMin: 55, ageMax: 95, baseProb: 0.06, impacts: { nw: -35000, health: -18, happy: -12, rel: -4 }, repeat: true },
  { id: 'stroke', label: 'Stroke', category: 'late_life', ageMin: 55, ageMax: 95, baseProb: 0.015, impacts: { nw: -50000, health: -30, happy: -18, rel: -6 }, repeat: false },
  { id: 'fall_injury', label: 'Serious fall injury', category: 'late_life', ageMin: 70, ageMax: 95, baseProb: 0.04, impacts: { nw: -25000, health: -15, happy: -10, rel: -2 }, repeat: true },
  { id: 'second_career', label: 'Started second career / encore work', category: 'late_life', ageMin: 60, ageMax: 75, baseProb: 0.04, impacts: { nw: 18000, health: 2, happy: 8, rel: 4 }, repeat: false },
  { id: 'volunteering', label: 'Became serious volunteer', category: 'late_life', ageMin: 60, ageMax: 85, baseProb: 0.06, impacts: { nw: -2000, health: 2, happy: 10, rel: 8 }, repeat: false },
  { id: 'reconciliation', label: 'Reconciled with estranged family', category: 'late_life', ageMin: 50, ageMax: 85, baseProb: 0.03, impacts: { nw: 0, health: 3, happy: 15, rel: 18 }, repeat: false },

  // --- Universal / can happen any adult age ---
  { id: 'car_accident', label: 'Serious car accident', category: 'universal', ageMin: 16, ageMax: 90, baseProb: 0.012, impacts: { nw: -15000, health: -12, happy: -8, rel: 0 }, repeat: true },
  { id: 'natural_disaster', label: 'Natural disaster (home damage)', category: 'universal', ageMin: 18, ageMax: 90, baseProb: 0.008, impacts: { nw: -30000, health: -4, happy: -10, rel: -2 }, repeat: true },
  { id: 'home_burglary', label: 'Home burglarized', category: 'universal', ageMin: 18, ageMax: 90, baseProb: 0.015, impacts: { nw: -6000, health: 0, happy: -8, rel: -2 }, repeat: true },
  { id: 'identity_theft', label: 'Identity theft', category: 'universal', ageMin: 18, ageMax: 85, baseProb: 0.02, impacts: { nw: -8000, health: -2, happy: -8, rel: 0 }, repeat: true },
  { id: 'friendship_betrayal', label: 'Close friend betrayal', category: 'universal', ageMin: 18, ageMax: 80, baseProb: 0.02, impacts: { nw: 0, health: -2, happy: -12, rel: -15 }, repeat: true },
  { id: 'religious_conversion', label: 'Religious / spiritual conversion', category: 'universal', ageMin: 16, ageMax: 80, baseProb: 0.01, impacts: { nw: -3000, health: 2, happy: 8, rel: 6 }, repeat: false },
  { id: 'lottery_win', label: 'Lottery / windfall win', category: 'universal', ageMin: 18, ageMax: 85, baseProb: 0.0008, impacts: { nw: 150000, health: 0, happy: 15, rel: -4 }, repeat: false },
  { id: 'gambling_loss', label: 'Major gambling loss', category: 'universal', ageMin: 18, ageMax: 80, baseProb: 0.008, impacts: { nw: -25000, health: -3, happy: -12, rel: -6 }, repeat: true, cascade: 'addiction' },
  { id: 'addiction', label: 'Developed addiction', category: 'universal', ageMin: 14, ageMax: 75, baseProb: 0.012, impacts: { nw: -30000, health: -20, happy: -22, rel: -15 }, repeat: false, cascade: 'bankruptcy' },
  { id: 'miscarriage', label: 'Miscarriage / stillbirth', category: 'universal', ageMin: 22, ageMax: 42, baseProb: 0.015, impacts: { nw: -3000, health: -4, happy: -18, rel: -6 }, repeat: true },
  { id: 'infertility', label: 'Infertility diagnosis', category: 'universal', ageMin: 28, ageMax: 42, baseProb: 0.02, impacts: { nw: -20000, health: -3, happy: -12, rel: -4 }, repeat: false },
  { id: 'adoption', label: 'Adopted a child', category: 'universal', ageMin: 28, ageMax: 50, baseProb: 0.01, impacts: { nw: -30000, health: -2, happy: 14, rel: 10 }, repeat: true },
  { id: 'coming_out', label: 'Came out (LGBTQ+)', category: 'universal', ageMin: 14, ageMax: 50, baseProb: 0.015, impacts: { nw: 0, health: 2, happy: 12, rel: 4 }, repeat: false },
  { id: 'gender_transition', label: 'Gender transition', category: 'universal', ageMin: 16, ageMax: 55, baseProb: 0.003, impacts: { nw: -40000, health: 5, happy: 15, rel: -6 }, repeat: false },
  { id: 'incarceration', label: 'Incarcerated', category: 'universal', ageMin: 16, ageMax: 65, baseProb: 0.006, impacts: { nw: -80000, health: -15, happy: -30, rel: -20 }, repeat: false },
  { id: 'victim_crime', label: 'Victim of violent crime', category: 'universal', ageMin: 12, ageMax: 80, baseProb: 0.008, impacts: { nw: -10000, health: -10, happy: -18, rel: -4 }, repeat: true, cascade: 'mental_health_onset' },
  { id: 'near_death', label: 'Near-death experience', category: 'universal', ageMin: 16, ageMax: 90, baseProb: 0.005, impacts: { nw: -20000, health: -8, happy: 10, rel: 6 }, repeat: false },
  { id: 'spiritual_awakening', label: 'Spiritual awakening', category: 'universal', ageMin: 25, ageMax: 85, baseProb: 0.01, impacts: { nw: -2000, health: 3, happy: 14, rel: 6 }, repeat: false },
  { id: 'immigration', label: 'Immigrated to new country', category: 'universal', ageMin: 18, ageMax: 65, baseProb: 0.01, impacts: { nw: -15000, health: -2, happy: 4, rel: -10 }, repeat: false },
];

// =============================================================================
// GOOD CHOICES — typical good human choices. Each applies a continuous
// modifier across the life: annual net-worth delta, health/happy/rel drift,
// and multipliers on event probabilities (e.g. exercise reduces health_scare).
// =============================================================================
export const GOOD_CHOICES = [
  { id: 'save_early', label: 'Start saving early (15% of income)', nwAnnual: 4200, healthDrift: 0, happyDrift: 1, relDrift: 0, mult: { bankruptcy: 0.5 } },
  { id: 'college_degree_choice', label: 'Get a college degree', nwAnnual: 9000, healthDrift: 0.5, happyDrift: 1, relDrift: 1, mult: { dropout: 0.1, layoff: 0.7 } },
  { id: 'marry_right', label: 'Marry the right person (stable marriage)', nwAnnual: 6000, healthDrift: 1, happyDrift: 4, relDrift: 5, mult: { divorce: 0.3, affair: 0.2, mental_health_onset: 0.6 } },
  { id: 'buy_home_early', label: 'Buy a home early', nwAnnual: 8000, healthDrift: 0, happyDrift: 2, relDrift: 2, mult: {} },
  { id: 'exercise_regularly', label: 'Exercise regularly', nwAnnual: -800, healthDrift: 3, happyDrift: 2, relDrift: 1, mult: { health_scare: 0.5, chronic_disease: 0.6, stroke: 0.6, fall_injury: 0.7, weight_gain: 0.4 } },
  { id: 'eat_well', label: 'Eat well / maintain healthy weight', nwAnnual: -600, healthDrift: 2.5, happyDrift: 1, relDrift: 0, mult: { health_scare: 0.6, chronic_disease: 0.6, weight_gain: 0.3 } },
  { id: 'index_invest', label: 'Invest in index funds', nwAnnual: 5500, healthDrift: 0, happyDrift: 1, relDrift: 0, mult: { bankruptcy: 0.4 } },
  { id: 'start_business', label: 'Start a business', nwAnnual: 3000, healthDrift: -1, happyDrift: 2, relDrift: -1, mult: { startup_founded: 2.5, business_exit: 2, layoff: 0.5 } },
  { id: 'build_friendships', label: 'Build strong friendships', nwAnnual: 0, healthDrift: 1, happyDrift: 3, relDrift: 6, mult: { mental_health_onset: 0.5, friendship_betrayal: 0.7 } },
  { id: 'planned_children', label: 'Have planned children', nwAnnual: -2000, healthDrift: 0, happyDrift: 3, relDrift: 4, mult: { teen_pregnancy: 0.1 } },
  { id: 'live_below_means', label: 'Live below your means', nwAnnual: 3500, healthDrift: 0, happyDrift: 1, relDrift: 0, mult: { bankruptcy: 0.4, weight_gain: 0.7 } },
  { id: 'preventive_care', label: 'Get preventive healthcare', nwAnnual: -400, healthDrift: 2, happyDrift: 0.5, relDrift: 0, mult: { health_scare: 0.5, chronic_disease: 0.5, stroke: 0.5, cancer: 0.6 } },
  { id: 'manage_stress', label: 'Learn to manage stress', nwAnnual: 0, healthDrift: 1.5, happyDrift: 3, relDrift: 2, mult: { mental_health_onset: 0.4, heart_attack: 0.6, midlife_crisis: 0.5 } },
  { id: 'further_education', label: 'Pursue further education', nwAnnual: 4000, healthDrift: 0, happyDrift: 1, relDrift: 1, mult: { layoff: 0.6 } },
  { id: 'network_actively', label: 'Network actively', nwAnnual: 2500, healthDrift: 0, happyDrift: 1, relDrift: 3, mult: { layoff: 0.5, promotion: 1.8, business_exit: 1.5 } },
  { id: 'life_insurance', label: 'Buy life insurance', nwAnnual: -500, healthDrift: 0, happyDrift: 0.5, relDrift: 1, mult: {} },
  { id: 'estate_plan', label: 'Create an estate plan', nwAnnual: 0, healthDrift: 0, happyDrift: 1, relDrift: 2, mult: { lawsuit: 0.6 } },
  { id: 'stay_married', label: 'Stay married / work on marriage', nwAnnual: 4000, healthDrift: 1, happyDrift: 2, relDrift: 4, mult: { divorce: 0.3, affair: 0.3 } },
  { id: 'move_opportunity', label: 'Move to an opportunity city', nwAnnual: 5000, healthDrift: 0, happyDrift: 1, relDrift: -2, mult: { promotion: 1.5, layoff: 0.7 } },
  { id: 'avoid_debt', label: 'Avoid consumer debt', nwAnnual: 2500, healthDrift: 0.5, happyDrift: 1.5, relDrift: 0, mult: { bankruptcy: 0.3, gambling_loss: 0.5 } },
  { id: 'emergency_fund', label: 'Keep an emergency fund', nwAnnual: 1500, healthDrift: 0, happyDrift: 1, relDrift: 0, mult: { bankruptcy: 0.4, layoff: 0.7 } },
  { id: 'max_retirement', label: 'Maximize retirement contributions', nwAnnual: 6000, healthDrift: 0, happyDrift: 1, relDrift: 0, mult: {} },
  { id: 'high_income_skill', label: 'Learn a high-income skill', nwAnnual: 7000, healthDrift: 0, happyDrift: 2, relDrift: 1, mult: { layoff: 0.5, promotion: 1.6 } },
  { id: 'mentor_others', label: 'Mentor others', nwAnnual: 0, healthDrift: 0.5, happyDrift: 2, relDrift: 4, mult: { business_exit: 1.3 } },
  { id: 'stay_close_family', label: 'Stay close to family', nwAnnual: 0, healthDrift: 1, happyDrift: 2, relDrift: 5, mult: { mental_health_onset: 0.6, reconciliation: 1.8 } },
  { id: 'practice_gratitude', label: 'Practice gratitude', nwAnnual: 0, healthDrift: 1, happyDrift: 3, relDrift: 2, mult: { mental_health_onset: 0.6, midlife_crisis: 0.6 } },
  { id: 'sleep_well', label: 'Sleep 7–8 hours', nwAnnual: 0, healthDrift: 2, happyDrift: 2, relDrift: 1, mult: { mental_health_onset: 0.5, health_scare: 0.7, weight_gain: 0.6 } },
  { id: 'no_smoking', label: 'Don’t smoke', nwAnnual: 1200, healthDrift: 3, happyDrift: 1, relDrift: 0, mult: { health_scare: 0.5, chronic_disease: 0.6, stroke: 0.6 } },
  { id: 'drink_moderately', label: 'Drink moderately or not at all', nwAnnual: 600, healthDrift: 2, happyDrift: 1, relDrift: 1, mult: { addiction: 0.3, liver_disease: 0.4, health_scare: 0.7 } },
  { id: 'wear_seatbelt', label: 'Wear a seatbelt', nwAnnual: 0, healthDrift: 0.5, happyDrift: 0, relDrift: 0, mult: { car_accident: 0.6 } },
  { id: 'get_vaccinated', label: 'Stay vaccinated', nwAnnual: -100, healthDrift: 1.5, happyDrift: 0, relDrift: 0, mult: { childhood_illness: 0.5, chronic_disease: 0.7 } },
  { id: 'dental_care', label: 'Consistent dental care', nwAnnual: -500, healthDrift: 1.5, happyDrift: 0.5, relDrift: 0, mult: { chronic_disease: 0.8 } },
  { id: 'therapy', label: 'Mental health therapy', nwAnnual: -1200, healthDrift: 1, happyDrift: 4, relDrift: 3, mult: { mental_health_onset: 0.3, midlife_crisis: 0.5, addiction: 0.4 } },
  { id: 'financial_literacy', label: 'Financial literacy education', nwAnnual: 3000, healthDrift: 0, happyDrift: 1, relDrift: 0, mult: { bankruptcy: 0.3, gambling_loss: 0.3, identity_theft: 0.6 } },
  { id: 'diversify_income', label: 'Diversify income streams', nwAnnual: 3000, healthDrift: 0, happyDrift: 1, relDrift: 0, mult: { layoff: 0.5, bankruptcy: 0.5 } },
  { id: 'disability_insurance', label: 'Buy disability insurance', nwAnnual: -400, healthDrift: 0, happyDrift: 0.5, relDrift: 1, mult: {} },
  { id: 'plan_longterm_care', label: 'Plan for long-term care', nwAnnual: -1500, healthDrift: 0, happyDrift: 1, relDrift: 1, mult: { assisted_living: 0.6, fall_injury: 0.7 } },
];

// =============================================================================
// BAD CHOICES — typical bad human choices. Negative annual modifiers and
// multipliers >1 on harmful events.
// =============================================================================
export const BAD_CHOICES = [
  { id: 'dropout_choice', label: 'Drop out of high school', nwAnnual: -12000, healthDrift: -1, happyDrift: -2, relDrift: -1, mult: { dropout: 5, layoff: 1.8, incarceration: 2.5 } },
  { id: 'teen_pregnancy_choice', label: 'Teen pregnancy', nwAnnual: -8000, healthDrift: -2, happyDrift: -4, relDrift: -3, mult: { teen_pregnancy: 8, dropout: 3 } },
  { id: 'drug_addiction', label: 'Drug addiction', nwAnnual: -15000, healthDrift: -8, happyDrift: -12, relDrift: -10, mult: { addiction: 6, bankruptcy: 3, incarceration: 4, health_scare: 2, mental_health_onset: 3 } },
  { id: 'smoking', label: 'Smoking', nwAnnual: -2400, healthDrift: -5, happyDrift: -1, relDrift: 0, mult: { health_scare: 2.5, chronic_disease: 2, stroke: 2, cancer: 3 } },
  { id: 'gambling_addiction', label: 'Gambling addiction', nwAnnual: -9000, healthDrift: -2, happyDrift: -8, relDrift: -6, mult: { gambling_loss: 8, bankruptcy: 5, addiction: 3 } },
  { id: 'credit_debt', label: 'Credit card debt / lifestyle inflation', nwAnnual: -6000, healthDrift: -1, happyDrift: -2, relDrift: 0, mult: { bankruptcy: 3 } },
  { id: 'no_emergency_savings', label: 'No emergency savings', nwAnnual: -2000, healthDrift: -1, happyDrift: -2, relDrift: 0, mult: { bankruptcy: 2.5, layoff: 1.5 } },
  { id: 'day_trading', label: 'Day trading / speculation', nwAnnual: -5000, healthDrift: -1, happyDrift: -3, relDrift: 0, mult: { bankruptcy: 3, gambling_loss: 3 } },
  { id: 'unplanned_divorce', label: 'Divorce (unplanned)', nwAnnual: -10000, healthDrift: -3, happyDrift: -8, relDrift: -10, mult: { divorce: 4, affair: 2.5, mental_health_onset: 2 } },
  { id: 'affair_choice', label: 'Have an affair', nwAnnual: -3000, healthDrift: -1, happyDrift: -3, relDrift: -12, mult: { affair: 6, divorce: 3 } },
  { id: 'crime_incarceration', label: 'Commit crime / incarceration', nwAnnual: -20000, healthDrift: -8, happyDrift: -15, relDrift: -15, mult: { incarceration: 8, lawsuit: 3 } },
  { id: 'no_health_insurance', label: 'No health insurance', nwAnnual: 2000, healthDrift: -4, happyDrift: -2, relDrift: 0, mult: { health_scare: 2, chronic_disease: 2, stroke: 2, bankruptcy: 2.5 } },
  { id: 'avoid_preventive', label: 'Avoid preventive care', nwAnnual: 300, healthDrift: -3, happyDrift: -1, relDrift: 0, mult: { health_scare: 2, chronic_disease: 2, cancer: 2.5 } },
  { id: 'sedentary', label: 'Sedentary lifestyle', nwAnnual: 0, healthDrift: -4, happyDrift: -2, relDrift: 0, mult: { health_scare: 2, chronic_disease: 2, weight_gain: 3, stroke: 1.8, fall_injury: 1.5 } },
  { id: 'poor_diet', label: 'Poor diet / obesity', nwAnnual: -1500, healthDrift: -5, happyDrift: -3, relDrift: -1, mult: { health_scare: 2.5, chronic_disease: 2.5, weight_gain: 5, stroke: 2 } },
  { id: 'no_retirement_savings', label: 'No retirement savings', nwAnnual: -7000, healthDrift: -1, happyDrift: -2, relDrift: 0, mult: {} },
  { id: 'too_much_house', label: 'Buy too much house', nwAnnual: -8000, healthDrift: -1, happyDrift: -2, relDrift: -1, mult: { bankruptcy: 2, foreclosure: 3 } },
  { id: 'cosign_loans', label: 'Co-sign loans for others', nwAnnual: -3000, healthDrift: 0, happyDrift: -1, relDrift: -3, mult: { bankruptcy: 2, lawsuit: 2 } },
  { id: 'lend_to_family', label: 'Lend money to family', nwAnnual: -2500, healthDrift: 0, happyDrift: -1, relDrift: -4, mult: { lawsuit: 1.5 } },
  { id: 'quit_no_plan', label: 'Quit job without a plan', nwAnnual: -12000, healthDrift: -2, happyDrift: -4, relDrift: -2, mult: { layoff: 2, bankruptcy: 2, mental_health_onset: 2 } },
  { id: 'career_stagnation', label: 'Career stagnation', nwAnnual: -4000, healthDrift: -1, happyDrift: -3, relDrift: -1, mult: { layoff: 1.8 } },
  { id: 'isolate_socially', label: 'Isolate socially', nwAnnual: 0, healthDrift: -2, happyDrift: -6, relDrift: -12, mult: { mental_health_onset: 3, midlife_crisis: 2, friendship_betrayal: 0.5 } },
  { id: 'neglect_relationships', label: 'Neglect close relationships', nwAnnual: 0, healthDrift: -1, happyDrift: -4, relDrift: -10, mult: { divorce: 2, affair: 2, mental_health_onset: 2 } },
  { id: 'dui_texting', label: 'DUI / texting while driving', nwAnnual: -3000, healthDrift: -3, happyDrift: -2, relDrift: -2, mult: { car_accident: 5, incarceration: 3, victim_crime: 2 } },
  { id: 'no_seatbelt', label: 'Don’t wear a seatbelt', nwAnnual: 0, healthDrift: -1, happyDrift: 0, relDrift: 0, mult: { car_accident: 2.5 } },
  { id: 'skip_vaccines', label: 'Skip vaccinations', nwAnnual: 0, healthDrift: -2, happyDrift: 0, relDrift: 0, mult: { childhood_illness: 2, chronic_disease: 1.5 } },
  { id: 'avoid_mental_care', label: 'Avoid mental health care', nwAnnual: 0, healthDrift: -2, happyDrift: -5, relDrift: -3, mult: { mental_health_onset: 3, addiction: 2, midlife_crisis: 2 } },
  { id: 'children_too_early', label: 'Have children too early / unplanned', nwAnnual: -6000, healthDrift: -2, happyDrift: -3, relDrift: -2, mult: { teen_pregnancy: 4, dropout: 2, divorce: 1.5 } },
  { id: 'too_many_children', label: 'Have more children than you can support', nwAnnual: -7000, healthDrift: -2, happyDrift: -2, relDrift: -1, mult: { bankruptcy: 1.8, layoff: 1.3 } },
  { id: 'marry_too_young', label: 'Marry too young', nwAnnual: -2000, healthDrift: -1, happyDrift: -2, relDrift: -2, mult: { divorce: 2.5, mental_health_onset: 1.5 } },
  { id: 'marry_for_money', label: 'Marry for money', nwAnnual: 2000, healthDrift: -1, happyDrift: -6, relDrift: -8, mult: { divorce: 2, affair: 2, mental_health_onset: 2 } },
  { id: 'move_from_support', label: 'Move away from support network', nwAnnual: 1000, healthDrift: -1, happyDrift: -4, relDrift: -8, mult: { mental_health_onset: 1.8, layoff: 1.3 } },
  { id: 'overwork_burnout', label: 'Overwork to burnout', nwAnnual: 3000, healthDrift: -5, happyDrift: -6, relDrift: -5, mult: { mental_health_onset: 2.5, health_scare: 1.8, midlife_crisis: 2 } },
  { id: 'neglect_sleep', label: 'Chronically neglect sleep', nwAnnual: 0, healthDrift: -3, happyDrift: -3, relDrift: -1, mult: { mental_health_onset: 2, health_scare: 1.8, weight_gain: 1.8 } },
  { id: 'opioid_use', label: 'Opioid use', nwAnnual: -12000, healthDrift: -10, happyDrift: -14, relDrift: -10, mult: { addiction: 7, health_scare: 3, incarceration: 3, bankruptcy: 4 } },
  { id: 'vaping', label: 'Vaping', nwAnnual: -900, healthDrift: -3, happyDrift: -1, relDrift: 0, mult: { health_scare: 1.8, chronic_disease: 1.5 } },
  { id: 'unprotected_sex', label: 'Unprotected sex / STI risk', nwAnnual: -1000, healthDrift: -3, happyDrift: -2, relDrift: -2, mult: { teen_pregnancy: 3, infertility: 2 } },
  { id: 'no_estate_plan', label: 'No estate plan', nwAnnual: 0, healthDrift: 0, happyDrift: -1, relDrift: -2, mult: { lawsuit: 1.8 } },
  { id: 'identity_negligence', label: 'Identity-theft negligence', nwAnnual: -500, healthDrift: 0, happyDrift: -1, relDrift: 0, mult: { identity_theft: 3 } },
  { id: 'payday_loans', label: 'Payday loans', nwAnnual: -4000, healthDrift: -1, happyDrift: -3, relDrift: 0, mult: { bankruptcy: 4 } },
];

// =============================================================================
// DEMOGRAPHIC BASELINES — config presets that set starting conditions and
// modify event probabilities. The frontend sends a config object; the engine
// reads these to adjust the simulation.
// =============================================================================
export const CHILDHOOD_PRESETS = {
  poor:     { startNw: 0, healthStart: 70, happyStart: 60, relStart: 55, mult: { dropout: 2, teen_pregnancy: 2.5, addiction: 1.8, mental_health_onset: 1.6, incarceration: 2.5 }, nwMult: 0.7 },
  middle:   { startNw: 0, healthStart: 85, happyStart: 72, relStart: 70, mult: {}, nwMult: 1.0 },
  wealthy:  { startNw: 50000, healthStart: 92, happyStart: 78, relStart: 78, mult: { college_degree: 1.8, inheritance: 2, business_exit: 1.5 }, nwMult: 1.4 },
};

export const EDUCATION_PRESETS = {
  dropout:  { nwAnnual: 18000, mult: { dropout: 4, layoff: 1.8, incarceration: 2.5, college_degree: 0.1 } },
  hs:       { nwAnnual: 32000, mult: {} },
  college:  { nwAnnual: 52000, mult: { college_degree: 2, layoff: 0.7, promotion: 1.4 } },
  grad:     { nwAnnual: 72000, mult: { grad_degree: 2, college_degree: 2, layoff: 0.6, promotion: 1.6 } },
};

export const CAREER_PRESETS = {
  employee:     { nwAnnual: 1.0, vol: 0.3, mult: { promotion: 1.0, business_exit: 0.2, layoff: 1.0, startup_founded: 0.3 } },
  entrepreneur: { nwAnnual: 1.1, vol: 1.8, mult: { startup_founded: 4, business_exit: 3, bankruptcy: 2.5, layoff: 0.4, promotion: 0.3 } },
  executive:    { nwAnnual: 1.6, vol: 0.9, mult: { promotion: 2.2, business_exit: 1.8, layoff: 1.2, health_scare: 1.3, midlife_crisis: 1.4 } },
  creative:     { nwAnnual: 0.85, vol: 1.2, mult: { layoff: 1.3, career_change: 1.8, promotion: 0.5 } },
  gig:          { nwAnnual: 0.7, vol: 1.5, mult: { layoff: 1.6, bankruptcy: 1.5, health_scare: 1.2 } },
};

export const MARRIAGE_PRESETS = {
  never:   { mult: { marriage: 0.05, divorce: 0.05, first_child: 0.4, spouse_death: 0.05 } },
  early:   { mult: { marriage: 2.5, divorce: 1.8, first_child: 1.8, mental_health_onset: 1.2 } },
  late:    { mult: { marriage: 1.2, divorce: 0.7, first_child: 0.6, infertility: 1.8 } },
  right:   { mult: { marriage: 1.5, divorce: 0.3, affair: 0.3, mental_health_onset: 0.7, spouse_death: 1.1 } },
};

export const HEALTH_PRESETS = {
  excellent: { healthDrift: 1.5, mult: { health_scare: 0.5, chronic_disease: 0.5, stroke: 0.5, weight_gain: 0.4, fall_injury: 0.6 } },
  good:      { healthDrift: 0, mult: {} },
  poor:      { healthDrift: -2, mult: { health_scare: 2, chronic_disease: 2, stroke: 2, weight_gain: 2.5, fall_injury: 1.8 } },
};

export const FINANCE_PRESETS = {
  saver:    { nwMult: 1.4, mult: { bankruptcy: 0.4, gambling_loss: 0.5 } },
  balanced: { nwMult: 1.0, mult: {} },
  spender:  { nwMult: 0.6, mult: { bankruptcy: 2, gambling_loss: 1.8, credit_debt: 2.5 } },
};

export const SOCIAL_PRESETS = {
  connected: { happyDrift: 1.5, relDrift: 1.5, mult: { mental_health_onset: 0.5, midlife_crisis: 0.6, friendship_betrayal: 1.2 } },
  balanced:  { happyDrift: 0, relDrift: 0, mult: {} },
  isolated:  { happyDrift: -2, relDrift: -2, mult: { mental_health_onset: 2.5, midlife_crisis: 2, friendship_betrayal: 0.4 } },
};

export const RISK_PRESETS = {
  low:     { vol: 0.6, mult: { startup_founded: 0.3, gambling_loss: 0.4, business_exit: 0.5, car_accident: 0.7 } },
  medium:  { vol: 1.0, mult: {} },
  high:    { vol: 1.6, mult: { startup_founded: 2, gambling_loss: 2.5, business_exit: 2, bankruptcy: 1.8, car_accident: 1.4, lawsuit: 1.5 } },
  extreme: { vol: 2.4, mult: { startup_founded: 3, gambling_loss: 4, business_exit: 3, bankruptcy: 3, car_accident: 2, lawsuit: 2.5, incarceration: 2, health_scare: 1.5 } },
};

export const REGION_PRESETS = {
  urban:    { nwMult: 1.15, mult: { car_accident: 1.3, victim_crime: 1.5, career_change: 1.3, promotion: 1.2, natural_disaster: 1.2 } },
  suburban: { nwMult: 1.05, mult: {} },
  rural:    { nwMult: 0.85, mult: { health_scare: 1.3, car_accident: 1.4, chronic_disease: 1.2, natural_disaster: 1.3, layoff: 1.2 } },
};