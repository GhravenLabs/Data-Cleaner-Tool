const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

// Exercise the actual standalone app script without adding browser dependencies.
const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const app = vm.createContext({
  document: { getElementById: () => ({ addEventListener() {} }) },
});
vm.runInContext(script, app);
const parse = text => JSON.parse(JSON.stringify(app.parseCSV(text)));

function loadPasted(text) {
  let loaded = null, alerted = false;
  const sandbox = vm.createContext({
    document: {getElementById: () => ({value: text, addEventListener(){}})},
    alert: () => {alerted = true;},
  });
  vm.runInContext(script, sandbox);
  sandbox.setData = rows => {loaded = JSON.parse(JSON.stringify(rows));};
  sandbox.loadPaste();
  return {loaded, alerted};
}

test('pasted TSV retains leading and trailing empty cells', () => {
  assert.deepEqual(loadPasted('\tNotes\nAcme\t').loaded,
    [['', 'Notes'], ['Acme', '']]);
});

test('paste preserves cell whitespace until cleaning is requested', () => {
  assert.deepEqual(loadPasted(' Name,Notes\nAcme, value ').loaded,
    [[' Name', 'Notes'], ['Acme', ' value ']]);
});

test('whitespace-only paste still shows the empty-input message', () => {
  assert.deepEqual(loadPasted(' \t\n'), {loaded: null, alerted: true});
});

function cleanRows(rows, dedupe = true, emptyColumns = false) {
  const elements = new Map();
  const sandbox = vm.createContext({ document: { getElementById(id) {
    if (!elements.has(id)) elements.set(id, {
      checked: (id === 'o_dupes' && dedupe) || (id === 'o_emptycols' && emptyColumns), value: '', style: {},
      addEventListener() {},
    });
    return elements.get(id);
  } } });
  vm.runInContext(script, sandbox);
  sandbox.setData(rows);
  sandbox.clean();
  return JSON.parse(vm.runInContext('JSON.stringify(OUT)', sandbox));
}

test('deduplication preserves distinct rows containing separator characters', () => {
  const rows = [['First', 'Second'], ['a\u0001b', 'c'], ['a', 'b\u0001c']];
  assert.deepEqual(cleanRows(rows), rows);
});

test('deduplication removes exact duplicates while keeping original order', () => {
  const rows = [['First', 'Second'], ['a', 'b'], ['c', 'd'], ['a', 'b']];
  assert.deepEqual(cleanRows(rows), rows.slice(0, 3));
  assert.deepEqual(cleanRows(rows, false), rows);
});

test('TSV ignores commas inside quoted headers and values', () => {
  assert.deepEqual(parse('"Name, company, division"\tNotes\nAcme\t"a,b,c,d"'),
    [['Name, company, division', 'Notes'], ['Acme', 'a,b,c,d']]);
});

test('CSV ignores tabs inside quoted headers and values', () => {
  assert.deepEqual(parse('"Name\tcompany\tdivision",Notes\nAcme,"a\tb\tc\td"'),
    [['Name\tcompany\tdivision', 'Notes'], ['Acme', 'a\tb\tc\td']]);
});

test('header delimiter is not outweighed by punctuation in data', () => {
  assert.deepEqual(parse('Name\tNotes\nAcme\ta,b,c,d'),
    [['Name', 'Notes'], ['Acme', 'a,b,c,d']]);
});

test('multiline quoted header and escaped quotes preserve TSV structure', () => {
  assert.deepEqual(parse('"Name\n""company"", division"\tNotes\r\nAcme\tok'),
    [['Name\n"company", division', 'Notes'], ['Acme', 'ok']]);
});

test('ordinary CSV and TSV preserve empty cells', () => {
  for (const delimiter of [',', '\t']) {
    assert.deepEqual(parse(`Name${delimiter}Notes\nAcme${delimiter}\n`),
      [['Name', 'Notes'], ['Acme', '']]);
  }
});

test('CSV export round-trips commas, quotes and newlines', () => {
  const rows = [['Name', 'Notes'], ['Acme', 'a,b\n"quoted"']];
  assert.deepEqual(parse(app.toCSV(rows)), rows);
});

test('empty-column removal preserves values beyond the header width', () => {
  const rows = [['Name'], ['Acme', 'invoice note'], ['Beta']];
  assert.deepEqual(cleanRows(rows, false, true),
    [['Name', ''], ['Acme', 'invoice note'], ['Beta', '']]);
});

test('empty-column removal still drops truly empty extra columns', () => {
  const rows = [['Name'], ['Acme', '', 'note'], ['Beta', '', '']];
  assert.deepEqual(cleanRows(rows, false, true),
    [['Name', ''], ['Acme', 'note'], ['Beta', '']]);
});

test('quoted line endings survive import and export', () => {
  const rows = [['Name','Notes'], ['Acme','first\r\nsecond\rthird']];
  assert.deepEqual(parse('Name,Notes\r\nAcme,"first\r\nsecond\rthird"'), rows);
  assert.deepEqual(parse(app.toCSV(rows)), rows);
  assert.deepEqual(parse('Name,Notes\rAcme,ok'), [['Name','Notes'], ['Acme','ok']]);
});
