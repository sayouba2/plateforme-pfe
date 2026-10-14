'use strict';

const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { test } = require('node:test');
const { collectProblems, syncIssues, reportFailures } = require('./security-issues.cjs');

const repo = { owner: 'example', repo: 'pfe' };
const bot = { login: 'github-actions[bot]' };
const npmStep = 'npm audit (bloquant à partir de la sévérité haute)';
const imageStep = "Vulnérabilités de l'image (système et Python)";
const run = {
  id: 100, attempt: 1, branch: 'main', sha: 'a'.repeat(40),
  url: 'https://github.com/example/pfe/actions/runs/100/attempts/1',
};
const context = {
  repo, ref: 'refs/heads/main', eventName: 'push', runId: run.id, sha: run.sha,
};

function failedJob(name = 'Qualité et dépendances mobile', step = npmStep) {
  return { name, conclusion: 'failure', steps: [{ name: step, conclusion: 'failure' }] };
}

function npmReport(id = 'GHSA-vfj7-8cjw-p6xm') {
  return { vulnerabilities: {
    braces: { range: '<=3.0.3', via: [{
      name: 'braces', url: 'https://github.com/advisories/' + id,
      range: '<=3.0.3', severity: 'high',
    }] },
    expo: { via: ['braces'] },
    uuid: { via: [{
      name: 'uuid', url: 'https://github.com/advisories/GHSA-w5hq-g745-h8pq',
      range: '<11.1.1', severity: 'moderate',
    }] },
  } };
}

function fakeGithub(initial = {}) {
  const state = {
    issues: [], comments: [], jobs: [], calls: [], label: true, ...structuredClone(initial),
  };
  const method = (name, fn) => async args => {
    state.calls.push({ name, args: structuredClone(args) });
    return fn(args);
  };
  const issues = {
    getLabel: method('getLabel', () => {
      if (!state.label) throw Object.assign(new Error('Absent'), { status: 404 });
      return { data: { name: 'security' } };
    }),
    createLabel: method('createLabel', () => { state.label = true; }),
    listForRepo: method('listForRepo', () => structuredClone(state.issues)),
    listComments: method('listComments', args =>
      structuredClone(state.comments.filter(comment => comment.issue_number === args.issue_number))),
    create: method('create', args => {
      const issue = {
        number: Math.max(0, ...state.issues.map(item => item.number)) + 1,
        title: args.title, body: args.body, state: 'open', user: bot,
      };
      state.issues.push(issue);
      return { data: structuredClone(issue) };
    }),
    update: method('update', args => {
      const issue = state.issues.find(item => item.number === args.issue_number);
      Object.assign(issue, { body: args.body, state: args.state });
      return { data: structuredClone(issue) };
    }),
    createComment: method('createComment', args => {
      state.comments.push({ ...args, user: bot });
      return { data: {} };
    }),
  };
  const github = {
    rest: {
      issues,
      actions: {
        listJobsForWorkflowRunAttempt: method('jobs', () => structuredClone(state.jobs)),
      },
    },
    paginate: (endpoint, args) => endpoint(args),
  };
  return { github, state };
}

function findings(report = npmReport()) {
  return collectProblems([failedJob()], () => report);
}

test('un avis npm crée un seul problème malgré ses dépendances parentes', () => {
  const problems = findings();
  assert.equal(problems.length, 1);
  assert.match(problems[0].title, /braces.*GHSA-vfj7-8cjw-p6xm/);
});

test('un nouvel avis du même paquet reste un problème distinct', () => {
  assert.notEqual(findings()[0].key, findings(npmReport('GHSA-aaaa-bbbb-cccc'))[0].key);
});

test('le même avis présent sur web et mobile regroupe les deux contrôles', () => {
  const problems = collectProblems([
    failedJob(), failedJob('Qualité et dépendances web'),
  ], () => npmReport());
  assert.equal(problems.length, 1);
  assert.equal(problems[0].details.length, 2);
  assert.match(problems[0].details.join('\n'), /web/);
  assert.match(problems[0].details.join('\n'), /mobile/);
});

