#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Vision Cortex — Full Provisioning Script
# "One command from nothing to live"
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
STATE_FILE="$SCRIPT_DIR/.state.json"
ENV_PROD_FILE="$SCRIPT_DIR/.env.production"
ENV_EXAMPLE_FILE="$REPO_ROOT/.env.example"
MIGRATION_FILE="$REPO_ROOT/supabase/migrations/0001_init.sql"

# Default Options
DRY_RUN=false
STATUS_MODE=false
SKIP_DB=false
ORG_ID=""
ORG_NAME=""
PROJECT_NAME="visioncortex"
REGION="us-east-1"
DOMAIN="thevisioncortex.com"

# Tokens
SUPABASE_TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
VERCEL_TOKEN_VAL="${VERCEL_TOKEN:-}"
RAILWAY_TOKEN_VAL="${RAILWAY_TOKEN:-}"

# Usage help
show_help() {
  cat << 'EOF'
Vision Cortex Provisioning System

Usage:
  ./provision/provision.sh [options]

Environment Variables:
  SUPABASE_ACCESS_TOKEN   Supabase Access Token (Required for API provisioning)
  VERCEL_TOKEN            Vercel API Token (Optional; falls back to manual CLI)
  RAILWAY_TOKEN           Railway API Token (Optional; falls back to manual CLI)

Options:
  --org-id <id>           Target Supabase Organization ID
  --org-name <name>       Target Supabase Organization Name (matches exact/case-insensitive)
  --project-name <name>   Project name for Supabase and Vercel (Default: visioncortex)
  --region <region>       Supabase region (Default: us-east-1)
  --domain <domain>       Vercel domain name (Default: thevisioncortex.com)
  --skip-db               Skip applying database migration (supabase/migrations/0001_init.sql)
  --dry-run               Print planned provisioning steps without executing network requests
  --status                Read .state.json and query live API status for provisioned services
  --help                  Show this help documentation

Examples:
  # Perform a dry-run
  ./provision/provision.sh --dry-run

  # Full automated provision
  SUPABASE_ACCESS_TOKEN=sbp_xxx VERCEL_TOKEN=ver_xxx ./provision/provision.sh

  # Check status of existing deployment
  ./provision/provision.sh --status
EOF
}

# Python Helper Functions for JSON and State Management
py_state_get() {
  local key="$1"
  python3 -c "
import json, os, sys
path = sys.argv[1]
key_path = sys.argv[2].split('.')
if not os.path.exists(path):
    sys.exit(0)
try:
    with open(path, 'r') as f:
        data = json.load(f)
    val = data
    for k in key_path:
        if isinstance(val, dict) and k in val:
            val = val[k]
        else:
            val = ''
            break
    print(val if val is not None else '')
except Exception:
    sys.exit(0)
" "$STATE_FILE" "$key"
}

py_state_set() {
  local key="$1"
  local val="$2"
  python3 -c "
import json, os, sys
path = sys.argv[1]
key_path = sys.argv[2].split('.')
val = sys.argv[3]

data = {}
if os.path.exists(path):
    try:
        with open(path, 'r') as f:
            data = json.load(f)
    except Exception:
        data = {}

curr = data
for k in key_path[:-1]:
    if k not in curr or not isinstance(curr[k], dict):
        curr[k] = {}
    curr = curr[k]
curr[key_path[-1]] = val

os.makedirs(os.path.dirname(path), exist_ok=True)
with open(path, 'w') as f:
    json.dump(data, f, indent=2)
" "$STATE_FILE" "$key" "$val"
}

