import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

// autonomousCodePush — lets the swarm write and push code directly to the
// Vision Cortex GitHub repo after validation checks pass. No manual approval.
//
// Actions:
//   push    — push one or more file changes to the repo (creates a branch + commit)
//   push_batch — push multiple files in a single commit via the Git Data API
//   status  — check repo access + last commit

const REPO = 'XTREME-SYSTEMS/vision-cortex';
const API = 'https://api.github.com';

async function ghHeaders() {
  let token = secrets.get('GITHUB_TOKEN');
  if (!token) {
    try { token = (Deno as any).env.get('GITHUB_TOKEN'); } catch {}
  }
  if (!token) throw new Error('GITHUB_TOKEN secret not set (len=0)');
  return {
    'Authorization': 'Bearer ' + token.trim(),
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'vision-cortex-swarm',
  };
}

async function ghFetch(path, opts = {}) {
  const headers = await ghHeaders();
  const res = await fetch(API + path, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
  return res;
}

// Base64-encode UTF-8 content properly
function encodeBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

// Get current file SHA (for updates) — returns null if file doesn't exist
async function getFileSha(path, branch) {
  const ref = branch ? `?ref=${branch}` : '';
  const res = await ghFetch(`/repos/${REPO}/contents/${path}${ref}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('GitHub getFileSha failed: ' + res.status);
  const data = await res.json();
  return data.sha;
}

// Get the default branch's latest commit SHA
async function getDefaultBranch() {
  const res = await ghFetch(`/repos/${REPO}`);
  if (!res.ok) throw new Error('Cannot access repo: ' + res.status);
  const data = await res.json();
  return data.default_branch || 'main';
}

// Create a branch from a base SHA
async function createBranch(branchName, baseSha) {
  const res = await ghFetch(`/repos/${REPO}/git/refs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: 'refs/heads/' + branchName, sha: baseSha }),
  });
  if (!res.ok && res.status !== 422) {
    // 422 = branch already exists, that's fine for batch pushes
    const err = await res.json().catch(() => ({}));
    throw new Error('Create branch failed: ' + (err.message || res.status));
  }
  return res.ok;
}