test('Trivy distingue les CVE et paquets, sans dupliquer versions ou cibles', () => {
  const report = { Results: [
    { Type: 'debian', Target: 'image:ancienne', Vulnerabilities: [
      { PkgName: 'libexample', VulnerabilityID: 'CVE-2026-10001',
        Severity: 'HIGH', InstalledVersion: '1.0', FixedVersion: '1.2' },
      { PkgName: 'libexample', VulnerabilityID: 'CVE-2026-10002',
        Severity: 'CRITICAL', InstalledVersion: '1.0', FixedVersion: '1.3' },
      { PkgName: 'autre', VulnerabilityID: 'CVE-2026-10001',
        Severity: 'HIGH', InstalledVersion: '1.0', FixedVersion: '1.2' },
      { PkgName: 'sans-correctif', VulnerabilityID: 'CVE-2026-10003', Severity: 'HIGH' },
    ] },
    { Type: 'debian', Target: 'image:nouvelle', Vulnerabilities: [
      { PkgName: 'libexample', VulnerabilityID: 'CVE-2026-10001',
        Severity: 'HIGH', InstalledVersion: '1.1', FixedVersion: '1.2' },
    ] },
  ] };
  const problems = collectProblems([failedJob('Image Docker (Trivy)', imageStep)], () => report);
  assert.equal(problems.length, 3);
  assert.equal(problems[0].details.length, 2);
});

test('les mauvaises configurations Trivy sont signalées au seuil bloquant', () => {
  const report = { Results: [{ Type: 'dockerfile', Target: 'backend/Dockerfile',
    Misconfigurations: [
      { ID: 'AVD-DS-0002', Severity: 'HIGH', Status: 'FAIL' },
      { ID: 'AVD-DS-0003', Severity: 'LOW', Status: 'FAIL' },
      { ID: 'AVD-DS-0004', Severity: 'HIGH', Status: 'PASS' },
    ],
  }] };
  const problems = collectProblems([failedJob('Image Docker (Trivy)',
    'Mauvaises configurations du Dockerfile (utilisateur root, etc.)')], () => report);
  assert.equal(problems.length, 1);
  assert.match(problems[0].title, /AVD-DS-0002/);
});

for (const [reason, reader] of [
  ['absent', () => { throw new Error('ENOENT'); }],
  ['invalide', () => JSON.parse('{')],
  ['inexploitable', () => ({ error: { message: 'ne pas publier ce texte du registre' } })],
]) {
  test('un rapport ' + reason + ' conserve un signalement du contrôle', () => {
    const problems = collectProblems([failedJob()], reader);
    assert.equal(problems.length, 1);
    assert.match(problems[0].title, /^\[CI\]/);
    assert.doesNotMatch(problems[0].details.join('\n'), /ne pas publier/);
  });
}

test('les échecs de lint et de compilation restent séparés et les succès sont ignorés', () => {
  const problems = collectProblems([
    failedJob('Qualité et dépendances web', 'Qualité du code'),
    failedJob('Qualité et dépendances web', 'Compiler'),
    { name: 'Autre', conclusion: 'success' },
    { name: 'DAST', conclusion: 'skipped' },
    failedJob('Ticket de sécurité', 'Reporter'),
  ], () => { throw new Error('Aucun rapport attendu'); });
  assert.equal(problems.length, 2);
  assert.notEqual(problems[0].key, problems[1].key);
});

test('un échec sans étape identifiable reste visible', () => {
  const problems = collectProblems([{ name: 'Tests', conclusion: 'failure' }], () => null);
  assert.equal(problems.length, 1);
  assert.match(problems[0].title, /Exécution du job/);
});

test('main puis develop et un nouveau commit partagent une issue, même après renommage', async () => {
  const { github, state } = fakeGithub({ label: false });
  await syncIssues({ github, repo, run, problems: findings() });
  state.issues[0].title = 'Titre choisi par un humain';
  state.issues[0].body += '\n\nNote humaine à conserver.';
  await syncIssues({
    github, repo, run: { ...run, id: 101, branch: 'develop', sha: 'b'.repeat(40) },
    problems: findings(),
  });
  assert.equal(state.issues.length, 1);
  assert.equal(state.comments.length, 1);
  assert.match(state.issues[0].body, /Branches concernées : develop, main/);
  assert.match(state.issues[0].body, /Note humaine à conserver/);
  assert.match(state.comments[0].body, /b{40}/);
  assert.equal(state.calls.filter(call => call.name === 'createLabel').length, 1);
});