py_update_env_file() {
  python3 -c "
import os, sys

env_file = sys.argv[1]
updates = {}
for item in sys.argv[2:]:
    if '=' in item:
        k, v = item.split('=', 1)
        updates[k] = v

lines = []
existing_keys = set()

if os.path.exists(env_file):
    with open(env_file, 'r', encoding='utf-8') as f:
        for line in f:
            stripped = line.strip()
            if stripped and not stripped.startswith('#') and '=' in stripped:
                k, v = stripped.split('=', 1)
                if k in updates:
                    lines.append(f'{k}={updates[k]}\n')
                    existing_keys.add(k)
                else:
                    lines.append(line)
                    existing_keys.add(k)
            else:
                lines.append(line)

for k, v in updates.items():
    if k not in existing_keys:
        lines.append(f'{k}={v}\n')

os.makedirs(os.path.dirname(env_file), exist_ok=True)
with open(env_file, 'w', encoding='utf-8') as f:
    f.writelines(lines)
" "$ENV_PROD_FILE" "$@"
}

# Parse Command Line Arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --help)
      show_help
      exit 0
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --status)
      STATUS_MODE=true
      shift
      ;;
    --skip-db)
      SKIP_DB=true
      shift
      ;;
    --org-id)
      ORG_ID="${2:-}"
      shift 2
      ;;
    --org-name)
      ORG_NAME="${2:-}"
      shift 2
      ;;
    --project-name)
      PROJECT_NAME="${2:-}"
      shift 2
      ;;
    --region)
      REGION="${2:-}"
      shift 2
      ;;
    --domain)
      DOMAIN="${2:-}"
      shift 2
      ;;
    *)
      echo "Error: Unknown option $1" >&2
      echo "Run './provision/provision.sh --help' for usage." >&2
      exit 1
      ;;
  esac
done

# ==============================================================================
# MODE: STATUS CHECK
# ==============================================================================
if [[ "$STATUS_MODE" == "true" ]]; then
  echo "========================================================"
  echo "            STATUS CHECK FOR VISION CORTEX              "
  echo "========================================================"
  if [[ ! -f "$STATE_FILE" ]]; then
    echo "No state file found at $STATE_FILE."
    echo "Run provisioning first to generate state."
    exit 0
  fi

  echo "State File: $STATE_FILE"
  echo ""

  # 1. Supabase Status
  SUPA_REF="$(py_state_get 'supabase.project_ref')"
  if [[ -n "$SUPA_REF" ]]; then
    echo "--- Supabase Project ---"
    echo "Project Ref: $SUPA_REF"
    if [[ -n "$SUPABASE_TOKEN" ]]; then
      SUPA_RES="$(curl -s -H "Authorization: Bearer $SUPABASE_TOKEN" "https://api.supabase.com/v1/projects/$SUPA_REF" || true)"
      SUPA_STATUS="$(python3 -c "import json, sys; d=json.loads(sys.argv[1]); print(d.get('status','UNKNOWN'))" "$SUPA_RES" 2>/dev/null || echo "API_ERROR")"
      SUPA_NAME="$(python3 -c "import json, sys; d=json.loads(sys.argv[1]); print(d.get('name','UNKNOWN'))" "$SUPA_RES" 2>/dev/null || echo "UNKNOWN")"
      echo "Live API Status: $SUPA_STATUS (Name: $SUPA_NAME)"
    else
      REC_STATUS="$(py_state_get 'supabase.status')"
      echo "Recorded Status: ${REC_STATUS:-CREATED} (Pass SUPABASE_ACCESS_TOKEN to query live API)"
    fi
    echo "DB Migration Applied: $(py_state_get 'supabase.db_migrated')"
  else
    echo "--- Supabase Project ---"
    echo "Status: Not provisioned"
  fi
  echo ""

  # 2. Vercel Status
  VERCEL_PID="$(py_state_get 'vercel.project_id')"
  if [[ -n "$VERCEL_PID" ]]; then
    echo "--- Vercel Project ---"
    echo "Project ID: $VERCEL_PID"
    echo "Domain Name: $DOMAIN"
    if [[ -n "$VERCEL_TOKEN_VAL" ]]; then
      DOM_RES="$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN_VAL" "https://api.vercel.com/v10/projects/$VERCEL_PID/domains/$DOMAIN" || true)"
      VERIFIED="$(python3 -c "import json, sys; d=json.loads(sys.argv[1]); print(d.get('verified', False))" "$DOM_RES" 2>/dev/null || echo "false")"
      echo "Live Domain Verification: verified=$VERIFIED"
    else
      echo "Recorded State: Project created (Pass VERCEL_TOKEN to query live domain verification API)"
    fi
  else
    echo "--- Vercel Project ---"
    echo "Status: Not provisioned"
  fi
  echo ""

  # 3. Railway Status
  echo "--- Railway Worker ---"
  RW_DEPLOYED="$(py_state_get 'railway.deployed')"
  if [[ "$RW_DEPLOYED" == "true" ]]; then
    echo "Status: Deployed via CLI"
  else
    echo "Status: Manual deployment or check required via Railway Dashboard (https://railway.app)"
  fi
  echo "========================================================"
  exit 0
