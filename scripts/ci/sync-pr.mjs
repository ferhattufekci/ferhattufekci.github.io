// Data sync -> pull request. Runs in fetch-medium.yml / fetch-github.yml after the fetch,
// generation and unit tests, with a GitHub App installation token (contents + pull requests
// write only). The App never pushes to main and has no ruleset bypass: a PR merges only through
// the required Quality Gate, by auto-merge, and only when every guard below holds.
//
// Usage: node scripts/ci/sync-pr.mjs <medium|github>
// Env: SYNC_TOKEN (App token), SYNC_BOT (`<app-slug>[bot]`), GITHUB_REPOSITORY, GITHUB_RUN_ID.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const QUALITY_GATE = 'Run Quality Checks / Quality Gate';
export const GITHUB_ACTIONS_APP = 15368;
// Files generation rewrites from the data (`npm run generate`), plus each source's own data.
const GENERATED = [/^(index\.html|index\.md|llms\.txt|sitemap\.xml|404\.html|404\.md)$/, /^(about|contact|privacy)\/[^/]+$/];
export const SOURCES = {
  medium: { data: [/^data\/medium-[a-z]+\.json$/, /^data\/meta\.json$/], title: 'Medium articles' },
  github: { data: [/^data\/github-(repos|meta|starred)\.json$/], title: 'GitHub repositories' }
};
export const PATHSPECS = ['data', 'index.html', 'index.md', 'llms.txt', 'sitemap.xml', '404.html', '404.md', 'about', 'contact', 'privacy'];
export const branchPrefix = source => `data-sync/${source}-`;
export const allowed = (source, path) => [...SOURCES[source].data, ...GENERATED].some(pattern => pattern.test(path));

/** Which of this source's open sync PRs to keep, and whether a new one is needed. */
export function plan({ source, changed, openPrs, bot, repo, mainSha, tree }) {
  const unexpected = changed.filter(path => !allowed(source, path));
  if (unexpected.length) return { action: 'fail', reason: `generation changed files outside the ${source} sync scope: ${unexpected.join(', ')}` };
  const own = openPrs.filter(pr => pr.head.ref.startsWith(branchPrefix(source)) && pr.user.login === bot && pr.head.repo?.full_name === repo);
  if (changed.length === 0) return { action: 'none', close: own, reason: 'main already has this data' };
  // Strict up-to-date merging needs the PR to sit on the current main; identical data on the
  // current main needs nothing new. Anything else is replaced by one fresh PR.
  const current = own.find(pr => pr.parentSha === mainSha && pr.treeSha === tree);
  if (current) return { action: 'keep', pr: current, close: own.filter(pr => pr !== current) };
  return { action: 'open', close: own };
}

/** Auto-merge only the bot's own, in-scope PR, and only while main enforces the gate. */
export function autoMergeAllowed({ source, pr, files, bot, repo, rules }) {
  const reasons = [];
  if (pr.user.login !== bot) reasons.push(`author ${pr.user.login} is not ${bot}`);
  if (!pr.head.ref.startsWith(branchPrefix(source)) || pr.head.repo?.full_name !== repo) reasons.push(`head ${pr.head.repo?.full_name}:${pr.head.ref} is not this source's sync branch`);
  if (pr.base.ref !== 'main') reasons.push(`base ${pr.base.ref} is not main`);
  if (!Array.isArray(files) || files.length === 0 || files.length >= 100) reasons.push('the changed-file list is empty or too long to check completely');
  else for (const file of files)
    for (const path of [file.filename, file.previous_filename].filter(Boolean))
      if (!allowed(source, path)) reasons.push(`unexpected file ${path}`);
  const gate = (rules ?? []).find(rule => rule.type === 'required_status_checks');
  const checks = gate?.parameters?.required_status_checks ?? [];
  if (!checks.some(check => check.context === QUALITY_GATE && check.integration_id === GITHUB_ACTIONS_APP))
    reasons.push(`main does not require "${QUALITY_GATE}" from GitHub Actions`);
  if (gate?.parameters?.strict_required_status_checks_policy !== true) reasons.push('main does not require branches to be up to date');
  return { ok: reasons.length === 0, reasons };
}

/** Squash auto-merge: one commit per sync on main, with a message that names the data. */
export const AUTO_MERGE = 'mutation($id: ID!, $headline: String!, $body: String!) { enablePullRequestAutoMerge(input: { pullRequestId: $id, mergeMethod: SQUASH, commitHeadline: $headline, commitBody: $body }) { clientMutationId } }';
export const autoMergeVariables = (source, pr) => ({
  id: pr.node_id,
  headline: `chore(data): sync ${SOURCES[source].title} (#${pr.number})`,
  body: `Automated ${source} data sync. Merged by auto-merge after the required Quality Gate passed on a branch up to date with main.`
});

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

/** Every tracked change and untracked file in the work tree, as exact paths. NUL-separated
 *  name lists rather than `git status` columns: trimming that output once dropped the first
 *  letter of the first path ("ata/github-meta.json", run 43030306799). */
