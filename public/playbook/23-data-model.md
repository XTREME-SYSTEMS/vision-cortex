# 23 — The Data Model

> The entities that hold the system's memory. Existing + new. All carry the built-in `id`, `created_date`, `updated_date`, `created_by_id`.

## Existing Entities (in use)

| Entity | Role |
|---|---|
| `Idea` | A discovered money-making opportunity. The Morning Feed's cards. |
| `AgentProfile` | The 13 Council agents — role, mission, personality, status. |
| `AgentLog` | The agents' action log — the audit trail. |
| `ChatMessage` | War Room messages (backend-only now). |
| `IntelFeed` | Scraped signals — the raw intelligence. |
| `Doctrine` | Compounded insights — the system's learned wisdom. |
| `Governance` | The charter / ethics / opsec rules. |
| `BuildQueue` | In-flight builds (the AutoBuilder queue). |
| `Trade` | Paper-trading positions. |
| `Portfolio` | Paper-trading portfolio state. |
| `Notification` | Owner alerts. |

## New Entities (to create)

### `Simulation`
The simulated future of a strategy. See chapter 19.
- `strategy_id` (string) → the Idea.
- `goal` (object) → the locked ultimate goal.
- `mode` (`forecast` | `reverse`).
- `target` (object) → for reverse mode.
- `horizons` (object) → `{ 1m, 3m, 6m, 1y, 3y, 5y, 10y }` each with revenue/costs/net_profit/cash_balance/key_events/risks/probability_of_goal.
- `decisions` (array) → the line items (category, label, value, options, chosen, financial_impact, life_impact).
- `base_case`, `best_case`, `worst_case` (objects).
- `committed` (boolean) → once true, becomes the AutoBuilder build spec.

### `UserProfile`
The onboarding profile + locked goal. See chapter 17.
- `user_id` (string).
- `vision_statement` (string).
- `goal` (object) → `{ kind, value, by_horizon }`.
- `answers` (array) → the questionnaire Q&A.
- `industry_focus`, `financial_focus`, `autonomy_level`, `risk_tolerance`, `time_horizon`.
- `brand_aesthetic`, `brand_voice`, `target_audience`.

### `SystemEnhancement`
The self-healing ledger. See chapter 25.
- `title`, `description`.
- `category` (`feature` | `hardening` | `optimization` | `healing` | `doctrine` | `integration`).
- `status` (`pending` | `in_progress` | `implemented` | `auditing` | `audited` | `failed` | `blocked` | `optimized`).
- `priority` (number), `source` (autonomous | manual).
- `implementation_plan`, `implementation_notes`.
- `audit_result` (object: passed, score, failures[]).
- `fix_attempts`, `max_fix_attempts`, `blocked_reason`.
- `last_action_at`, `build_order_step`.

### `RevenueEvent` (optional, or use Notification)
Records a payment against an idea/build — the learning signal.
- `idea_id`, `build_id`, `amount`, `currency`, `occurred_at`, `source`.

## RLS Policy (universal)

- **Read:** open to authenticated users (the app is single-tenant per owner).
- **Create/Update/Delete:** admin-only (`user_condition: { role: "admin" }`).
- `UserProfile`: read = owner only (`created_by_id` match); write = owner or admin.

## Storage Discipline

- Never store large content (base64, PDFs, blobs) in entity fields — upload via `UploadFile`, store the `file_url`.
- Generated brand assets, videos, screenshots → stored as file URLs, referenced in entities.