fi

# ==============================================================================
# MODE: DRY RUN / PROVISIONING
# ==============================================================================

echo "========================================================"
echo "          VISION CORTEX PROVISIONING SYSTEM            "
echo "========================================================"
if [[ "$DRY_RUN" == "true" ]]; then
  echo ">>> DRY-RUN MODE ENABLED: No network calls or state writes will occur. <<<"
fi
echo "Project Name : $PROJECT_NAME"
echo "Supabase Reg : $REGION"
echo "Target Domain: $DOMAIN"
echo "Skip Database: $SKIP_DB"
echo "========================================================"
echo ""

# ------------------------------------------------------------------------------
# STEP 1: SUPABASE PROVISIONING
# ------------------------------------------------------------------------------
echo "========================================================"
echo "            STEP 1: SUPABASE PROVISIONING               "
echo "========================================================"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[DRY-RUN] Would authenticate with Supabase API using SUPABASE_ACCESS_TOKEN"
  echo "[DRY-RUN] Would GET https://api.supabase.com/v1/orgs to resolve target organization"
  echo "[DRY-RUN] Would POST https://api.supabase.com/v1/projects to create project '$PROJECT_NAME'"
  echo "[DRY-RUN] Would poll GET https://api.supabase.com/v1/projects/{ref} until status is ACTIVE"
  if [[ "$SKIP_DB" == "true" ]]; then
    echo "[DRY-RUN] Would SKIP database migration (--skip-db set)"
  else
    echo "[DRY-RUN] Would POST https://api.supabase.com/v1/projects/{ref}/database/query with contents of $MIGRATION_FILE"
  fi
  echo "[DRY-RUN] Would GET https://api.supabase.com/v1/projects/{ref}/api-keys for anon and service_role keys"
  echo "[DRY-RUN] Would write production env to provision/.env.production"
else
  if [[ -z "$SUPABASE_TOKEN" ]]; then
    echo "Error: SUPABASE_ACCESS_TOKEN environment variable is required for Supabase provisioning." >&2
    echo "Please set SUPABASE_ACCESS_TOKEN=your_token and re-run." >&2
    exit 1
  fi

  # 1a. List & Select Organization
  echo "Fetching Supabase organizations..."
  ORGS_JSON="$(curl -s -f -H "Authorization: Bearer $SUPABASE_TOKEN" "https://api.supabase.com/v1/orgs" || {
    echo "Error: Failed to fetch Supabase organizations. Check SUPABASE_ACCESS_TOKEN." >&2
    exit 1
  })"

  SELECTED_ORG_ID="$(python3 -c "
import json, sys
raw = sys.argv[1]
t_id = sys.argv[2]
t_name = sys.argv[3]

try:
    orgs = json.loads(raw)
except Exception as e:
    sys.stderr.write(f'Error parsing orgs response: {e}\n')
    sys.exit(1)

