// Dependency audit gate: audits every package in package-lock.json (production and
// development) and fails on a high or critical advisory.
//
// Exit codes keep the two failure kinds apart:
//   0 PASS            the registry answered, the report is valid, no high/critical finding
//   1 SECURITY        at least one high or critical advisory
//   2 INFRASTRUCTURE  the audit could not be trusted: npm or the registry failed, the
//                     output was not a valid report, or the canary was not detected
//
// npm reports "0 vulnerabilities" when the advisory endpoint answers with an empty
// object, which is also what a registry returns for a clean tree. A clean result is
// therefore accepted only when the same service also reports a known critical advisory
// in a fixed canary lockfile (audit-canary.json), written to a temporary directory so
// no package-lock.json for it exists in the repository.
import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SEVERITIES = ['info', 'low', 'moderate', 'high', 'critical'];
export const BLOCKING = ['high', 'critical'];
export const EXIT = { pass: 0, security: 1, infrastructure: 2 };
// No --omit: development dependencies are audited too. --package-lock-only audits the
// committed lockfile, not whatever happens to be installed.
export const AUDIT_ARGS = ['audit', '--json', '--package-lock-only'];
export const CANARY_ADVISORY = 'https://github.com/advisories/GHSA-xvch-5gv4-984h';

const infrastructure = reason => ({ kind: 'infrastructure', reason });

/** Count the packages a lockfile (v2/v3) describes, excluding the root project. */
export function lockPackageCount(lock) {
  if (!lock || typeof lock.packages !== 'object' || lock.packages === null) return null;
  return Object.keys(lock.packages).filter(key => key !== '').length;
}

/**
 * Turn one `npm audit --json` invocation into a verdict. Anything that is not a
 * complete, self-consistent version 2 report is an infrastructure failure; npm's own
 * exit status is not trusted to mean "vulnerable", because npm also exits 1 on errors.
 */
export function classify({ status, signal, error, stdout, lockPackages }) {
  if (error) return infrastructure(`npm could not run: ${error.message ?? error}`);
  if (signal) return infrastructure(`npm audit was stopped by ${signal}`);
  if (typeof stdout !== 'string' || stdout.trim() === '') return infrastructure('npm audit produced no output');
  let report;
  try { report = JSON.parse(stdout); } catch { return infrastructure('npm audit output is not valid JSON'); }
  if (report?.error) return infrastructure(`npm audit error${report.error.code ? ` ${report.error.code}` : ''}: ${report.error.summary || report.error.detail || 'no detail'}`);
  if (report?.auditReportVersion !== 2) {
    if (typeof report?.message === 'string') return infrastructure(`npm audit request failed: ${report.message}`);
    return infrastructure(`unexpected npm audit report version: ${report?.auditReportVersion}`);
  }
  const counts = report.metadata?.vulnerabilities;
  const dependencies = report.metadata?.dependencies;
  const findings = report.vulnerabilities;
  if (!counts || typeof counts !== 'object' || !findings || typeof findings !== 'object' || !dependencies)
    return infrastructure('npm audit report is missing metadata or the findings list');
  for (const severity of [...SEVERITIES, 'total'])
    if (!Number.isInteger(counts[severity]) || counts[severity] < 0)
      return infrastructure(`npm audit count for ${severity} is not a number`);
  const listed = Object.fromEntries(SEVERITIES.map(severity => [severity, 0]));
  const packages = [];
  for (const [name, finding] of Object.entries(findings)) {
    if (!SEVERITIES.includes(finding?.severity)) return infrastructure(`unknown severity for ${name}: ${finding?.severity}`);
    listed[finding.severity]++;
    const advisories = (Array.isArray(finding.via) ? finding.via : [])
      .filter(via => via && typeof via === 'object')
      .map(via => ({ title: via.title, url: via.url, severity: via.severity, range: via.range }));
    const through = (Array.isArray(finding.via) ? finding.via : []).filter(via => typeof via === 'string');
    packages.push({ name, severity: finding.severity, range: finding.range, isDirect: finding.isDirect === true, advisories, through });
  }
  for (const severity of SEVERITIES)
    if (listed[severity] !== counts[severity])
      return infrastructure(`npm audit counts are inconsistent for ${severity}: metadata ${counts[severity]}, listed ${listed[severity]}`);
  if (SEVERITIES.reduce((sum, severity) => sum + counts[severity], 0) !== counts.total)
    return infrastructure('npm audit total does not match its severity counts');
  if (!Number.isInteger(dependencies.total)) return infrastructure('npm audit dependency total is missing');
  if (lockPackages > 0 && dependencies.total === 0)
    return infrastructure(`npm audit checked 0 dependencies, but the lockfile lists ${lockPackages}`);
  const order = severity => -SEVERITIES.indexOf(severity);
  packages.sort((a, b) => order(a.severity) - order(b.severity) || a.name.localeCompare(b.name));
  const blocking = packages.filter(entry => BLOCKING.includes(entry.severity));
  return { kind: blocking.length ? 'security' : 'pass', counts, dependencies, lockPackages, packages, blocking, status };
}

