'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { parse } = require('../src');

/* ================================================================== */
/*  parser.js — line parsing, comments, quotes, export keyword         */
/* ================================================================== */

test('parse: basic key=value parsing', () => {
  const result = parse('FOO=bar');
  assert.strictEqual(result.parsed.FOO, 'bar');
});

test('parse: multiple key=value pairs', () => {
  const result = parse('A=1\nB=2\nC=3');
  assert.strictEqual(result.parsed.A, 1);
  assert.strictEqual(result.parsed.B, 2);
  assert.strictEqual(result.parsed.C, 3);
});

test('parse: skips blank lines and whitespace-only lines', () => {
  const result = parse('\n\n  \nFOO=bar\n\n');
  assert.deepStrictEqual(Object.keys(result.parsed), ['FOO']);
});

test('parse: skips comment lines starting with #', () => {
  const result = parse('# comment\nFOO=bar\n# another comment');
  assert.deepStrictEqual(Object.keys(result.parsed), ['FOO']);
});

test('parse: strips inline comments outside quotes', () => {
  const result = parse('FOO=bar # inline comment');
  assert.strictEqual(result.parsed.FOO, 'bar');
});

test('parse: preserves # inside double-quoted values', () => {
  const result = parse('FOO="bar#baz"');
  assert.strictEqual(result.parsed.FOO, 'bar#baz');
});

test('parse: preserves # inside single-quoted values', () => {
  const result = parse("FOO='bar#baz'");
  assert.strictEqual(result.parsed.FOO, 'bar#baz');
});

test('parse: handles double-quoted values with escape sequences', () => {
  const result = parse('MSG="hello\\nworld\\t!"');
  assert.strictEqual(result.parsed.MSG, 'hello\nworld\t!');
});

test('parse: handles single-quoted values with escape sequences', () => {
  const result = parse("MSG='hello\\nworld'");
  assert.strictEqual(result.parsed.MSG, 'hello\nworld');
});

test('parse: handles escaped backslash in quotes', () => {
  const result = parse('PATH="C:\\\\Users\\\\test"');
  assert.strictEqual(result.parsed.PATH, 'C:\\Users\\test');
});

test('parse: supports export keyword prefix', () => {
  const result = parse('export FOO=bar');
  assert.strictEqual(result.parsed.FOO, 'bar');
});

test('parse: handles empty values', () => {
  const result = parse('EMPTY=', { cast: false });
  assert.strictEqual(result.parsed.EMPTY, '');
});

test('parse: handles values with = sign in them', () => {
  const result = parse('URL=postgres://host:5432/db?sslmode=require', { cast: false });
  assert.strictEqual(result.parsed.URL, 'postgres://host:5432/db?sslmode=require');
});

test('parse: handles keys with underscores and numbers', () => {
  const result = parse('MY_VAR_2=val', { cast: false });
  assert.strictEqual(result.parsed.MY_VAR_2, 'val');
});

test('parse: handles spaces around = sign', () => {
  const result = parse('FOO = bar', { cast: false });
  assert.strictEqual(result.parsed.FOO, 'bar');
});

test('parse: handles Windows-style CRLF line endings', () => {
  const result = parse('A=1\r\nB=2');
  assert.strictEqual(result.parsed.A, 1);
  assert.strictEqual(result.parsed.B, 2);
});

/* ================================================================== */
/*  Strict mode parsing                                                */
/* ================================================================== */

test('parse strict: rejects invalid lines', () => {
  assert.throws(
    () => parse('PORT=3000\nINVALID LINE', { strict: true }),
    (err) => err.name === 'MenvError',
  );
});

test('parse strict: accepts valid lines only', () => {
  const result = parse('PORT=3000\nDEBUG=true', { strict: true });
  assert.strictEqual(result.parsed.PORT, 3000);
  assert.strictEqual(result.parsed.DEBUG, true);
});

test('parse non-strict: silently skips invalid lines', () => {
  const result = parse('PORT=3000\nINVALID LINE\nDEBUG=true');
  assert.strictEqual(result.parsed.PORT, 3000);
  assert.strictEqual(result.parsed.DEBUG, true);
  assert.strictEqual(Object.keys(result.parsed).length, 2);
});

/* ================================================================== */
/*  Type casting — autoCast                                            */
/* ================================================================== */