if isinstance(orgs, dict) and 'message' in orgs:
    sys.stderr.write(f'Supabase API Error: {orgs[\"message\"]}\n')
    sys.exit(1)

sys.stderr.write('Found Supabase Organizations:\n')
for o in orgs:
    sys.stderr.write(f'  - Name: {o.get(\"name\")}, ID: {o.get(\"id\")}\n')

sel = None
if t_id:
    for o in orgs:
        if o.get('id') == t_id:
            sel = o
            break
    if not sel:
        sys.stderr.write(f'Error: Specified --org-id \"{t_id}\" not found.\n')
        sys.exit(1)
elif t_name:
    matches = [o for o in orgs if o.get('name','').lower() == t_name.lower()]
    if not matches:
        sys.stderr.write(f'Error: Specified --org-name \"{t_name}\" not found.\n')
        sys.exit(1)
    sel = matches[0]
else:
    if orgs:
        sel = orgs[0]

if sel:
    sys.stderr.write(f'Selected Organization: {sel.get(\"name\")} ({sel.get(\"id\")})\n')
    print(sel['id'])
else:
    sys.stderr.write('Error: No organizations found in your Supabase account.\n')
    sys.exit(1)
" "$ORGS_JSON" "$ORG_ID" "$ORG_NAME")"

  py_state_set 'supabase.org_id' "$SELECTED_ORG_ID"

  # 1b. Create or Retrieve Project
  PROJECT_REF="$(py_state_get 'supabase.project_ref')"
  DB_PASS="$(py_state_get 'supabase.db_pass')"

  if [[ -z "$PROJECT_REF" ]]; then
    echo "Checking if project '$PROJECT_NAME' already exists in organization $SELECTED_ORG_ID..."
    PROJECTS_JSON="$(curl -s -f -H "Authorization: Bearer $SUPABASE_TOKEN" "https://api.supabase.com/v1/projects" || echo "[]")"
    EXISTING_REF="$(python3 -c "
import json, sys
raw = sys.argv[1]
name = sys.argv[2]
org = sys.argv[3]
try:
    projects = json.loads(raw)
    for p in projects:
        if p.get('name') == name and p.get('organization_id') == org:
            print(p.get('id') or p.get('ref') or '')
            break
except Exception:
    pass
" "$PROJECTS_JSON" "$PROJECT_NAME" "$SELECTED_ORG_ID")"

    if [[ -n "$EXISTING_REF" ]]; then
      echo "Found existing Supabase project ref: $EXISTING_REF"
      PROJECT_REF="$EXISTING_REF"
    else
      echo "Creating new Supabase project '$PROJECT_NAME' in region '$REGION'..."
      DB_PASS="$(python3 -c "import secrets, string; alphabet = string.ascii_letters + string.digits; print(''.join(secrets.choice(alphabet) for _ in range(32)))")"
      CREATE_PAYLOAD="$(python3 -c "
