// Builds one self-contained QA report from findings.json plus the run's screens/.
//
// Every judgment lives in findings.json; this script holds only arithmetic:
// pixel->percent conversion for the overlay boxes, base64 inlining, counts, and
// referential integrity. Section order is array order and every section carries
// its own prose, so the same script builds any report.
//
// Usage: node build-report.mjs <run-dir> [outfile]
//   <run-dir>  holds findings.json and screens/
//   [outfile]  defaults to <run-dir>/report.html

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const RUN_DIR = resolve(process.argv[2] ?? '.');
const OUT = resolve(process.argv[3] ?? resolve(RUN_DIR, 'report.html'));

const die = (message) => {
  console.error(`build-report: ${message}`);
  process.exit(1);
};

const spec = JSON.parse(
  await readFile(resolve(RUN_DIR, 'findings.json'), 'utf8').catch(() =>
    die(`no findings.json in ${RUN_DIR}`),
  ),
);

const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

const list = (value) => (Array.isArray(value) ? value : []);

// ---- load screens -----------------------------------------------------------

// PNG dimensions live in the IHDR chunk, bytes 16-24.
const pngSize = (buffer) => ({
  width: buffer.readUInt32BE(16),
  height: buffer.readUInt32BE(20),
});

const mime = (file) => (/\.jpe?g$/i.test(file) ? 'image/jpeg' : 'image/png');

const screens = new Map();
for (const screen of list(spec.screens)) {
  if (!screen.id) die('a screen has no id');
  if (screens.has(screen.id)) die(`duplicate screen id: ${screen.id}`);

  const path = resolve(RUN_DIR, screen.file ?? '');
  const bytes = await readFile(path).catch(() =>
    die(`screen "${screen.id}" points at a file that does not exist: ${screen.file}`),
  );

  const isPng = bytes.length > 24 && bytes.readUInt32BE(0) === 0x89504e47;
  if (!isPng && list(screen.marks).length)
    die(`screen "${screen.id}" carries marks but is not a PNG — cannot read its dimensions`);

  const { width, height } = isPng ? pngSize(bytes) : { width: 0, height: 0 };
  screens.set(screen.id, {
    ...screen,
    width,
    height,
    dataUri: `data:${mime(screen.file)};base64,${bytes.toString('base64')}`,
  });
}

// ---- referential integrity --------------------------------------------------

const scenarios = new Map();
for (const scenario of list(spec.scenarios)) {
  if (!scenario.id) die('a scenario has no id');
  if (scenarios.has(scenario.id)) die(`duplicate scenario id: ${scenario.id}`);
  scenarios.set(scenario.id, scenario);
}

const problems = [];
const checkScreens = (ids, where) => {
  for (const id of list(ids)) if (!screens.has(id)) problems.push(`${where} references unknown screen "${id}"`);
};
const checkScenarios = (ids, where) => {
  for (const id of list(ids)) if (!scenarios.has(id)) problems.push(`${where} references unknown scenario "${id}"`);
};

for (const scenario of scenarios.values()) checkScreens(scenario.evidence, `scenario ${scenario.id}`);
for (const finding of list(spec.findings)) {
  checkScreens(finding.evidence, `finding ${finding.id ?? '?'}`);
  checkScenarios(finding.scenarios, `finding ${finding.id ?? '?'}`);
}
spec.sections?.forEach((section, i) => {
  const where = `section ${i + 1} ("${section.title ?? ''}")`;
  checkScreens(section.screens, where);
  checkScenarios(section.scenarios, where);
});
if (problems.length) die(`referential integrity:\n  - ${problems.join('\n  - ')}`);

// ---- counts -----------------------------------------------------------------

const by = (items, key) =>
  items.reduce((acc, item) => ((acc[item[key]] = (acc[item[key]] ?? 0) + 1), acc), {});