test('la reprise de la création ou du commentaire ne produit aucun doublon', async () => {
  const { github, state } = fakeGithub();
  for (const id of [100, 100, 101, 101]) {
    await syncIssues({ github, repo, run: { ...run, id }, problems: findings() });
  }
  assert.equal(state.issues.length, 1);
  assert.equal(state.comments.length, 1);
  await syncIssues({ github, repo, run: { ...run, id: 101, attempt: 2 }, problems: findings() });
  assert.equal(state.comments.length, 2);
});

test('une issue fermée est rouverte si le même problème réapparaît', async () => {
  const { github, state } = fakeGithub();
  await syncIssues({ github, repo, run, problems: findings() });
  state.issues[0].state = 'closed';
  await syncIssues({ github, repo, run: { ...run, id: 102 }, problems: findings() });
  assert.equal(state.issues.length, 1);
  assert.equal(state.issues[0].state, 'open');
  assert.equal(state.comments.length, 1);
  assert.equal(state.calls.find(call => call.name === 'listForRepo').args.state, 'all');
});

test('un échec de lecture des issues interdit de créer une issue à l’aveugle', async () => {
  const { github, state } = fakeGithub();
  github.paginate = async () => { throw new Error('API indisponible'); };
  await assert.rejects(syncIssues({ github, repo, run, problems: findings() }), /indisponible/);
  assert.equal(state.issues.length, 0);
});

test('un marqueur copié par un tiers ne permet pas de détourner le signalement', async () => {
  const { github, state } = fakeGithub();
  await syncIssues({ github, repo, run, problems: findings() });
  state.issues[0].user = { login: 'un-tiers' };
  await syncIssues({ github, repo, run: { ...run, id: 101 }, problems: findings() });
  assert.equal(state.issues.length, 2);
  assert.equal(state.comments.length, 0);
});

test('les valeurs du rapport restent du texte sans HTML ni mention active', () => {
  const report = npmReport();
  report.vulnerabilities.braces.via[0].range = '<img src=x> @example\n<!-- faux -->';
  const detail = findings(report)[0].details[0];
  assert.doesNotMatch(detail, /(?<!\\)<img|@example|\n|(?<!\\)<!--/);
  assert.match(detail, /@​example/);
});

test('une PR, une branche de travail ou un dispatch ne peut écrire des issues', async () => {
  for (const overrides of [
    { eventName: 'pull_request' },
    { eventName: 'workflow_dispatch' },
    { ref: 'refs/heads/ci/test' },
    { ref: 'refs/tags/main' },
  ]) {
    const { github, state } = fakeGithub();
    await assert.rejects(reportFailures({
      github, context: { ...context, ...overrides }, reportsDirectory: '.', attempt: 1,
    }), /réservé/);
    assert.equal(state.calls.length, 0);
  }
});

test('la collecte utilise uniquement les jobs et rapports de la tentative courante', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'pfe-ci-issues-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  for (const attempt of [1, 2]) mkdirSync(join(directory, String(attempt)));
  writeFileSync(join(directory, '1', 'npm-audit-mobile.json'),
    JSON.stringify(npmReport('GHSA-aaaa-bbbb-cccc')));
  writeFileSync(join(directory, '2', 'npm-audit-mobile.json'),
    JSON.stringify(npmReport()));
  const { github, state } = fakeGithub({ jobs: [failedJob()] });
  await reportFailures({ github, context, reportsDirectory: directory, attempt: 2 });
  assert.equal(state.issues.length, 1);
  assert.match(state.issues[0].title, /GHSA-vfj7-8cjw-p6xm/);
  assert.match(state.issues[0].body, /\/attempts\/2/);
  assert.equal(state.calls.find(call => call.name === 'jobs').args.attempt_number, 2);
});

test('un scan planifié réutilise les issues des push précédents', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'pfe-ci-schedule-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const { github, state } = fakeGithub({ jobs: [failedJob()] });
  await reportFailures({ github, context, reportsDirectory: directory, attempt: 1 });
  await reportFailures({
    github, context: { ...context, eventName: 'schedule', runId: 103 },
    reportsDirectory: directory, attempt: 1,
  });
  assert.equal(state.issues.length, 1);
  assert.equal(state.comments.length, 1);
});