import json, sys
print(json.dumps({
    'name': sys.argv[1],
    'organization_id': sys.argv[2],
    'region': sys.argv[3],
    'db_pass': sys.argv[4]
}))" "$PROJECT_NAME" "$SELECTED_ORG_ID" "$REGION" "$DB_PASS")"

      CREATE_RES="$(curl -s -f -X POST "https://api.supabase.com/v1/projects" \
        -H "Authorization: Bearer $SUPABASE_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$CREATE_PAYLOAD" || {
          echo "Error: Failed to create Supabase project via API." >&2
          exit 1
        })"

      PROJECT_REF="$(python3 -c "import json, sys; d=json.loads(sys.argv[1]); print(d.get('id') or d.get('ref') or '')" "$CREATE_RES")"
      if [[ -z "$PROJECT_REF" ]]; then
        echo "Error: Could not extract project ref from creation response: $CREATE_RES" >&2
        exit 1
      fi
      echo "Created Supabase project reference: $PROJECT_REF"
    fi

    py_state_set 'supabase.project_ref' "$PROJECT_REF"
    if [[ -n "$DB_PASS" ]]; then
      py_state_set 'supabase.db_pass' "$DB_PASS"
    fi
  else
    echo "Reusing Supabase project reference from state: $PROJECT_REF"
  fi

  # 1c. Poll for ACTIVE status
  echo "Polling Supabase project $PROJECT_REF status (timeout: 10 minutes)..."
  MAX_WAIT=600
  ELAPSED=0
  STATUS="UNKNOWN"
  while [[ $ELAPSED -lt $MAX_WAIT ]]; do
    PROJ_INFO="$(curl -s -H "Authorization: Bearer $SUPABASE_TOKEN" "https://api.supabase.com/v1/projects/$PROJECT_REF" || true)"
    STATUS="$(python3 -c "import json, sys; d=json.loads(sys.argv[1]); print(d.get('status','UNKNOWN'))" "$PROJ_INFO" 2>/dev/null || echo "UNKNOWN")"
    echo "  -> Current status: $STATUS (${ELAPSED}s elapsed)"
    if [[ "$STATUS" == "ACTIVE_HEALTHY" || "$STATUS" == "ACTIVE" ]]; then
      echo "Supabase project $PROJECT_REF is ACTIVE!"
      py_state_set 'supabase.status' "$STATUS"
      break
    fi
    sleep 10
    ELAPSED=$((ELAPSED + 10))
  done

  if [[ "$STATUS" != "ACTIVE_HEALTHY" && "$STATUS" != "ACTIVE" ]]; then
    echo "Warning: Timeout waiting for Supabase project to reach ACTIVE status (current: $STATUS). Proceeding..." >&2
  fi

  # 1d. Apply Database Schema Migration
  if [[ "$SKIP_DB" == "true" ]]; then
    echo "[SKIP] Skipping database schema migration (--skip-db set)."
  else
    if [[ ! -f "$MIGRATION_FILE" ]]; then
      echo "Error: Required migration file '$MIGRATION_FILE' does not exist." >&2
      echo "Database schema migration cannot proceed. Run with --skip-db to bypass database migration." >&2
      exit 1
    fi

    echo "Applying database migration $MIGRATION_FILE to project $PROJECT_REF..."
    MIGRATION_PAYLOAD="$(python3 -c "
import json, sys
with open(sys.argv[1], 'r', encoding='utf-8') as f:
    sql = f.read()
print(json.dumps({'query': sql}))
" "$MIGRATION_FILE")"

    MIG_RES="$(curl -s -f -X POST "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
      -H "Authorization: Bearer $SUPABASE_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$MIGRATION_PAYLOAD" || {
        echo "Error: Failed to execute database query on Supabase project $PROJECT_REF." >&2
        exit 1
      })"
    echo "Database migration applied successfully."
    py_state_set 'supabase.db_migrated' 'true'
  fi

  # 1e. Retrieve API Keys & Write Environment File
  echo "Retrieving Supabase API keys..."
  KEYS_JSON="$(curl -s -f -H "Authorization: Bearer $SUPABASE_TOKEN" "https://api.supabase.com/v1/projects/$PROJECT_REF/api-keys" || {
    echo "Error: Failed to fetch API keys for Supabase project $PROJECT_REF." >&2
    exit 1
  })"

  ANON_KEY="$(python3 -c "
import json, sys
keys = json.loads(sys.argv[1])
for k in keys:
    if k.get('name') == 'anon' or k.get('type') == 'anon':
        print(k.get('api_key',''))
        sys.exit(0)
print('')
" "$KEYS_JSON")"

  SERVICE_ROLE_KEY="$(python3 -c "
import json, sys
keys = json.loads(sys.argv[1])
for k in keys:
    if k.get('name') == 'service_role' or k.get('type') == 'service_role':
        print(k.get('api_key',''))
        sys.exit(0)