// Push a single file (create or update)
async function pushFile(filePath, content, message, branch) {
  const sha = await getFileSha(filePath, branch);
  const body = {
    message: message,
    content: encodeBase64(content),
    branch: branch,
  };
  if (sha) body.sha = sha;
  const res = await ghFetch(`/repos/${REPO}/contents/${filePath}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error('Push file failed: ' + (err.message || res.status));
  }
  const data = await res.json();
  return {
    path: filePath,
    sha: data.commit?.sha,
    url: data.content?.html_url,
    commit_url: data.commit?.html_url,
  };
}

// Push multiple files in a single commit using the Git Data API (trees + commits)
async function pushBatch(files, message, branchName, baseBranch) {
  // 1. Get the base commit SHA
  const refRes = await ghFetch(`/repos/${REPO}/git/refs/heads/${baseBranch}`);
  if (!refRes.ok) throw new Error('Cannot get base ref: ' + refRes.status);
  const refData = await refRes.json();
  const baseSha = refData.object.sha;

  // 2. Get the base tree
  const commitRes = await ghFetch(`/repos/${REPO}/git/commits/${baseSha}`);
  if (!commitRes.ok) throw new Error('Cannot get base commit: ' + commitRes.status);
  const commitData = await commitRes.json();
  const baseTreeSha = commitData.tree.sha;

  // 3. Create a new tree with all file changes
  const treeItems = files.map((f) => ({
    path: f.path,
    mode: '100644',
    type: 'blob',
    content: f.content,
  }));
  const treeRes = await ghFetch(`/repos/${REPO}/git/trees`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
  });
  if (!treeRes.ok) throw new Error('Create tree failed: ' + treeRes.status);
  const treeData = await treeRes.json();
  const newTreeSha = treeData.sha;

  // 4. Create the commit
  const commitBody = {
    message: message,
    tree: newTreeSha,
    parents: [baseSha],
  };
  const newCommitRes = await ghFetch(`/repos/${REPO}/git/commits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(commitBody),
  });
  if (!newCommitRes.ok) throw new Error('Create commit failed: ' + newCommitRes.status);
  const newCommitData = await newCommitRes.json();
  const newCommitSha = newCommitData.sha;

  // 5. Create or update the branch to point at the new commit
  const updateRefRes = await ghFetch(`/repos/${REPO}/git/refs/heads/${branchName}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sha: newCommitSha, force: true }),
  });
  if (!updateRefRes.ok) {
    // Branch doesn't exist yet — create it
    await createBranch(branchName, newCommitSha);
  }

  return {
    branch: branchName,
    commit_sha: newCommitSha,
    commit_url: newCommitData.html_url,
    files_pushed: files.length,
  };
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const sr = base44.asServiceRole.entities;
    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'push';

    // ── STATUS: verify repo access ──
    if (action === 'status') {
      const res = await ghFetch(`/repos/${REPO}`);
      const body = await res.text();
      if (!res.ok) return Response.json({ ok: false, error: 'Cannot access repo', status: res.status, body: body.slice(0, 300) }, { status: 200 });
      const data = JSON.parse(body);
      return Response.json({
        ok: true,
        repo: data.full_name,
        default_branch: data.default_branch,
        pushed_at: data.pushed_at,
        private: data.private,
      });
    }

    // ── PUSH: push one or more files ──
    if (action === 'push' || action === 'push_batch') {
      const files = body?.files || [];
      const message = body?.message || 'Autonomous swarm update';
      const branch = body?.branch || ('swarm/' + new Date().toISOString().slice(0, 10) + '-' + Date.now().toString(36));
      const baseBranch = body?.base_branch || await getDefaultBranch();
      const autoMerge = body?.auto_merge !== false; // default true

      if (!files.length) return Response.json({ error: 'files array required (each: { path, content })' }, { status: 400 });

      // Validate each file has path + content
      for (const f of files) {
        if (!f.path || typeof f.content !== 'string') {
          return Response.json({ error: 'Each file needs { path, content }' }, { status: 400 });
        }
      }

      // Create the branch first (from base branch HEAD) so single-file pushes work
      if (branch !== baseBranch) {
        try {
          const refRes = await ghFetch(`/repos/${REPO}/git/refs/heads/${baseBranch}`);
          if (refRes.ok) {
            const refData = await refRes.json();
            await createBranch(branch, refData.object.sha);
          }
        } catch {}
      }

      let result;
      if (files.length === 1) {
        result = await pushFile(files[0].path, files[0].content, message, branch);
      } else {
        result = await pushBatch(files, message, branch, baseBranch);
      }

      // Optionally merge to base branch
      let merged = false;
      let mergeUrl = null;
      if (autoMerge && branch !== baseBranch) {
        const mergeRes = await ghFetch(`/repos/${REPO}/merges`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base: baseBranch,
            head: branch,
            commit_message: 'Merge ' + branch + ' — ' + message,
          }),
        });
        if (mergeRes.ok) {
          const mergeData = await mergeRes.json();
          merged = true;
          mergeUrl = mergeData.html_url;
        }
      }

      // Log the push
      await sr.AgentLog.create({
        agent_name: body?.agent || 'PRIMUS',
        category: 'autonomous_code_push',
        level: 'success',
        message: 'Pushed ' + files.length + ' file(s) to ' + REPO + (merged ? ' (merged to ' + baseBranch + ')' : ' (branch: ' + branch + ')'),
        detail: JSON.stringify({ branch, files: files.map(f => f.path), commit: result.commit_sha || result.sha, merged }).slice(0, 500),
        auto_action: 'code_push',
      }).catch(() => {});

      return Response.json({
        ok: true,
        repo: REPO,
        branch,
        base_branch: baseBranch,
        merged,
        merge_url: mergeUrl,
        result,
        files: files.map(f => f.path),
      });
    }

    return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message || 'Code push failed' }, { status: 500 });
  }
}