const results = by([...scenarios.values()], 'result');
const kinds = by(list(spec.findings), 'kind');
const KIND_LABEL = { defect: 'defects', gap: 'known gaps', setup: 'setup problems' };
const KIND_HEADING = {
  defect: 'Defects — the code is wrong',
  gap: 'Known gaps — deliberately not built',
  setup: 'Setup problems — the environment lacked something',
};

// ---- rendering --------------------------------------------------------------

const pct = (value, total) => `${((value / total) * 100).toFixed(3)}%`;

const renderMark = (mark, screen) => {
  const kind = esc(mark.kind ?? 'note');
  if (mark.pin) {
    const [x, y] = mark.pin;
    return `<span class="mark mark--pin ${kind}" data-n="${mark.n}" style="left:${pct(x, screen.width)};top:${pct(y, screen.height)}"><b>${mark.n}</b></span>`;
  }
  const [x, y, w, h] = mark.box;
  return `<span class="mark ${kind} badge-${esc(mark.badge ?? 'tl')}" data-n="${mark.n}" style="left:${pct(x, screen.width)};top:${pct(y, screen.height)};width:${pct(w, screen.width)};height:${pct(h, screen.height)}"><b>${mark.n}</b></span>`;
};

const renderLegend = (mark) => `
    <li class="callout ${esc(mark.kind ?? 'note')}" data-n="${mark.n}" tabindex="0">
      <span class="callout-n" aria-hidden="true">${mark.n}</span>
      <div>
        <p class="callout-label">${esc(mark.label)}${mark.kind ? `<span class="tag ${esc(mark.kind)}">${esc(mark.kind)}</span>` : ''}</p>
        ${mark.text ? `<p class="callout-text">${esc(mark.text)}</p>` : ''}
      </div>
    </li>`;

const renderScreen = (id) => {
  const screen = screens.get(id);
  const marks = list(screen.marks);
  const cap = Math.min(screen.width || 1180, 1180);
  const ratio = screen.width ? `aspect-ratio:${screen.width} / ${screen.height};` : '';

  return `
  <figure class="screen" id="screen-${esc(id)}">
    <div class="shot-scroll">
      <div class="shot" style="width:min(100%, ${cap}px);${ratio}">
        <img src="${screen.dataUri}" alt="${esc(screen.caption ?? id)}"${screen.width ? ` width="${screen.width}" height="${screen.height}"` : ''}>
        ${marks.length ? `<span class="overlay" aria-hidden="true">${marks.map((mark) => renderMark(mark, screen)).join('')}</span>` : ''}
      </div>
    </div>
    <figcaption><span class="screen-id">${esc(id)}</span>${screen.caption ? ` ${esc(screen.caption)}` : ''}</figcaption>
    ${marks.length ? `<ol class="callouts">${marks.map(renderLegend).join('')}</ol>` : ''}
  </figure>`;
};

const evidenceLinks = (ids) =>
  list(ids)
    .map((id) => `<a class="ev" href="#screen-${esc(id)}">${esc(id)}</a>`)
    .join(' ');

const scenarioRow = (scenario) => `
      <tr id="scenario-${esc(scenario.id)}">
        <td class="mono">${esc(scenario.id)}</td>
        <td>${esc(scenario.did)}</td>
        <td>${esc(scenario.expected)}</td>
        <td><span class="result ${esc(scenario.result)}">${esc(scenario.result)}</span></td>
        <td>${esc(scenario.observed)}${list(scenario.evidence).length ? `<span class="evs">${evidenceLinks(scenario.evidence)}</span>` : ''}</td>
      </tr>`;

const scenarioTable = (rows, id) => `
  <div class="table-scroll">
    <table${id ? ` id="${id}"` : ''}>
      <thead><tr><th>#</th><th>Did</th><th>Expected</th><th>Result</th><th>Observed</th></tr></thead>
      <tbody>${rows.map(scenarioRow).join('')}</tbody>
    </table>
  </div>`;