export function changedPaths(cwd) {
  const list = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).split('\0').filter(Boolean);
  return [...new Set([...list('diff', '--name-only', '-z', 'HEAD'), ...list('ls-files', '--others', '--exclude-standard', '-z')])].sort();
}

async function main() {
  const source = process.argv[2];
  if (!SOURCES[source]) throw new Error(`unknown source ${source}`);
  const { SYNC_TOKEN: token, SYNC_BOT: bot, GITHUB_REPOSITORY: repo, GITHUB_RUN_ID: runId } = process.env;
  if (!token || !bot || !repo) throw new Error('SYNC_TOKEN, SYNC_BOT and GITHUB_REPOSITORY are required');
  const api = async (path, init = {}) => {
    const response = await fetch(`https://api.github.com${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...init.headers } });
    const body = response.status === 204 ? null : await response.json();
    if (!response.ok) throw new Error(`${init.method ?? 'GET'} ${path}: ${response.status} ${body?.message ?? ''}`);
    return body;
  };
  const graphql = async (query, variables) => {
    const body = await api('/graphql', { method: 'POST', body: JSON.stringify({ query, variables }) });
    if (body.errors?.length) throw new Error(`GraphQL: ${body.errors.map(error => error.message).join('; ')}`);
    return body;
  };

  // Anything changed outside the pathspecs is caught too: plan() rejects it.
  const changed = changedPaths();
  const mainSha = git('rev-parse', 'HEAD');
  let tree = null;
  if (changed.length && changed.every(path => allowed(source, path))) {
    git('add', '-A', '--', ...PATHSPECS);
    tree = git('write-tree');
  }
  const openPrs = await api(`/repos/${repo}/pulls?state=open&base=main&per_page=100`);
  for (const pr of openPrs.filter(pr => pr.head.ref.startsWith(branchPrefix(source)))) {
    const commit = await api(`/repos/${repo}/git/commits/${pr.head.sha}`);
    Object.assign(pr, { treeSha: commit.tree.sha, parentSha: commit.parents.length === 1 ? commit.parents[0].sha : null });
  }
  const decision = plan({ source, changed, openPrs, bot, repo, mainSha, tree });
  console.log(`sync ${source}: ${decision.action}${decision.reason ? ` (${decision.reason})` : ''}`);
  if (decision.action === 'fail') throw new Error(decision.reason);

  let pr = decision.pr;
  if (decision.action === 'open') {
    const branch = `${branchPrefix(source)}${runId}`;
    const commit = git('-c', `user.name=${bot}`, '-c', `user.email=${bot}@users.noreply.github.com`, 'commit-tree', tree, '-p', mainSha, '-m', `chore: update ${SOURCES[source].title} [${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC]`);
    // The token goes through git's environment config, not the command line or the remote URL.
    execFileSync('git', ['push', `https://github.com/${repo}.git`, `${commit}:refs/heads/${branch}`], { stdio: 'inherit', env: { ...process.env,
      GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'http.https://github.com/.extraheader',
      GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}` } });
    pr = await api(`/repos/${repo}/pulls`, { method: 'POST', body: JSON.stringify({ title: `chore(data): sync ${SOURCES[source].title}`, head: branch, base: 'main',
      body: `Automated ${source} data sync from run ${runId}. Changes are limited to this source's data and the files generated from it; it merges only after the required Quality Gate passes on an up-to-date branch.` }) });
    console.log(`opened #${pr.number} from ${branch} at ${commit}`);
  }
  for (const old of decision.close ?? []) {
    await api(`/repos/${repo}/issues/${old.number}/comments`, { method: 'POST', body: JSON.stringify({ body: pr ? `Superseded by #${pr.number}.` : 'main already contains this data.' }) });
    await api(`/repos/${repo}/pulls/${old.number}`, { method: 'PATCH', body: JSON.stringify({ state: 'closed' }) });
    // GitHub deletes head branches only after a merge; a superseded sync PR's branch is removed
    // here. plan() returns only this source's own PRs from this repository.
    await api(`/repos/${repo}/git/refs/heads/${old.head.ref}`, { method: 'DELETE' });
    console.log(`closed #${old.number} and deleted ${old.head.ref}`);
  }
  if (!pr) return;

  pr = await api(`/repos/${repo}/pulls/${pr.number}`);
  const files = await api(`/repos/${repo}/pulls/${pr.number}/files?per_page=100`);
  const rules = await api(`/repos/${repo}/rules/branches/main`);
  const verdict = autoMergeAllowed({ source, pr, files, bot, repo, rules });
  if (verdict.ok && !pr.auto_merge) {
    await graphql(AUTO_MERGE, autoMergeVariables(source, pr));
    console.log(`auto-merge enabled for #${pr.number}`);
  } else if (!verdict.ok) {
    if (pr.auto_merge) await graphql('mutation($id: ID!) { disablePullRequestAutoMerge(input: { pullRequestId: $id }) { clientMutationId } }', { id: pr.node_id });
    console.log(`auto-merge not enabled for #${pr.number}: ${verdict.reasons.join('; ')}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  main().catch(error => { console.error(`::error title=Data sync::${error.message}`); process.exitCode = 1; });