test('cast: booleans true/false (case-insensitive)', () => {
  const result = parse('A=true\nB=FALSE\nC=True\nD=fAlSe');
  assert.strictEqual(result.parsed.A, true);
  assert.strictEqual(result.parsed.B, false);
  assert.strictEqual(result.parsed.C, true);
  assert.strictEqual(result.parsed.D, false);
});

test('cast: integers', () => {
  const result = parse('A=42\nB=0\nC=-7');
  assert.strictEqual(result.parsed.A, 42);
  assert.strictEqual(result.parsed.B, 0);
  assert.strictEqual(result.parsed.C, -7);
});

test('cast: floating point numbers', () => {
  const result = parse('A=3.14\nB=-0.5');
  assert.strictEqual(result.parsed.A, 3.14);
  assert.strictEqual(result.parsed.B, -0.5);
});

test('cast: JSON objects', () => {
  const result = parse('DATA={"key":"value","n":1}');
  assert.deepStrictEqual(result.parsed.DATA, { key: 'value', n: 1 });
});

test('cast: JSON arrays', () => {
  const result = parse('LIST=[1,2,3]');
  assert.deepStrictEqual(result.parsed.LIST, [1, 2, 3]);
});

test('cast: invalid JSON falls back to string', () => {
  const result = parse('BAD={not json}');
  assert.strictEqual(result.parsed.BAD, '{not json}');
});

test('cast: ISO date strings', () => {
  const result = parse('D=2026-02-02');
  assert.ok(result.parsed.D instanceof Date);
  assert.strictEqual(result.parsed.D.getFullYear(), 2026);
});

test('cast: ISO datetime strings', () => {
  const result = parse('D=2026-12-31T23:59:59Z');
  assert.ok(result.parsed.D instanceof Date);
});

test('cast: strings that look like dates but aren\'t valid fall back', () => {
  const result = parse('D=9999-99-99');
  assert.ok(result.parsed.D !== undefined);
});

test('cast: plain strings remain as strings', () => {
  const result = parse('NAME=hello_world');
  assert.strictEqual(result.parsed.NAME, 'hello_world');
  assert.strictEqual(typeof result.parsed.NAME, 'string');
});

/* ================================================================== */
/*  cast: false — disables all casting                                 */
/* ================================================================== */

test('cast false: everything stays as strings', () => {
  const input = 'A=true\nB=42\nC={"x":1}\nD=2026-01-01';
  const result = parse(input, { cast: false });
  assert.strictEqual(result.parsed.A, 'true');
  assert.strictEqual(result.parsed.B, '42');
  assert.strictEqual(result.parsed.C, '{"x":1}');
  assert.strictEqual(result.parsed.D, '2026-01-01');
});

/* ================================================================== */
/*  Selective cast options                                             */
/* ================================================================== */

test('cast selective: only booleans', () => {
  const result = parse('A=true\nB=42\nC={"x":1}', {
    cast: { boolean: true, number: false, json: false, date: false },
  });
  assert.strictEqual(result.parsed.A, true);
  assert.strictEqual(result.parsed.B, '42');
  assert.strictEqual(result.parsed.C, '{"x":1}');
});

test('cast selective: only numbers', () => {
  const result = parse('A=true\nB=42', {
    cast: { boolean: false, number: true, json: false, date: false },
  });
  assert.strictEqual(result.parsed.A, 'true');
  assert.strictEqual(result.parsed.B, 42);
});

test('cast selective: only json', () => {
  const result = parse('A=true\nB=42\nC={"x":1}', {
    cast: { boolean: false, number: false, json: true, date: false },
  });
  assert.strictEqual(result.parsed.A, 'true');
  assert.strictEqual(result.parsed.B, '42');
  assert.deepStrictEqual(result.parsed.C, { x: 1 });
});

test('cast selective: only dates', () => {
  const result = parse('A=true\nB=42\nD=2026-01-01', {
    cast: { boolean: false, number: false, json: false, date: true },
  });
  assert.strictEqual(result.parsed.A, 'true');
  assert.strictEqual(result.parsed.B, '42');
  assert.ok(result.parsed.D instanceof Date);
});

test('cast selective: defaults enable everything when key omitted', () => {
  const result = parse('A=true\nB=42', { cast: {} });
  assert.strictEqual(result.parsed.A, true);
  assert.strictEqual(result.parsed.B, 42);
});