const renderSection = (section, i) => `
  <section id="sec-${i + 1}">
    <div class="sec-head"><span class="sec-n">§${i + 1}</span><h2>${esc(section.title)}</h2></div>
    ${section.intro ?? ''}
    ${list(section.scenarios).length ? scenarioTable(section.scenarios.map((id) => scenarios.get(id))) : ''}
    ${list(section.screens).map(renderScreen).join('\n')}
  </section>`;

const renderFinding = (finding) => `
    <article class="finding ${esc(finding.kind)}" id="finding-${esc(finding.id)}">
      <h4><span class="finding-id">${esc(finding.id)}</span>${esc(finding.title)}
        ${finding.severity ? `<span class="sev ${esc(finding.severity)}">${esc(finding.severity)}</span>` : ''}</h4>
      ${list(finding.repro).length ? `<ol class="repro">${finding.repro.map((step) => `<li>${esc(step)}</li>`).join('')}</ol>` : ''}
      <dl>
        <dt>Expected</dt><dd>${esc(finding.expected)}</dd>
        <dt>Actual</dt><dd>${esc(finding.actual)}</dd>
      </dl>
      <p class="refs">
        ${list(finding.scenarios).map((id) => `<a class="ev" href="#scenario-${esc(id)}">${esc(id)}</a>`).join(' ')}
        ${evidenceLinks(finding.evidence)}
      </p>
    </article>`;

const findingGroups = ['defect', 'gap', 'setup']
  .map((kind) => ({ kind, items: list(spec.findings).filter((f) => f.kind === kind) }))
  .filter((group) => group.items.length);

const sections = list(spec.sections);
const placed = new Set(sections.flatMap((section) => list(section.screens)));
const unplaced = [...screens.keys()].filter((id) => !placed.has(id));

const railItems = [
  { href: '#run', label: 'The run', n: '·' },
  { href: '#scenarios', label: 'Scenarios', n: '·' },
  ...sections.map((section, i) => ({ href: `#sec-${i + 1}`, label: section.title, n: i + 1 })),
  ...(findingGroups.length ? [{ href: '#findings', label: 'Findings', n: '→' }] : []),
  ...(unplaced.length ? [{ href: '#evidence', label: 'Further evidence', n: '→' }] : []),
  ...(list(spec.notCovered).length ? [{ href: '#not-covered', label: 'Not covered', n: '?' }] : []),
];

