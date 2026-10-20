'use strict';

const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const BOT = 'github-actions[bot]';
const NPM_STEP = 'npm audit (bloquant à partir de la sévérité haute)';
const IMAGE_STEP = "Vulnérabilités de l'image (système et Python)";
const CONFIG_STEP = 'Mauvaises configurations du Dockerfile (utilisateur root, etc.)';
const BRANCHES = /<!-- pfe-ci-branches:([a-z,]+) -->\nBranches concernées :[^\n]*/;

function text(value) {
  return String(value).slice(0, 500).replace(/[\r\n]/g, ' ')
    .replace(/[\\*_{}\[\]<>()!|#\x60]/g, '\\$&').replace(/@/g, '@\u200b');
}

function problem(parts, title, detail) {
  return {
    key: createHash('sha256').update(JSON.stringify(parts)).digest('hex'),
    title: title.replace(/[\r\n]/g, ' ').replace(/@/g, '@\u200b').slice(0, 240),
    details: [detail],
  };
}

function npmProblems(report) {
  const problems = [];
  for (const [name, dependency] of Object.entries(report?.vulnerabilities ?? {})) {
    for (const advisory of dependency.via ?? []) {
      // Les chaînes sont les alertes propagées aux parents, pas de nouveaux avis.
      if (!advisory || typeof advisory !== 'object'
          || !['high', 'critical'].includes(advisory.severity)) continue;
      const id = /^https:\/\/github\.com\/advisories\/(GHSA-[a-z0-9-]+)$/
        .exec(advisory.url)?.[1];
      if (!id) continue; // Le contrôle en échec sera signalé si le rapport est inexploitable.
      const packageName = advisory.name || name;
      problems.push(problem(['npm', packageName, id],
        '[Sécurité][npm] ' + packageName + ' — ' + id,
        text(packageName) + ' : ' + id + ', sévérité ' + text(advisory.severity)
          + ', plage vulnérable ' + text(advisory.range || dependency.range || 'inconnue') + '.'));
    }
  }
  return problems;
}

function trivyProblems(report, kind) {
  const problems = [];
  for (const result of report?.Results ?? []) {
    const findings = kind === 'image' ? result.Vulnerabilities : result.Misconfigurations;
    for (const finding of findings ?? []) {
      if (!['HIGH', 'CRITICAL'].includes(finding.Severity)) continue;
      if (kind === 'image' && !finding.FixedVersion) continue; // Même --ignore-unfixed que le scan.
      if (kind === 'config' && finding.Status !== 'FAIL') continue;
      const id = kind === 'image' ? finding.VulnerabilityID : finding.ID;
      const target = kind === 'image' ? finding.PkgName : result.Target;
      if (!id || !target) continue;
      problems.push(problem(['trivy', kind, result.Type, target, id],
        '[Sécurité][Trivy] ' + target + ' — ' + id,
        text(target) + ' : ' + text(id) + ', sévérité ' + text(finding.Severity)
          + (kind === 'image'
            ? ', version ' + text(finding.InstalledVersion)
              + ', correctif ' + text(finding.FixedVersion)
            : '') + '.'));
    }
  }
  return problems;
}

function collectProblems(jobs, readReport) {
  const problems = new Map();
  for (const job of jobs) {
    if (job.conclusion !== 'failure' || job.name === 'Ticket de sécurité') continue;
    const failedSteps = (job.steps ?? []).filter(step => step.conclusion === 'failure');
    if (!failedSteps.length) failedSteps.push({ name: 'Exécution du job' });
    for (const step of failedSteps) {
      let findings = [];
      try {
        const app = /^Qualité et dépendances (web|mobile)$/.exec(job.name)?.[1];
        if (app && step.name === NPM_STEP) findings = npmProblems(readReport('npm-' + app));
        if (job.name === 'Image Docker (Trivy)' && step.name === IMAGE_STEP) {
          findings = trivyProblems(readReport('trivy-image'), 'image');
        }
        if (job.name === 'Image Docker (Trivy)' && step.name === CONFIG_STEP) {
          findings = trivyProblems(readReport('trivy-config'), 'config');
        }
      } catch {
        // Rapport absent/invalide : conserver un signalement du contrôle en échec.
        // Ne pas recopier les erreurs de registre, les logs ou leurs données sensibles.
        findings = [];
      }
      if (!findings.length) {
        findings.push(problem(['ci-step', job.name, step.name],
          '[CI] ' + job.name + ' — ' + step.name,
          'Échec du contrôle ' + text(job.name) + ', étape ' + text(step.name)
            + '. Consulter les résultats de cette exécution pour le diagnostic.'));
      }
      for (const finding of findings) {
        const detail = 'Contrôle : ' + text(job.name) + '. ' + finding.details[0];
        const existing = problems.get(finding.key);
        if (existing) existing.details = [...new Set([...existing.details, detail])];
        else problems.set(finding.key, { ...finding, details: [detail] });
      }
    }
  }
  return [...problems.values()];
}

function branchesBlock(branches) {
  const names = [...new Set(branches)].sort();
  return '<!-- pfe-ci-branches:' + names.join(',') + ' -->\nBranches concernées : '
    + names.map(text).join(', ') + '.';
}

function occurrence(run, finding) {
  return '<!-- pfe-ci-run:' + run.id + ':' + run.attempt + ' -->\n'
    + '**Branche :** ' + run.branch + '\n\n'
    + '**Commit :** ' + run.sha + '\n\n'
    + '**Exécution :** [' + run.id + ', tentative ' + run.attempt + '](' + run.url + ')\n\n'
    + finding.details.map(detail => '- ' + detail).join('\n');
}

async function syncIssues({ github, repo, run, problems }) {
  if (!problems.length) return [];
  try {
    await github.rest.issues.getLabel({ ...repo, name: 'security' });
  } catch (error) {
    if (error.status !== 404) throw error;
    await github.rest.issues.createLabel({
      ...repo, name: 'security', color: 'B60205',
      description: 'Problème détecté par la pipeline DevSecOps',
    });
  }
  // Liste paginée directe : pas de délai d'indexation de la recherche par titre.
  const issues = (await github.paginate(github.rest.issues.listForRepo, {
    ...repo, state: 'all', labels: 'security', per_page: 100,
  })).filter(issue => !issue.pull_request && issue.user?.login === BOT)
    .sort((left, right) => left.number - right.number);

  const results = [];
  for (const finding of problems) {
    const marker = '<!-- pfe-ci-issue:v1:' + finding.key + ' -->';
    const seen = '<!-- pfe-ci-run:' + run.id + ':' + run.attempt + ' -->';
    let issue = issues.find(candidate => (candidate.body || '').includes(marker));
    if (!issue) {
      const { data } = await github.rest.issues.create({
        ...repo, title: finding.title, labels: ['security'],
        body: marker + '\n' + branchesBlock([run.branch]) + '\n\n'
          + occurrence(run, finding)
          + '\n\nLes nouvelles détections sont ajoutées en commentaires. '
          + 'Cette issue reste ouverte jusqu’à vérification de la correction.',
      });
      issue = data;
      issues.push(issue);
      results.push({ number: issue.number, action: 'created' });
      continue;
    }

    const body = issue.body || '';
    const match = body.match(BRANCHES);
    const branches = (match?.[1].split(',') ?? [])
      .filter(branch => ['main', 'develop'].includes(branch));
    const block = branchesBlock([...branches, run.branch]);
    const updatedBody = match ? body.replace(BRANCHES, block) : block + '\n\n' + body;
    if (updatedBody !== body || issue.state === 'closed') {
      await github.rest.issues.update({
        ...repo, issue_number: issue.number, body: updatedBody, state: 'open',
      });
      issue.body = updatedBody;
      issue.state = 'open';
    }
    // Une reprise après une réponse API perdue ne republie pas la même occurrence.
    const comments = body.includes(seen) ? [] : await github.paginate(
      github.rest.issues.listComments, { ...repo, issue_number: issue.number, per_page: 100 });
    const alreadySeen = body.includes(seen)
      || comments.some(comment => comment.user?.login === BOT && comment.body?.includes(seen));
    if (!alreadySeen) {
      await github.rest.issues.createComment({
        ...repo, issue_number: issue.number, body: occurrence(run, finding),
      });
    }
    results.push({ number: issue.number, action: alreadySeen ? 'unchanged' : 'updated' });
  }
  return results;
}

async function reportFailures({ github, context, reportsDirectory, attempt }) {
  const branch = /^refs\/heads\/(main|develop)$/.exec(context.ref)?.[1];
  if (!branch || !['push', 'schedule'].includes(context.eventName)) {
    throw new Error('Signalement réservé aux push et scans planifiés de main/develop.');
  }
  if (!Number.isSafeInteger(attempt) || attempt < 1
      || !Number.isSafeInteger(context.runId) || context.runId < 1
      || !/^[a-f0-9]{40,64}$/.test(context.sha)) {
    throw new Error("Métadonnées d'exécution invalides.");
  }
  const repo = context.repo;
  const jobs = await github.paginate(github.rest.actions.listJobsForWorkflowRunAttempt, {
    ...repo, run_id: context.runId, attempt_number: attempt, per_page: 100,
  });
  const files = {
    'npm-web': 'npm-audit-web.json',
    'npm-mobile': 'npm-audit-mobile.json',
    'trivy-image': 'trivy-image.json',
    'trivy-config': 'trivy-config.json',
  };
  const problems = collectProblems(jobs, name =>
    JSON.parse(readFileSync(join(reportsDirectory, String(attempt), files[name]), 'utf8')));
  return syncIssues({
    github, repo, problems,
    run: {
      id: context.runId, attempt, branch, sha: context.sha,
      url: 'https://github.com/' + repo.owner + '/' + repo.repo
        + '/actions/runs/' + context.runId + '/attempts/' + attempt,
    },
  });
}

module.exports = { collectProblems, syncIssues, reportFailures };
