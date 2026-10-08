// The matrix table, from the result files the suites leave behind.
//
//   node contract-tests/report.mjs DIR        a box table for the terminal
//   node contract-tests/report.mjs DIR --md   markdown, for the step summary and the PR comment
//
// A result file is one line: node<TAB>cell<TAB>adapter<TAB>passed<TAB>failed. A suite that never
// wrote its counts did not get as far as booting.
import fs from 'node:fs';
import path from 'node:path';

const [dir, mode] = process.argv.slice(2);
if (!dir) {
  console.error('usage: report.mjs DIR [--md]');
  process.exit(2);
}

const colour = process.env.FORCE_COLOR || (process.stdout.isTTY && !process.env.NO_COLOR);
const paint = (code, s) => (colour ? `\x1b[${code}m${s}\x1b[0m` : s);
const green = (s) => paint(32, s);
const red = (s) => paint(31, s);
const dim = (s) => paint(2, s);
const bold = (s) => paint(1, s);

const files = (d) => fs.readdirSync(d, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? files(path.join(d, e.name)) : e.name.endsWith('.tsv') ? [path.join(d, e.name)] : []));

if (!fs.existsSync(dir) || files(dir).length === 0) {
  // every suite failed before writing its counts, or nothing ran: say so, the jobs carry the reason
  console.log(mode === '--md' ? '_no results: no suite got as far as reporting_' : '  no results: no suite got as far as reporting');
  process.exit(0);
}

const rows = files(dir).map((f) => {
  const [node, cell, adapter, passed, failed] = fs.readFileSync(f, 'utf8').trim().split('\t');

  return { node: Number(node), suite: adapter === '-' ? cell : `${cell} (platform-${adapter})`, passed, failed };
});

const nodes = [...new Set(rows.map((r) => r.node))].sort((a, b) => a - b);
const suites = [...new Set(rows.map((r) => r.suite))].sort();
const at = (suite, node) => rows.find((r) => r.suite === suite && r.node === node);

const verdict = (r) => {
  if (!r) {
    return { text: '', ok: true };
  }
  if (r.passed === '-') {
    return { text: '✗ did not boot', ok: false };
  }
  if (Number(r.failed) > 0) {
    return { text: `✗ ${r.failed} of ${Number(r.passed) + Number(r.failed)} failed`, ok: false };
  }

  return { text: `✓ ${r.passed}`, ok: true };
};

const header = ['cell', ...nodes.map((n) => `node ${n}`)];
const body = suites.map((s) => [s, ...nodes.map((n) => verdict(at(s, n)))]);
const allOk = body.every((cells) => cells.slice(1).every((v) => v.ok));
const ran = rows.filter((r) => r.passed !== '-');
const assertions = ran.reduce((sum, r) => sum + Number(r.passed) + Number(r.failed), 0);

if (mode === '--md') {
  console.log(`| ${header.join(' | ')} |`);
  console.log(`|${header.map(() => '---').join('|')}|`);
  for (const cells of body) {
    console.log(`| ${cells[0]} | ${cells.slice(1).map((v) => v.text).join(' | ')} |`);
  }
  console.log();
  console.log(allOk
    ? `**${rows.length} suites green** across node ${nodes.join(', ')} · ${assertions} assertions`
    : `**${body.flatMap((c) => c.slice(1)).filter((v) => !v.ok).length} suites red** · see the failing jobs`);
  process.exit(0);
}

// ---- the terminal table ------------------------------------------------------------

const textAt = (cells, i) => (i === 0 ? cells[0] : cells[i].text);
const widths = header.map((h, i) => Math.max(h.length, ...body.map((cells) => textAt(cells, i).length)));
const pad = (s, w) => s + ' '.repeat(w - s.length);
const line = (l, m, r) => l + widths.map((w) => '─'.repeat(w + 2)).join(m) + r;
const row = (cells) => '│ ' + cells.join(' │ ') + ' │';

console.log(line('┌', '┬', '┐'));
console.log(row(header.map((h, i) => bold(pad(h, widths[i])))));
console.log(line('├', '┼', '┤'));
for (const cells of body) {
  console.log(row([
    pad(cells[0], widths[0]),
    ...cells.slice(1).map((v, i) => (v.ok ? green : red)(pad(v.text, widths[i + 1])))
  ]));
}
console.log(line('└', '┴', '┘'));
console.log();
console.log(allOk
  ? `  ${green(`${rows.length} suites green`)} ${dim(`· node ${nodes.join(', ')} · ${assertions} assertions`)}`
  : `  ${red(`${body.flatMap((c) => c.slice(1)).filter((v) => !v.ok).length} suites red`)} ${dim(`· ${rows.length} suites · node ${nodes.join(', ')}`)}`);