const page = `<title>${esc(spec.run?.title ?? 'QA run')}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root {
    --ground: #faf8fc;
    --surface: #ffffff;
    --sunken: #f3eff9;
    --ink: #140032;
    --muted: #635a7b;
    --line: #e6dff1;
    --accent: #5a1cb7;
    --accent-soft: #ece0f5;
    --critical: #d61b7f;
    --critical-soft: #fde4f1;
    --ok: #157f4a;
    --ok-soft: #dcf3e6;
    --warn: #9a6100;
    --warn-soft: #fbeed0;
    --shadow: 0 1px 2px rgba(20, 0, 50, .06), 0 12px 28px -18px rgba(20, 0, 50, .3);
    --sans: ui-sans-serif, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
    --serif: Georgia, "Iowan Old Style", "Times New Roman", serif;
    --mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --ground: #100a20;
      --surface: #1a1233;
      --sunken: #221845;
      --ink: #efeaf8;
      --muted: #a79dc0;
      --line: #2f2356;
      --accent: #b69af5;
      --accent-soft: #2b1d55;
      --critical: #f472b6;
      --critical-soft: #45123a;
      --ok: #5ed39b;
      --ok-soft: #10331f;
      --warn: #f0b95c;
      --warn-soft: #3a2a09;
      --shadow: 0 1px 2px rgba(0, 0, 0, .4), 0 14px 30px -18px rgba(0, 0, 0, .7);
    }
  }
  :root[data-theme="dark"] {
    --ground: #100a20;
    --surface: #1a1233;
    --sunken: #221845;
    --ink: #efeaf8;
    --muted: #a79dc0;
    --line: #2f2356;
    --accent: #b69af5;
    --accent-soft: #2b1d55;
    --critical: #f472b6;
    --critical-soft: #45123a;
    --ok: #5ed39b;
    --ok-soft: #10331f;
    --warn: #f0b95c;
    --warn-soft: #3a2a09;
    --shadow: 0 1px 2px rgba(0, 0, 0, .4), 0 14px 30px -18px rgba(0, 0, 0, .7);
  }

  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--ground);
    color: var(--ink);
    font-family: var(--serif);
    font-size: 17px;
    line-height: 1.62;
    -webkit-font-smoothing: antialiased;
  }
  .wrap {
    max-width: 1500px;
    margin: 0 auto;
    padding: clamp(28px, 5vw, 72px) clamp(18px, 4vw, 56px) 96px;
    display: grid;
    gap: clamp(28px, 4vw, 64px);
  }
  @media (min-width: 1100px) {
    .wrap { grid-template-columns: 210px minmax(0, 1fr); align-items: start; }
    .masthead, footer { grid-column: 1 / -1; }
  }

  /* ---- masthead ---- */
  .masthead { border-bottom: 2px solid var(--ink); padding-bottom: 24px; }
  .eyebrow {
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: var(--muted);
    margin: 0 0 14px;
  }
  h1 {
    font-family: var(--sans);
    font-weight: 800;
    letter-spacing: -.025em;
    font-size: clamp(30px, 5vw, 50px);
    line-height: 1.04;
    margin: 0 0 18px;
    text-wrap: balance;
  }
  .verdict {
    display: inline-block;
    font-family: var(--sans);
    font-weight: 700;
    font-size: clamp(17px, 2vw, 21px);
    padding: 10px 16px;
    border-radius: 4px;
    border-left: 4px solid var(--accent);
    background: var(--accent-soft);
  }
  .verdict.ok { border-color: var(--ok); background: var(--ok-soft); }
  .verdict.warn { border-color: var(--warn); background: var(--warn-soft); }
  .verdict.fail { border-color: var(--critical); background: var(--critical-soft); }
  .tallies {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 10px 40px;
    margin: 26px 0 0;
    padding: 0;
    font-family: var(--sans);
  }
  .tallies b {
    display: block;
    font-size: 30px;
    font-weight: 800;
    letter-spacing: -.02em;
    font-variant-numeric: tabular-nums;
  }
  .tallies span {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .tallies .is-defect b { color: var(--critical); }
  .tallies .is-pass b { color: var(--ok); }

  /* ---- contents rail ---- */
  .rail { font-family: var(--sans); font-size: 14px; }
  @media (min-width: 1100px) { .rail { position: sticky; top: 32px; } }
  .rail p {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--muted);
    margin: 0 0 12px;
  }
  .rail ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 9px; }
  .rail a { color: var(--ink); text-decoration: none; display: flex; gap: 9px; line-height: 1.35; }
  .rail a:hover { color: var(--accent); }
  .rail a i { font-family: var(--mono); font-style: normal; color: var(--muted); font-size: 12px; padding-top: 2px; }

  /* ---- sections ---- */
  main { display: grid; gap: clamp(44px, 6vw, 88px); min-width: 0; }
  section { min-width: 0; scroll-margin-top: 24px; }
  .sec-head { display: flex; gap: 16px; align-items: baseline; margin-bottom: 6px; }
  .sec-n { font-family: var(--mono); font-size: 13px; color: var(--muted); padding-top: 6px; }
  h2 {
    font-family: var(--sans);
    font-weight: 800;
    letter-spacing: -.02em;
    font-size: clamp(23px, 3vw, 31px);
    line-height: 1.14;
    margin: 0;
    text-wrap: balance;
  }
  h3 {
    font-family: var(--mono);
    font-weight: 500;
    font-size: 11.5px;
    letter-spacing: .13em;
    text-transform: uppercase;
    color: var(--muted);
    margin: 34px 0 12px;
    padding-bottom: 7px;
    border-bottom: 1px solid var(--line);
    max-width: 70ch;
  }
  section > p, li, dd { max-width: 70ch; }
  ul.plain { padding-left: 22px; margin: 0; display: grid; gap: 9px; }
  ul.plain li::marker { color: var(--accent); }

  .facts { list-style: none; padding: 0; margin: 22px 0 0; display: grid; gap: 7px; font-family: var(--sans); font-size: 15px; }
  .facts li { display: flex; gap: 10px; flex-wrap: wrap; }
  .facts .src { color: var(--muted); font-family: var(--mono); font-size: 12px; }

  /* ---- screens ---- */
  .screen { margin: 34px 0 0; }
  figcaption {
    margin-top: 12px;
    font-family: var(--sans);
    color: var(--muted);
    font-size: 15.5px;
    max-width: 76ch;
  }
  .screen-id {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--muted);
    border: 1px solid var(--line);
    border-radius: 3px;
    padding: 1px 6px;
    margin-right: 6px;
  }
  .shot-scroll { overflow-x: auto; padding-bottom: 4px; }
  .shot {
    position: relative;
    min-width: 660px;
    border: 1px solid var(--line);
    border-radius: 4px;
    overflow: hidden;
    background: var(--surface);
    box-shadow: var(--shadow);
  }
  .shot img { display: block; width: 100%; height: auto; }
  .overlay { position: absolute; inset: 0; }
  .mark { position: absolute; border: 2.5px solid var(--accent); border-radius: 5px; }
  .mark.bug { border-color: var(--critical); }
  .mark b {
    position: absolute;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--accent);
    color: #fff;
    font-family: var(--sans);
    font-size: 14px;
    font-weight: 700;
    line-height: 26px;
    text-align: center;
    box-shadow: 0 0 0 2.5px var(--surface);
    left: -13px;
    top: -13px;
  }
  .mark.bug b { background: var(--critical); }
  .badge-tr b { left: auto; right: -13px; }
  .badge-bl b { top: auto; bottom: -13px; }
  .badge-br b { left: auto; right: -13px; top: auto; bottom: -13px; }
  .mark--pin { border: none; width: 0; height: 0; }
  .shot.has-active .mark { opacity: .28; }
  .shot.has-active .mark.is-active { opacity: 1; }
  .mark.is-active b { transform: scale(1.16); }
  @media (prefers-reduced-motion: no-preference) {
    .mark, .mark b { transition: opacity .15s ease, transform .15s ease; }
  }

  .callouts { list-style: none; margin: 18px 0 0; padding: 0; display: grid; gap: 3px; }
  @media (min-width: 800px) { .callouts { grid-template-columns: 1fr 1fr; gap: 3px 30px; } }
  .callout { display: flex; gap: 12px; padding: 9px 10px; border-radius: 4px; cursor: default; }
  .callout:hover, .callout:focus-visible { background: var(--sunken); outline: none; }
  .callout:focus-visible { box-shadow: inset 0 0 0 2px var(--accent); }
  .callout-n {
    flex: 0 0 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--accent);
    color: #fff;
    font-family: var(--sans);
    font-size: 13px;
    font-weight: 700;
    line-height: 24px;
    text-align: center;
    margin-top: 2px;
  }
  .callout.bug .callout-n { background: var(--critical); }
  .callout-label { font-family: var(--sans); font-weight: 650; font-size: 15px; line-height: 1.4; margin: 0 0 2px; }
  .callout-text { margin: 0; font-family: var(--sans); font-size: 14.5px; line-height: 1.5; color: var(--muted); }

  .tag, .sev, .result {
    display: inline-block;
    padding: 1px 7px 2px;
    border-radius: 999px;
    background: var(--accent-soft);
    color: var(--accent);
    font-family: var(--mono);
    font-size: 10px;
    letter-spacing: .07em;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .tag { margin-left: 7px; vertical-align: 1px; }
  .tag.bug, .sev.blocker, .sev.major { background: var(--critical-soft); color: var(--critical); }
  .result { font-size: 11px; }
  .result.pass { background: var(--ok-soft); color: var(--ok); }
  .result.fail { background: var(--critical-soft); color: var(--critical); }
  .result.partial { background: var(--warn-soft); color: var(--warn); }
  .result.blocked { background: var(--sunken); color: var(--muted); }

  /* ---- tables ---- */
  .table-scroll { overflow-x: auto; margin-top: 18px; }
  table { border-collapse: collapse; width: 100%; min-width: 640px; font-family: var(--sans); font-size: 15px; }
  th, td { text-align: left; padding: 11px 14px; border-bottom: 1px solid var(--line); vertical-align: top; }
  th {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 500;
  }
  td.mono { font-family: var(--mono); font-size: 13px; color: var(--muted); white-space: nowrap; }
  a { color: var(--accent); text-decoration-thickness: 1px; text-underline-offset: 2px; }
  .ev, .evs a {
    font-family: var(--mono);
    font-size: 11px;
    text-decoration: none;
    border: 1px solid var(--line);
    border-radius: 3px;
    padding: 1px 5px;
    white-space: nowrap;
  }
  .evs { display: inline-flex; gap: 5px; flex-wrap: wrap; margin-left: 8px; }

  /* ---- findings ---- */
  .finding {
    border-left: 3px solid var(--accent);
    background: var(--surface);
    border-radius: 3px;
    padding: 16px 18px;
    margin-top: 16px;
    box-shadow: var(--shadow);
    scroll-margin-top: 24px;
  }
  .finding.defect { border-left-color: var(--critical); }
  .finding h4 {
    font-family: var(--sans);
    font-size: 17px;
    font-weight: 700;
    margin: 0 0 10px;
    line-height: 1.35;
    text-wrap: balance;
  }
  .finding-id { font-family: var(--mono); font-size: 12px; color: var(--muted); margin-right: 8px; }
  .sev { margin-left: 8px; vertical-align: 2px; }
  .repro { margin: 0 0 12px; padding-left: 20px; font-family: var(--sans); font-size: 15px; display: grid; gap: 4px; }
  .repro li::marker { font-family: var(--mono); color: var(--muted); }
  .finding dl { margin: 0; font-family: var(--sans); font-size: 15px; display: grid; grid-template-columns: max-content 1fr; gap: 4px 14px; }
  .finding dt { font-family: var(--mono); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); padding-top: 4px; }
  .finding dd { margin: 0; }
  .refs { display: flex; gap: 6px; flex-wrap: wrap; margin: 12px 0 0; }

  footer {
    border-top: 1px solid var(--line);
    padding-top: 22px;
    font-family: var(--sans);
    font-size: 14.5px;
    color: var(--muted);
  }
  code { font-family: var(--mono); font-size: .88em; background: var(--sunken); padding: 1px 5px; border-radius: 3px; }
</style>

<div class="wrap">
  <header class="masthead">
    <p class="eyebrow">QA run</p>
    <h1>${esc(spec.run?.title ?? 'QA run')}</h1>
    <p class="verdict ${esc(spec.run?.verdictTone ?? '')}">${esc(spec.run?.verdict ?? '')}</p>
    <ul class="tallies">
      <li><b>${scenarios.size}</b><span>scenarios</span></li>
      <li class="is-pass"><b>${results.pass ?? 0}</b><span>passed</span></li>
      ${['fail', 'partial', 'blocked']
        .filter((result) => results[result])
        .map((result) => `<li><b>${results[result]}</b><span>${result === 'fail' ? 'failed' : result}</span></li>`)
        .join('')}
      ${Object.keys(KIND_LABEL)
        .filter((kind) => kinds[kind])
        .map((kind) => `<li class="is-${kind}"><b>${kinds[kind]}</b><span>${KIND_LABEL[kind]}</span></li>`)
        .join('')}
    </ul>
  </header>

  <nav class="rail" aria-label="Contents">
    <p>Contents</p>
    <ol>${railItems
      .map((item) => `<li><a href="${item.href}"><i>${item.n}</i>${esc(item.label)}</a></li>`)
      .join('')}</ol>
  </nav>

  <main>
    <section id="run">
      <div class="sec-head"><span class="sec-n">·</span><h2>The run</h2></div>
      ${
        list(spec.run?.underTest).length
          ? `<h3>Under test</h3>
      <div class="table-scroll">
        <table>
          <thead><tr><th>Repo</th><th>Branch</th><th>Commit</th></tr></thead>
          <tbody>${spec.run.underTest
            .map(
              (item) =>
                `<tr><td>${esc(item.repo)}</td><td class="mono">${esc(item.branch)}</td><td class="mono">${esc(item.sha)}</td></tr>`,
            )
            .join('')}</tbody>
        </table>
      </div>`
          : ''
      }
      ${
        list(spec.run?.environment).length
          ? `<h3>Environment</h3>
      <ul class="plain">${spec.run.environment.map((line) => `<li>${esc(line)}</li>`).join('')}</ul>`
          : ''
      }
      ${
        list(spec.run?.groundTruth).length
          ? `<h3>Ground truth — resolved before the run</h3>
      <ul class="facts">${spec.run.groundTruth
        .map((item) => `<li>${esc(item.fact)}<span class="src">${esc(item.source)}</span></li>`)
        .join('')}</ul>`
          : ''
      }
    </section>

    <section id="scenarios">
      <div class="sec-head"><span class="sec-n">·</span><h2>Scenarios</h2></div>
      ${scenarioTable([...scenarios.values()])}
    </section>

    ${sections.map(renderSection).join('\n')}

    ${
      findingGroups.length
        ? `<section id="findings">
      <div class="sec-head"><span class="sec-n">→</span><h2>Findings</h2></div>
      ${findingGroups
        .map(
          (group) => `<h3>${KIND_HEADING[group.kind]}</h3>
      ${group.items.map(renderFinding).join('\n')}`,
        )
        .join('\n')}
    </section>`
        : ''
    }

    ${
      unplaced.length
        ? `<section id="evidence">
      <div class="sec-head"><span class="sec-n">→</span><h2>Further evidence</h2></div>
      ${unplaced.map(renderScreen).join('\n')}
    </section>`
        : ''
    }

    ${
      list(spec.notCovered).length
        ? `<section id="not-covered">
      <div class="sec-head"><span class="sec-n">?</span><h2>Not covered</h2></div>
      <div class="table-scroll">
        <table>
          <thead><tr><th>What</th><th>Why</th></tr></thead>
          <tbody>${spec.notCovered
            .map((item) => `<tr><td>${esc(item.what)}</td><td>${esc(item.why)}</td></tr>`)
            .join('')}</tbody>
        </table>
      </div>
    </section>`
        : ''
    }
  </main>

  <footer>
    <p>Generated from <code>findings.json</code>. Screenshots are inlined, so this file
    is self-contained and shareable as-is.</p>
  </footer>
</div>

<script>
  // Hovering or focusing a callout lifts its box on the screenshot and dims the rest.
  document.querySelectorAll('.screen').forEach((figure) => {
    const shot = figure.querySelector('.shot');
    const marks = new Map(
      [...figure.querySelectorAll('.mark')].map((mark) => [mark.dataset.n, mark]),
    );

    const setActive = (n) => {
      marks.forEach((mark, key) => mark.classList.toggle('is-active', key === n));
      shot.classList.toggle('has-active', n !== null);
    };

    figure.querySelectorAll('.callout').forEach((callout) => {
      const activate = () => setActive(callout.dataset.n);
      const clear = () => setActive(null);
      callout.addEventListener('mouseenter', activate);
      callout.addEventListener('focus', activate);
      callout.addEventListener('mouseleave', clear);
      callout.addEventListener('blur', clear);
    });
  });
</script>
`;

await writeFile(OUT, page);
console.log(
  `wrote ${OUT} (${(Buffer.byteLength(page) / 1024 / 1024).toFixed(2)} MB) — ` +
    `${scenarios.size} scenarios, ${list(spec.findings).length} findings, ${screens.size} screens`,
);