/* ================================================================== */
/*  Schema — type coercion via coerceType                              */
/* ================================================================== */

test('schema: coerces string type', () => {
  const result = parse('PORT=3000', { schema: { PORT: 'string' } });
  assert.strictEqual(result.parsed.PORT, '3000');
});

test('schema: coerces number type', () => {
  const result = parse('PORT=3000', { schema: { PORT: 'number' } });
  assert.strictEqual(result.parsed.PORT, 3000);
});

test('schema: coerces boolean type (true)', () => {
  const result = parse('DEBUG=TRUE', { schema: { DEBUG: 'boolean' } });
  assert.strictEqual(result.parsed.DEBUG, true);
});

test('schema: coerces boolean type (false)', () => {
  const result = parse('DEBUG=False', { schema: { DEBUG: 'boolean' } });
  assert.strictEqual(result.parsed.DEBUG, false);
});

test('schema: coerces json type', () => {
  const result = parse('DATA={"a":1}', { schema: { DATA: 'json' } });
  assert.deepStrictEqual(result.parsed.DATA, { a: 1 });
});

test('schema: coerces date type', () => {
  const result = parse('D=2026-02-02', { schema: { D: 'date' } });
  assert.ok(result.parsed.D instanceof Date);
});

test('schema: throws on invalid boolean', () => {
  assert.throws(
    () => parse('DEBUG=maybe', { schema: { DEBUG: 'boolean' }, strict: true }),
    (err) => err.name === 'MenvError',
  );
});

test('schema: throws on invalid number', () => {
  assert.throws(
    () => parse('PORT=abc', { schema: { PORT: 'number' }, strict: true }),
    (err) => err.name === 'MenvError',
  );
});

test('schema: throws on invalid json', () => {
  assert.throws(
    () => parse('DATA=not-json', { schema: { DATA: 'json' }, strict: true }),
  );
});

test('schema: throws on invalid date', () => {
  assert.throws(
    () => parse('D=not-a-date', { schema: { D: 'date' }, strict: true }),
    (err) => err.name === 'MenvError',
  );
});

test('schema: unknown type falls back to raw string', () => {
  const result = parse('FOO=bar', { schema: { FOO: 'unknown_type' } });
  assert.strictEqual(result.parsed.FOO, 'bar');
});

/* ================================================================== */
/*  Schema — object format with defaults and required                  */
/* ================================================================== */

test('schema: applies default values for missing keys', () => {
  const result = parse('A=1', {
    schema: {
      A: { type: 'number' },
      B: { type: 'string', default: 'fallback' },
    },
  });
  assert.strictEqual(result.parsed.B, 'fallback');
});

test('schema: default does not override existing value', () => {
  const result = parse('A=hello', {
    schema: { A: { type: 'string', default: 'fallback' } },
  });
  assert.strictEqual(result.parsed.A, 'hello');
});

test('schema: required key present passes strict', () => {
  const result = parse('URL=http://example.com', {
    strict: true,
    schema: { URL: { type: 'string', required: true } },
  });
  assert.strictEqual(result.parsed.URL, 'http://example.com');
});

test('schema: required key missing throws in strict', () => {
  assert.throws(
    () => parse('', { strict: true, schema: { URL: { type: 'string', required: true } } }),
    (err) => err.message.includes('Missing required key'),
  );
});

test('schema: required key missing does NOT throw without strict', () => {
  const result = parse('', { schema: { URL: { type: 'string', required: true } } });
  assert.strictEqual(result.parsed.URL, undefined);
});

test('schema: string shorthand format works', () => {
  const result = parse('PORT=3000', { schema: { PORT: 'number' } });
  assert.strictEqual(result.parsed.PORT, 3000);
});

test('schema: object format works', () => {
  const result = parse('PORT=3000', { schema: { PORT: { type: 'number' } } });
  assert.strictEqual(result.parsed.PORT, 3000);
});

test('schema: mixed shorthand and object format', () => {
  const result = parse('PORT=3000\nDEBUG=true', {
    schema: {
      PORT: 'number',
      DEBUG: { type: 'boolean' },
    },
  });
  assert.strictEqual(result.parsed.PORT, 3000);
  assert.strictEqual(result.parsed.DEBUG, true);
});

