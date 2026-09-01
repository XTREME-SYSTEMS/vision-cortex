// Deterministic Shell — shared module for quality-gated LLM operations.
// The LLM touches only the fuzzy creative core; this module owns validation,
// scoring, retry, version history, and deterministic fallback.

/**
 * Validate an LLM output against a JSON schema and score its quality.
 * Returns { valid, score, issues }.
 */
export function validateAndScore(output, schema, minRequiredFields) {
  const issues = [];
  if (!output || typeof output !== 'object') {
    return { valid: false, score: 0, issues: ['Output is not an object'] };
  }

  // Check required fields
  const required = schema.required || minRequiredFields || [];
  for (const field of required) {
    if (output[field] === undefined || output[field] === null) {
      issues.push(`Missing required field: ${field}`);
    }
  }

  // Check array lengths (if schema specifies min items)
  if (schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties)) {
      if (prop.type === 'array' && Array.isArray(output[key])) {
        if (prop.minItems && output[key].length < prop.minItems) {
          issues.push(`${key} has ${output[key].length} items, expected at least ${prop.minItems}`);
        }
      }
    }
  }

  // Score: start at 100, deduct 15 per issue
  const score = Math.max(0, 100 - issues.length * 15);
  return { valid: issues.length === 0, score, issues };
}

/**
 * Generate a refined prompt for retry based on quality issues.
 */
export function refinePrompt(originalPrompt, issues) {
  const fixDirectives = issues.map(i => `- Fix: ${i}`).join('\n');
  return `${originalPrompt}\n\nPREVIOUS OUTPUT HAD THESE ISSUES — FIX THEM:\n${fixDirectives}\n\nEnsure the output addresses every issue above.`;
}

/**
 * Quality-gated LLM call with retry.
 * Calls the LLM, validates + scores, retries up to maxRetries if score < threshold.
 * Returns { output, score, attempts, usedFallback }.
 */
export async function qualityGatedLLM(core, opts) {
  const { prompt, schema, minScore = 80, maxRetries = 3, model, addContextFromInternet, minRequiredFields } = opts;
  let currentPrompt = prompt;
  let bestOutput = null;
  let bestScore = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const llmOpts = { prompt: currentPrompt, response_json_schema: schema };
      if (model) llmOpts.model = model;
      if (addContextFromInternet) llmOpts.add_context_from_internet = true;

      const output = await core.InvokeLLM(llmOpts);
      const { valid, score, issues } = validateAndScore(output, schema, minRequiredFields);

      if (score > bestScore) {
        bestOutput = output;
        bestScore = score;
      }

      if (valid && score >= minScore) {
        return { output, score, attempts: attempt + 1, usedFallback: false };
      }

      // Refine prompt for retry
      if (attempt < maxRetries) {
        currentPrompt = refinePrompt(prompt, issues);
      }
    } catch (e) {
      // LLM call failed, try again
      if (attempt < maxRetries) {
        currentPrompt = `${prompt}\n\nPrevious attempt failed with error: ${e.message}. Please try again.`;
      }
    }
  }

  // All retries exhausted — return best output even if below threshold
  return { output: bestOutput, score: bestScore, attempts: maxRetries + 1, usedFallback: bestScore < minScore };
}

/**
 * Push old value to version history before overwriting.
 * Returns the updated data object with version_history appended.
 */
export function withVersionHistory(currentRecord, field, newValue) {
  const history = currentRecord.version_history || [];
  const oldValue = currentRecord[field];

  if (oldValue !== undefined && oldValue !== null) {
    history.push({
      field,
      old_value: oldValue,
      timestamp: new Date().toISOString(),
    });
  }

  return { [field]: newValue, version_history: history };
}

/**
 * Uniqueness check — hash a string and compare against existing set.
 * Returns { isUnique, similarity, matchedAgainst }.
 */
export function checkUniqueness(content, existingContents, threshold = 0.7) {
  const contentHash = simpleHash(content);
  const contentWords = new Set(content.toLowerCase().split(/\s+/));

  for (const existing of existingContents) {
    const existingWords = new Set(existing.toLowerCase().split(/\s+/));
    const intersection = [...contentWords].filter(w => existingWords.has(w));
    const union = new Set([...contentWords, ...existingWords]);
    const similarity = intersection.length / union.size;

    if (similarity > threshold) {
      return { isUnique: false, similarity, matchedAgainst: existing };
    }
  }

  return { isUnique: true, similarity: 0, matchedAgainst: null };
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}