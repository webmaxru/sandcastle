import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Produce a copy-paste-friendly version of the article where every text-based artifact
// (code sample, Markdown table, Mermaid diagram) and every inline <p align=center><img>
// block is replaced by a simple-markdown image reference to its rendered PNG in media/.
// The prose is otherwise byte-for-byte identical to the source. Run render-media.mjs first
// so the PNGs exist. Output: <article>.linkedin.md next to the source.
//   Usage:  node build-image-md.mjs
// Adapting to another article: repoint ARTICLE and update BLOCKS / IMG_BLOCKS to its lines.
const __dir = dirname(fileURLToPath(import.meta.url));
const ARTICLE = join(__dir, '..', 'building-sandcastle-github-copilot-agent-framework.md');
const OUT = join(__dir, '..', 'building-sandcastle-github-copilot-agent-framework.linkedin.md');

const lines = readFileSync(ARTICLE, 'utf8').split(/\r?\n/);
const line = (n) => lines[n - 1]; // 1-indexed

// Fenced code/Mermaid blocks (span = opening fence .. closing fence) and Markdown tables
// (span = header .. last row). `id` is also the PNG basename in media/.
//   start: [end, id, alt, kind]   kind: 'fence' | 'table'
const BLOCKS = {
  32:  [34,  'code-pip-install',          'Install: pip install agent-framework-github-copilot', 'fence'],
  38:  [49,  'code-minimal-agent',        'A minimal GitHubCopilotAgent (Python)',               'fence'],
  57:  [65,  'table-capabilities',        'Agentic capabilities the Copilot provider exposes',   'table'],
  73:  [79,  'table-config-knobs',        'Configuration knobs (environment variables)',         'table'],
  104: [126, 'mmd-arch-system',           'Sandcastle system architecture',                      'fence'],
  138: [152, 'code-sessions-personas',    'backend/app/sessions.py — workspace + shared CopilotClient', 'fence'],
  156: [164, 'code-default-options',      'default_options — Copilot runtime options',           'fence'],
  170: [185, 'mmd-orchestrator-team',     'The Planner \u2192 Builder \u2192 Fixer agent team',  'fence'],
  191: [217, 'code-orchestrator',         'backend/app/agents/orchestrator.py',                  'fence'],
  227: [236, 'code-validation',           'backend/app/validation.py — the self-heal signal',    'fence'],
  240: [251, 'mmd-selfheal-state',        'The self-heal state machine',                         'fence'],
  257: [270, 'code-stream-map',           'backend/app/agents/stream_map.py',                    'fence'],
  274: [309, 'mmd-sse-sequence',          'The SSE build-stream, end to end',                    'fence'],
  353: [363, 'code-byok-make-client',     'backend/app/sessions.py — the BYOK client',           'fence'],
  367: [377, 'code-byok-default-options', 'backend/app/sessions.py — BYOK default_options',      'fence'],
  402: [408, 'mmd-observability',         'Observability wiring',                                'fence'],
  416: [431, 'mmd-deploy-azure',          'Azure deployment topology (free tiers)',              'fence'],
  441: [453, 'mmd-build-journey',         'The phased build journey',                            'fence'],
  469: [473, 'code-build-your-own',       'Clone and run Sandcastle',                            'fence'],
};

// Inline <p align="center"><img ...></p> blocks (always 3 lines). alt + src are parsed from
// the source; a media/*.svg src is retargeted to the rendered media/*.png.
const IMG_BLOCKS = [8, 20, 96, 313, 321, 339];

// ---- validate the mapping still matches the source (fail loudly on article drift) ----
const errs = [];
for (const [s, [e, id, , kind]] of Object.entries(BLOCKS)) {
  const start = +s;
  if (kind === 'fence') {
    if (!/^```/.test(line(start))) errs.push(`${id}: line ${start} is not an opening fence: ${line(start)}`);
    if (line(e) !== '```') errs.push(`${id}: line ${e} is not a closing fence: ${line(e)}`);
  } else {
    if (!line(start).trimStart().startsWith('|')) errs.push(`${id}: line ${start} is not a table row: ${line(start)}`);
    if (!line(e).trimStart().startsWith('|')) errs.push(`${id}: line ${e} is not a table row: ${line(e)}`);
  }
}
for (const s of IMG_BLOCKS) {
  if (line(s).trim() !== '<p align="center">') errs.push(`img block: line ${s} is not <p align="center">: ${line(s)}`);
  if (!/<img\b/.test(line(s + 1))) errs.push(`img block: line ${s + 1} has no <img>: ${line(s + 1)}`);
  if (line(s + 2).trim() !== '</p>') errs.push(`img block: line ${s + 2} is not </p>: ${line(s + 2)}`);
}
if (errs.length) { console.error('Mapping is stale — update BLOCKS/IMG_BLOCKS:\n' + errs.join('\n')); process.exit(1); }

// ---- build replacement map: start -> { end, text } ----
const repl = {};
for (const [s, [e, id, alt]] of Object.entries(BLOCKS)) {
  repl[+s] = { end: e, text: `![${alt}](media/${id}.png)` };
}
for (const s of IMG_BLOCKS) {
  const img = line(s + 1);
  const alt = (img.match(/alt="([^"]*)"/) || [, ''])[1];
  let src = (img.match(/src="([^"]*)"/) || [, ''])[1];
  src = src.replace(/(media\/[\w-]+)\.svg/, '$1.png'); // svg -> rendered png
  repl[s] = { end: s + 2, text: `![${alt}](${src})` };
}

// ---- emit: copy prose verbatim, swap each mapped span for its image reference ----
const out = [];
for (let i = 1; i <= lines.length; i++) {
  if (repl[i]) { out.push(repl[i].text); i = repl[i].end; continue; }
  out.push(line(i));
}
writeFileSync(OUT, out.join('\n'));
const n = Object.keys(BLOCKS).length + IMG_BLOCKS.length;
console.log(`Wrote ${OUT}\n${n} artifacts replaced with image references (${lines.length} -> ${out.length} lines).`);