/* ================================================================== */
/*  Strict mode — unknown keys and within-file duplicates              */
/* ================================================================== */

test('strict: rejects unknown keys when schema provided', () => {
  assert.throws(
    () => parse('PORT=3000\nEXTRA=foo', {
      strict: true,
      schema: { PORT: 'number' },
    }),
    (err) => err.message.includes('Unknown key'),
  );
});

test('strict: rejects within-file duplicate keys', () => {
  assert.throws(
    () => parse('PORT=3000\nPORT=4000', { strict: true }),
    (err) => err.message.includes('Duplicate key'),
  );
});

test('non-strict: within-file duplicates last-value-wins', () => {
  const result = parse('PORT=3000\nPORT=4000');
  assert.strictEqual(result.parsed.PORT, 4000);
});

test('strict: allows all keys when no schema provided', () => {
  // strict without schema only checks for duplicates + invalid lines
  const result = parse('A=1\nB=2', { strict: true });
  assert.strictEqual(result.parsed.A, 1);
  assert.strictEqual(result.parsed.B, 2);
});

/* ================================================================== */
/*  onWarning callback                                                 */
/* ================================================================== */

test('onWarning: fires for within-file duplicates in non-strict mode', () => {
  const warnings = [];
  parse('PORT=3000\nPORT=4000', {
    onWarning: (w) => warnings.push(w),
  });
  assert.strictEqual(warnings.length, 1);
  assert.strictEqual(warnings[0].type, 'duplicate');
  assert.strictEqual(warnings[0].key, 'PORT');
  assert.strictEqual(warnings[0].line, 2);
});

test('onWarning: not called when no duplicates', () => {
  const warnings = [];
  parse('A=1\nB=2', { onWarning: (w) => warnings.push(w) });
  assert.strictEqual(warnings.length, 0);
});

/* ================================================================== */
/*  Return value: raw, origins, files                                  */
/* ================================================================== */

test('return: raw contains original string values', () => {
  const result = parse('PORT=3000\nDEBUG=true');
  assert.strictEqual(result.raw.PORT, '3000');
  assert.strictEqual(result.raw.DEBUG, 'true');
});

test('return: raw for schema-typed values', () => {
  const result = parse('PORT=3000', { schema: { PORT: 'number' } });
  assert.strictEqual(result.raw.PORT, '3000');
  assert.strictEqual(result.parsed.PORT, 3000);
});

test('return: origins contain line numbers', () => {
  const result = parse('A=1\nB=2\nC=3');
  assert.strictEqual(result.origins.A.line, 1);
  assert.strictEqual(result.origins.B.line, 2);
  assert.strictEqual(result.origins.C.line, 3);
});

test('return: origins contain raw value', () => {
  const result = parse('PORT=3000');
  assert.strictEqual(result.origins.PORT.raw, '3000');
});

test('return: origins contain file path', () => {
  const result = parse('PORT=3000', { filePath: 'test.menv' });
  assert.strictEqual(result.origins.PORT.file, 'test.menv');
});

test('return: default file is <inline>', () => {
  const result = parse('PORT=3000');
  assert.strictEqual(result.origins.PORT.file, '<inline>');
});

test('return: files array with custom filePath', () => {
  const result = parse('A=1', { filePath: '/custom/path' });
  assert.deepStrictEqual(result.files, ['/custom/path']);
});

test('return: files array empty without filePath', () => {
  const result = parse('A=1');
  assert.deepStrictEqual(result.files, []);
});

/* ================================================================== */
/*  Freeze option                                                      */
/* ================================================================== */

test('freeze: parsed object is frozen by default', () => {
  const result = parse('PORT=3000');
  assert.ok(Object.isFrozen(result.parsed));
  assert.throws(() => { result.parsed.PORT = 9999; });
});

test('freeze: nested objects are deeply frozen', () => {
  const result = parse('DATA={"a":{"b":1}}');
  assert.ok(Object.isFrozen(result.parsed.DATA));
  assert.ok(Object.isFrozen(result.parsed.DATA.a));
});

test('freeze false: parsed object is mutable', () => {
  const result = parse('PORT=3000', { freeze: false });
  assert.ok(!Object.isFrozen(result.parsed));
  result.parsed.PORT = 9999;
  assert.strictEqual(result.parsed.PORT, 9999);
});