print('')
" "$KEYS_JSON")"

  SUPABASE_URL="https://${PROJECT_REF}.supabase.co"

  py_state_set 'supabase.anon_key' "$ANON_KEY"
  py_state_set 'supabase.service_role_key' "$SERVICE_ROLE_KEY"
  py_state_set 'supabase.url' "$SUPABASE_URL"

  echo "Writing credentials to $ENV_PROD_FILE..."
  py_update_env_file \
    "SUPABASE_URL=$SUPABASE_URL" \
    "SUPABASE_ANON_KEY=$ANON_KEY" \
    "SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY" \
    "VITE_SUPABASE_URL=$SUPABASE_URL" \
    "VITE_SUPABASE_ANON_KEY=$ANON_KEY" \
    "SMTP_HOST=smtp.gmail.com" \
    "SMTP_PORT=465" \
    "SMTP_USER=system@thevisioncortex.com" \
    "SMTP_PASS=CHANGE_ME_GOOGLE_APP_PASSWORD" \
    "EMAIL_FROM=system@thevisioncortex.com" \
    "AI_GATEWAY_API_KEY=CHANGE_ME_AI_GATEWAY_KEY" \
    "AI_GATEWAY_MODEL=anthropic/claude-sonnet-4" \
    "AI_GATEWAY_IMAGE_MODEL=openai/dall-e-3" \
    "WORKER_TOKEN=change_me_secret_worker_token"

  echo ""
  echo "========================================================"
  echo "[WARNING] $ENV_PROD_FILE HAS BEEN WRITTEN WITH LIVE KEYS."
  echo "KEEP THIS FILE SECRET! DO NOT COMMIT IT TO REPOSITORY."
  echo "========================================================"
fi
echo ""

# ------------------------------------------------------------------------------
# STEP 2: GOOGLE WORKSPACE SETUP (MANUAL INSTRUCTIONS)
# ------------------------------------------------------------------------------
echo "========================================================"
echo "      STEP 2: GOOGLE WORKSPACE SETUP (MANUAL STEPS)     "
echo "========================================================"
cat << 'EOF'
Google Workspace SMTP setup requires administrative user actions:

1. Open Google Workspace Admin Console: https://admin.google.com
2. Create or verify the system email account: system@thevisioncortex.com
3. Sign in as system@thevisioncortex.com and enable 2-Factor Authentication (2FA) in Security Settings.
4. Navigate to App Passwords: https://myaccount.google.com/apppasswords
5. Generate an App Password for Mail:
     Select app   : Mail
     Select device: Custom (Vercel / Vision Cortex)
6. Copy the generated 16-character App Password.
7. Update SMTP_USER=system@thevisioncortex.com and SMTP_PASS=<app_password> in provision/.env.production
   and in your Vercel Project Environment Variables.
EOF
echo ""

# ------------------------------------------------------------------------------
# STEP 3: VERCEL PROVISIONING
# ------------------------------------------------------------------------------
echo "========================================================"
echo "            STEP 3: VERCEL PROVISIONING                 "
echo "========================================================"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[DRY-RUN] Would create Vercel project '$PROJECT_NAME' (framework: vite) via POST https://api.vercel.com/v11/projects"
  echo "[DRY-RUN] Would set encrypted env vars from provision/.env.production on Vercel project"
  echo "[DRY-RUN] Would add domain '$DOMAIN' via POST https://api.vercel.com/v10/projects/{id}/domains"
  echo "[DRY-RUN] Would print DNS records to set at IONOS (A @ 76.76.21.21, CNAME www cname.vercel-dns.com)"
  echo "[DRY-RUN] Would poll domain verification status"
  echo "[DRY-RUN] Would run 'vercel deploy --prod' or print manual deployment commands"
