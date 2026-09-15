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