/** The canary must come back as a valid report that names its known critical advisory. */
export function checkCanary(result) {
  if (result.kind === 'infrastructure') return infrastructure(`canary audit failed: ${result.reason}`);
  const found = result.packages.some(entry => entry.name === 'minimist'
    && entry.advisories.some(advisory => advisory.url === CANARY_ADVISORY && advisory.severity === 'critical'));
  return found ? { kind: 'pass' } : infrastructure(`the advisory service did not report the canary's known advisory ${CANARY_ADVISORY}; a clean result cannot be trusted`);
}

/** Combine the project audit and the canary into the final verdict. */
export function decide(project, canary) {
  if (project.kind === 'infrastructure') return project;
  const verified = checkCanary(canary);
  if (verified.kind === 'infrastructure') return { ...verified, project };
  return project;
}

export function render(verdict) {
  const lines = ['## Dependency audit', ''];
  const label = { pass: 'PASS', security: 'SECURITY FINDING', infrastructure: 'INFRASTRUCTURE ERROR' }[verdict.kind];
  lines.push(`Result: **${label}** (exit ${EXIT[verdict.kind]})`, '');
  if (verdict.kind === 'infrastructure') {
    lines.push(`The audit did not produce a trustworthy result, so this is not a security verdict: ${verdict.reason}`, '');
    lines.push('Re-run the job once the registry is reachable; do not treat this run as clean.');
    return lines.join('\n') + '\n';
  }
  lines.push(`Scope: package-lock.json, production and development; ${verdict.dependencies.total} dependencies audited (lockfile lists ${verdict.lockPackages}). Blocking severities: ${BLOCKING.join(', ')}.`, '');
  lines.push('| Severity | Packages |', '|---|---|', ...[...SEVERITIES].reverse().map(severity => `| ${severity} | ${verdict.counts[severity]} |`), '');
  lines.push(`Canary: the advisory service reported ${CANARY_ADVISORY} for minimist 0.0.8.`, '');
  if (verdict.packages.length === 0) lines.push('No advisories.');
  for (const entry of verdict.packages) {
    const marker = BLOCKING.includes(entry.severity) ? 'BLOCKING' : 'not blocking';
    lines.push(`- **${entry.name}** ${entry.severity} (${marker}), affected ${entry.range}${entry.isDirect ? ', direct' : ''}`);
    for (const advisory of entry.advisories) lines.push(`  - ${advisory.severity}: ${advisory.title} ${advisory.url}`);
    if (entry.through.length) lines.push(`  - through ${entry.through.join(', ')}`);
  }
  return lines.join('\n') + '\n';
}

function audit(cwd, lockPackages) {
  const windows = process.platform === 'win32';
  const run = spawnSync(windows ? 'npm.cmd' : 'npm', AUDIT_ARGS, { cwd, encoding: 'utf8', shell: windows, timeout: 180000, maxBuffer: 64 * 1024 * 1024 });
  return classify({ status: run.status, signal: run.signal, error: run.error, stdout: run.stdout, lockPackages });
}

function main() {
  let lockPackages;
  try { lockPackages = lockPackageCount(JSON.parse(readFileSync('package-lock.json', 'utf8'))); } catch { lockPackages = null; }
  let verdict;
  if (lockPackages === null) verdict = infrastructure('package-lock.json is missing or not a v2/v3 lockfile');
  else {
    const project = audit(process.cwd(), lockPackages);
    const fixture = JSON.parse(readFileSync(fileURLToPath(new URL('audit-canary.json', import.meta.url)), 'utf8'));
    const dir = mkdtempSync(join(tmpdir(), 'audit-canary-'));
    try {
      writeFileSync(join(dir, 'package.json'), JSON.stringify(fixture.package));
      writeFileSync(join(dir, 'package-lock.json'), JSON.stringify(fixture.lockfile));
      verdict = decide(project, audit(dir, lockPackageCount(fixture.lockfile)));
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
  const text = render(verdict);
  process.stdout.write(text);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, text);
  if (verdict.kind === 'security')
    console.log(`::error title=Dependency audit: security finding::${verdict.blocking.map(entry => `${entry.name} (${entry.severity})`).join(', ')}`);
  if (verdict.kind === 'infrastructure') console.log(`::error title=Dependency audit: infrastructure error::${verdict.reason}`);
  process.exitCode = EXIT[verdict.kind];
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