else
  if [[ -z "$VERCEL_TOKEN_VAL" ]]; then
    echo "[NOTICE] VERCEL_TOKEN environment variable not set."
    echo "Skipping Vercel API auto-provisioning."
    echo ""
    echo "Manual Vercel Deployment Instructions:"
    echo "  1. Install Vercel CLI     : npm i -g vercel"
    echo "  2. Link Vercel project    : vercel link"
    echo "  3. Pull environment vars  : vercel env pull"
    echo "  4. Deploy to production   : vercel --prod"
  else
    echo "Creating Vercel project '$PROJECT_NAME'..."
    VERCEL_CREATE_RES="$(curl -s -X POST "https://api.vercel.com/v11/projects" \
      -H "Authorization: Bearer $VERCEL_TOKEN_VAL" \
      -H "Content-Type: application/json" \
      -d "{\"name\": \"$PROJECT_NAME\", \"framework\": \"vite\"}" || echo "{}")"

    VERCEL_PID="$(python3 -c "import json, sys; d=json.loads(sys.argv[1]); print(d.get('id','') or d.get('projectId',''))" "$VERCEL_CREATE_RES")"

    if [[ -z "$VERCEL_PID" ]]; then
      echo "Project creation response indicated project may already exist. Fetching existing project..."
      VERCEL_INFO="$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN_VAL" "https://api.vercel.com/v9/projects/$PROJECT_NAME" || echo "{}")"
      VERCEL_PID="$(python3 -c "import json, sys; d=json.loads(sys.argv[1]); print(d.get('id',''))" "$VERCEL_INFO")"
    fi

    if [[ -z "$VERCEL_PID" ]]; then
      echo "Error: Could not retrieve or create Vercel project '$PROJECT_NAME'." >&2
      exit 1
    fi

    echo "Vercel Project ID: $VERCEL_PID"
    py_state_set 'vercel.project_id' "$VERCEL_PID"
    py_state_set 'vercel.project_name' "$PROJECT_NAME"

    # Set Environment Variables on Vercel
    if [[ -f "$ENV_PROD_FILE" ]]; then
      echo "Syncing environment variables from $ENV_PROD_FILE to Vercel..."
      python3 -c "
import json, os, subprocess, sys

env_file = sys.argv[1]
token = sys.argv[2]
project_id = sys.argv[3]

with open(env_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for line in lines:
    line = line.strip()
    if not line or line.startswith('#') or '=' not in line:
        continue
    key, val = line.split('=', 1)
    payload = json.dumps({
        'key': key,
        'value': val,
        'type': 'encrypted',
        'target': ['production', 'preview', 'development']
    })
    cmd = [
        'curl', '-s', '-X', 'POST',
        f'https://api.vercel.com/v10/projects/{project_id}/env',
        '-H', f'Authorization: Bearer {token}',
        '-H', 'Content-Type: application/json',
        '-d', payload
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
" "$ENV_PROD_FILE" "$VERCEL_TOKEN_VAL" "$VERCEL_PID"
      py_state_set 'vercel.env_set' 'true'
      echo "Environment variables submitted to Vercel."
    fi

    # Add Domain to Vercel Project
    echo "Adding custom domain '$DOMAIN' to Vercel project..."
    DOMAIN_RES="$(curl -s -X POST "https://api.vercel.com/v10/projects/$VERCEL_PID/domains" \
      -H "Authorization: Bearer $VERCEL_TOKEN_VAL" \
      -H "Content-Type: application/json" \
      -d "{\"name\": \"$DOMAIN\"}" || echo "{}")"

    py_state_set 'vercel.domain_added' 'true'

    echo ""
    echo "========================================================"
    echo "DNS RECORDS TO SET AT IONOS FOR $DOMAIN:"
    echo "--------------------------------------------------------"
    echo "  Record Type : A"
    echo "  Host / Name : @"
    echo "  Points To   : 76.76.21.21"
    echo ""
    echo "  Record Type : CNAME"
    echo "  Host / Name : www"
    echo "  Points To   : cname.vercel-dns.com"
    echo "========================================================"
    echo ""

    echo "Checking Vercel domain verification status..."
    MAX_DOM_WAIT=30
    DOM_ELAPSED=0
    VERIFIED=false
    while [[ $DOM_ELAPSED -lt $MAX_DOM_WAIT ]]; do
      CHECK_RES="$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN_VAL" "https://api.vercel.com/v10/projects/$VERCEL_PID/domains/$DOMAIN" || echo "{}")"
      IS_VERIFIED="$(python3 -c "import json, sys; d=json.loads(sys.argv[1]); print(d.get('verified', False))" "$CHECK_RES" 2>/dev/null || echo "false")"
      if [[ "$IS_VERIFIED" == "True" || "$IS_VERIFIED" == "true" ]]; then
        VERIFIED=true
        break
      fi
      sleep 5
      DOM_ELAPSED=$((DOM_ELAPSED + 5))
    done

    if [[ "$VERIFIED" == "true" ]]; then
      echo "Domain $DOMAIN is verified on Vercel!"
      py_state_set 'vercel.domain_verified' 'true'
    else
      echo "[NOTICE] Domain $DOMAIN verification pending DNS propagation at IONOS."
      py_state_set 'vercel.domain_verified' 'false'
    fi

    # Vercel Deployment
    if command -v vercel &>/dev/null; then
      echo "Vercel CLI detected. Running production deployment..."
      vercel deploy --prod --token "$VERCEL_TOKEN_VAL"
      py_state_set 'vercel.deployed' 'true'
    else
      echo "Vercel CLI not found locally. To deploy:"
      echo "  npm i -g vercel && vercel link && vercel env pull && vercel --prod"
    fi
  fi
fi
echo ""

# ------------------------------------------------------------------------------
# STEP 4: RAILWAY WORKER PROVISIONING
# ------------------------------------------------------------------------------
echo "========================================================"
echo "          STEP 4: RAILWAY WORKER PROVISIONING           "
echo "========================================================"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[DRY-RUN] Would check for RAILWAY_TOKEN and Railway CLI."
  echo "[DRY-RUN] If present, would link and deploy worker/ directory to Railway."
  echo "[DRY-RUN] Otherwise, would print manual deployment steps."
else
  if [[ -n "$RAILWAY_TOKEN_VAL" ]] && command -v railway &>/dev/null; then
    echo "RAILWAY_TOKEN and Railway CLI detected. Deploying worker service..."
    (
      cd "$REPO_ROOT/worker"
      export RAILWAY_TOKEN="$RAILWAY_TOKEN_VAL"
      railway link || true
      railway up --detach || true
    )
    py_state_set 'railway.deployed' 'true'
    echo "Railway worker deployment command executed."
  else
    echo "Railway CLI or RAILWAY_TOKEN not present. Manual deployment steps:"
    cat << 'EOF'
Manual Railway Worker Setup:
  1. Go to https://railway.app and sign in / create a project.
  2. Click 'New Project' -> 'Deploy from GitHub repo'.
  3. Select your repo and configure Root Directory to '/worker'.
  4. In Service Settings -> Variables, paste all environment variables from provision/.env.production.
  5. Ensure WORKER_TOKEN is configured for authenticating HTTP POST requests to /run/<job_name>.
  6. Deploy the service and verify background loops start up.
EOF
  fi
fi

echo ""
echo "========================================================"
echo "        VISION CORTEX PROVISIONING COMPLETE!            "
echo "========================================================"
if [[ "$DRY_RUN" == "true" ]]; then
  echo "Dry-run complete. Re-run without --dry-run to perform live provisioning."
else
  echo "State saved to: $STATE_FILE"
  echo "Env saved to  : $ENV_PROD_FILE"
  echo "Run './provision/provision.sh --status' anytime to check deployment status."
fi
echo "========================================================"
