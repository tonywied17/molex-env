'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { load } = require('../src');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'menv-'));
}

/* ================================================================== */
/*  File resolution & precedence                                       */
/* ================================================================== */

test('load: reads .menv from cwd', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'PORT=3000');

  const result = load({ cwd: dir });

  assert.strictEqual(result.parsed.PORT, 3000);
  assert.strictEqual(result.files.length, 1);
});

test('load: returns empty when no files exist', () => {
  const dir = makeTempDir();
  const result = load({ cwd: dir });

  assert.deepStrictEqual(result.parsed, {});
  assert.deepStrictEqual(result.files, []);
});

test('load: merges .menv and .menv.local (local wins)', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'PORT=3000\nDEBUG=false');
  fs.writeFileSync(path.join(dir, '.menv.local'), 'DEBUG=true');

  const result = load({ cwd: dir });

  assert.strictEqual(result.parsed.PORT, 3000);
  assert.strictEqual(result.parsed.DEBUG, true);
});

test('load: merges with profile files', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'PORT=3000\nDEBUG=false');
  fs.writeFileSync(path.join(dir, '.menv.local'), 'DEBUG=true');
  fs.writeFileSync(path.join(dir, '.menv.prod'), 'PORT=9000');

  const result = load({ cwd: dir, profile: 'prod' });

  assert.strictEqual(result.parsed.PORT, 9000);
  assert.strictEqual(result.parsed.DEBUG, true);
});

test('load: profile.local overrides profile', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'PORT=3000');
  fs.writeFileSync(path.join(dir, '.menv.prod'), 'PORT=8080');
  fs.writeFileSync(path.join(dir, '.menv.prod.local'), 'PORT=9999');

  const result = load({ cwd: dir, profile: 'prod' });

  assert.strictEqual(result.parsed.PORT, 9999);
});

test('load: full 4-file precedence chain', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'A=1\nB=1\nC=1\nD=1');
  fs.writeFileSync(path.join(dir, '.menv.local'), 'B=2\nC=2\nD=2');
  fs.writeFileSync(path.join(dir, '.menv.dev'), 'C=3\nD=3');
  fs.writeFileSync(path.join(dir, '.menv.dev.local'), 'D=4');

  const result = load({ cwd: dir, profile: 'dev' });

  assert.strictEqual(result.parsed.A, 1);
  assert.strictEqual(result.parsed.B, 2);
  assert.strictEqual(result.parsed.C, 3);
  assert.strictEqual(result.parsed.D, 4);
});

test('load: skips missing files in precedence chain gracefully', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'PORT=3000');
  // no .menv.local, no .menv.staging, no .menv.staging.local

  const result = load({ cwd: dir, profile: 'staging' });

  assert.strictEqual(result.parsed.PORT, 3000);
  assert.strictEqual(result.files.length, 1);
});

/* ================================================================== */
/*  files option — custom file list                                    */
/* ================================================================== */

test('load: respects explicit files option', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'PORT=3000');
  fs.writeFileSync(path.join(dir, '.menv.prod'), 'PORT=9000');
  fs.writeFileSync(path.join(dir, '.menv.custom'), 'PORT=7000');

  const result = load({ cwd: dir, files: ['.menv.custom'] });

  assert.strictEqual(result.parsed.PORT, 7000);
});

test('load: files option with multiple custom files', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, 'a.env'), 'X=1');
  fs.writeFileSync(path.join(dir, 'b.env'), 'X=2\nY=3');

  const result = load({ cwd: dir, files: ['a.env', 'b.env'] });

  assert.strictEqual(result.parsed.X, 2);
  assert.strictEqual(result.parsed.Y, 3);
});

test('load: files option with absolute path', () => {
  const dir = makeTempDir();
  const abs = path.join(dir, 'custom.menv');
  fs.writeFileSync(abs, 'KEY=value');

  const result = load({ files: [abs] });

  assert.strictEqual(result.parsed.KEY, 'value');
});

test('load: files option ignores profile when set', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'A=1');
  fs.writeFileSync(path.join(dir, '.menv.prod'), 'B=2');
  fs.writeFileSync(path.join(dir, 'custom.menv'), 'C=3');

  const result = load({ cwd: dir, profile: 'prod', files: ['custom.menv'] });

  assert.strictEqual(result.parsed.C, 3);
  assert.strictEqual(result.parsed.A, undefined);
  assert.strictEqual(result.parsed.B, undefined);
});

/* ================================================================== */
/*  Return values: parsed, raw, origins, files                         */
/* ================================================================== */

test('load: returns raw string values alongside parsed', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'PORT=3000\nDEBUG=false');

  const result = load({ cwd: dir });

  assert.strictEqual(result.raw.PORT, '3000');
  assert.strictEqual(result.raw.DEBUG, 'false');
  assert.strictEqual(result.parsed.PORT, 3000);
  assert.strictEqual(result.parsed.DEBUG, false);
});

test('load: raw values reflect the last-write (overridden value)', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'PORT=3000');
  fs.writeFileSync(path.join(dir, '.menv.local'), 'PORT=9000');

  const result = load({ cwd: dir });

  assert.strictEqual(result.raw.PORT, '9000');
  assert.strictEqual(result.parsed.PORT, 9000);
});

test('load: origins track correct file and line', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'A=1\nB=2');

  const result = load({ cwd: dir });

  assert.ok(result.origins.A.file.endsWith('.menv'));
  assert.strictEqual(result.origins.A.line, 1);
  assert.strictEqual(result.origins.B.line, 2);
});

test('load: origins update to last overriding file', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'PORT=3000');
  fs.writeFileSync(path.join(dir, '.menv.local'), 'PORT=9000');

  const result = load({ cwd: dir });

  assert.ok(result.origins.PORT.file.endsWith('.menv.local'));
  assert.strictEqual(result.origins.PORT.line, 1);
  assert.strictEqual(result.origins.PORT.raw, '9000');
});

test('load: files array lists only files that exist and were read', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'A=1');
  // .menv.local does not exist

  const result = load({ cwd: dir });

  assert.strictEqual(result.files.length, 1);
  assert.ok(result.files[0].endsWith('.menv'));
});

/* ================================================================== */
/*  Strict mode with load                                              */
/* ================================================================== */

test('load strict: rejects unknown keys with schema', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'PORT=3000\nEXTRA=1');

  assert.throws(() => load({
    cwd: dir,
    strict: true,
    schema: { PORT: { type: 'number' } },
  }), (err) => err.name === 'MenvError');
});

test('load strict: rejects within-file duplicate keys', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'PORT=3000\nPORT=3001');

  assert.throws(() => load({ cwd: dir, strict: true }));
});

test('load strict: allows cross-file overrides', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'PORT=3000\nDEBUG=false');
  fs.writeFileSync(path.join(dir, '.menv.prod'), 'PORT=8080');

  const result = load({ cwd: dir, profile: 'prod', strict: true });

  assert.strictEqual(result.parsed.PORT, 8080);
  assert.strictEqual(result.parsed.DEBUG, false);
});

test('load strict: enforces required schema keys', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'PORT=3000');

  assert.throws(() => load({
    cwd: dir,
    strict: true,
    schema: {
      PORT: { type: 'number' },
      SERVICE_URL: { type: 'string', required: true },
    },
  }), (err) => err.message.includes('Missing required key'));
});

test('load strict: passes when required key is present', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'PORT=3000\nURL=http://x.com');

  const result = load({
    cwd: dir,
    strict: true,
    schema: {
      PORT: { type: 'number' },
      URL: { type: 'string', required: true },
    },
  });

  assert.strictEqual(result.parsed.URL, 'http://x.com');
});

test('load strict: rejects invalid lines in file', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'PORT=3000\nINVALID LINE');

  assert.throws(() => load({ cwd: dir, strict: true }));
});

/* ================================================================== */
/*  Schema with load                                                   */
/* ================================================================== */

test('load schema: applies default values', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'PORT=3000');

  const result = load({
    cwd: dir,
    schema: {
      PORT: { type: 'number' },
      HOST: { type: 'string', default: '0.0.0.0' },
    },
  });

  assert.strictEqual(result.parsed.HOST, '0.0.0.0');
});

test('load schema: default does not override file value', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'HOST=127.0.0.1');

  const result = load({
    cwd: dir,
    schema: { HOST: { type: 'string', default: '0.0.0.0' } },
  });

  assert.strictEqual(result.parsed.HOST, '127.0.0.1');
});

test('load schema: type coercion applied per schema', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'PORT=3000\nDEBUG=true\nDATA={"a":1}');

  const result = load({
    cwd: dir,
    schema: { PORT: 'number', DEBUG: 'boolean', DATA: 'json' },
  });

  assert.strictEqual(typeof result.parsed.PORT, 'number');
  assert.strictEqual(typeof result.parsed.DEBUG, 'boolean');
  assert.strictEqual(typeof result.parsed.DATA, 'object');
});

/* ================================================================== */
/*  Cast option with load                                              */
/* ================================================================== */

test('load cast false: all values remain strings', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'PORT=3000\nDEBUG=true');

  const result = load({ cwd: dir, cast: false });

  assert.strictEqual(typeof result.parsed.PORT, 'string');
  assert.strictEqual(typeof result.parsed.DEBUG, 'string');
});

test('load cast selective: only numbers', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'PORT=3000\nDEBUG=true');

  const result = load({
    cwd: dir,
    cast: { boolean: false, number: true, json: false, date: false },
  });

  assert.strictEqual(result.parsed.PORT, 3000);
  assert.strictEqual(result.parsed.DEBUG, 'true');
});

/* ================================================================== */
/*  exportEnv option                                                   */
/* ================================================================== */

test('load exportEnv: writes to process.env', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'MENV_TEST_EXPORT=hello');

  try {
    load({ cwd: dir, exportEnv: true });
    assert.strictEqual(process.env.MENV_TEST_EXPORT, 'hello');
  } finally {
    delete process.env.MENV_TEST_EXPORT;
  }
});

test('load exportEnv: does not override existing by default', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'MENV_TEST_NOOVERRIDE=new');

  process.env.MENV_TEST_NOOVERRIDE = 'original';

  try {
    load({ cwd: dir, exportEnv: true, override: false });
    assert.strictEqual(process.env.MENV_TEST_NOOVERRIDE, 'original');
  } finally {
    delete process.env.MENV_TEST_NOOVERRIDE;
  }
});

test('load exportEnv: overrides existing when override=true', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'MENV_TEST_OVERRIDE=new');

  process.env.MENV_TEST_OVERRIDE = 'original';

  try {
    load({ cwd: dir, exportEnv: true, override: true });
    assert.strictEqual(process.env.MENV_TEST_OVERRIDE, 'new');
  } finally {
    delete process.env.MENV_TEST_OVERRIDE;
  }
});

test('load exportEnv: converts values to strings for process.env', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'NUM=42\nBOOL=true');

  try {
    load({ cwd: dir, exportEnv: true });
    assert.strictEqual(process.env.NUM, '42');
    assert.strictEqual(process.env.BOOL, 'true');
  } finally {
    delete process.env.NUM;
    delete process.env.BOOL;
  }
});

test('load exportEnv false: does not write to process.env', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'MENV_TEST_NOEXPORT=val');

  load({ cwd: dir, exportEnv: false });
  assert.strictEqual(process.env.MENV_TEST_NOEXPORT, undefined);
});

/* ================================================================== */
/*  attach option — process.menv                                       */
/* ================================================================== */

test('load attach: attaches to process.menv by default', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'PORT=3000');

  const original = process.menv;

  try {
    const result = load({ cwd: dir });
    assert.strictEqual(process.menv, result.parsed);
    assert.strictEqual(process.menv.PORT, 3000);
  } finally {
    if (original === undefined) {
      delete process.menv;
    } else {
      process.menv = original;
    }
  }
});

test('load attach false: does not modify process.menv', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'PORT=3000');

  const original = process.menv;

  try {
    load({ cwd: dir, attach: false });
    assert.strictEqual(process.menv, original);
  } finally {
    if (original === undefined) {
      delete process.menv;
    } else {
      process.menv = original;
    }
  }
});

/* ================================================================== */
/*  freeze option                                                      */
/* ================================================================== */

test('load freeze: result is frozen by default', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'PORT=3000');

  const result = load({ cwd: dir, attach: false });

  assert.ok(Object.isFrozen(result.parsed));
});

test('load freeze false: result is mutable', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'PORT=3000');

  const result = load({ cwd: dir, attach: false, freeze: false });

  assert.ok(!Object.isFrozen(result.parsed));
  result.parsed.PORT = 9999;
  assert.strictEqual(result.parsed.PORT, 9999);
});

test('load freeze: nested JSON objects are deeply frozen', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'DATA={"a":{"b":1}}');

  const result = load({ cwd: dir, attach: false });

  assert.ok(Object.isFrozen(result.parsed));
  assert.ok(Object.isFrozen(result.parsed.DATA));
  assert.ok(Object.isFrozen(result.parsed.DATA.a));
});

/* ================================================================== */
/*  onWarning callback with load                                       */
/* ================================================================== */

test('load onWarning: fires for within-file duplicates', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'PORT=3000\nPORT=4000');

  const warnings = [];
  load({ cwd: dir, onWarning: (w) => warnings.push(w), attach: false });

  assert.strictEqual(warnings.length, 1);
  assert.strictEqual(warnings[0].type, 'duplicate');
  assert.strictEqual(warnings[0].key, 'PORT');
});

test('load onWarning: does not fire for cross-file overrides', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'PORT=3000');
  fs.writeFileSync(path.join(dir, '.menv.local'), 'PORT=4000');

  const warnings = [];
  load({ cwd: dir, onWarning: (w) => warnings.push(w), attach: false });

  assert.strictEqual(warnings.length, 0);
});

/* ================================================================== */
/*  debug option (console logging — smoke tests)                       */
/* ================================================================== */

test('load debug: does not throw with debug enabled', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'PORT=3000');
  fs.writeFileSync(path.join(dir, '.menv.local'), 'PORT=9000');

  // Capture console.log to prevent noise; just verify it doesn't throw
  const origLog = console.log;
  const logs = [];
  console.log = (...args) => logs.push(args.join(' '));

  try {
    const result = load({ cwd: dir, debug: true, attach: false });
    assert.strictEqual(result.parsed.PORT, 9000);
    assert.ok(logs.some((l) => l.includes('Override')));
  } finally {
    console.log = origLog;
  }
});

test('load debug false: no console output for overrides', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'PORT=3000');
  fs.writeFileSync(path.join(dir, '.menv.local'), 'PORT=9000');

  const origLog = console.log;
  const logs = [];
  console.log = (...args) => logs.push(args.join(' '));

  try {
    load({ cwd: dir, debug: false, attach: false });
    assert.strictEqual(logs.filter((l) => l.includes('Override')).length, 0);
  } finally {
    console.log = origLog;
  }
});

/* ================================================================== */
/*  Default export / require patterns                                  */
/* ================================================================== */

test('module: default export is load function', () => {
  const molexEnv = require('../src');
  assert.strictEqual(typeof molexEnv, 'function');
});

test('module: named exports available', () => {
  const molexEnv = require('../src');
  assert.strictEqual(typeof molexEnv.load, 'function');
  assert.strictEqual(typeof molexEnv.parse, 'function');
  assert.strictEqual(typeof molexEnv.watch, 'function');
});

test('module: default export and .load are equivalent', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), 'A=1');

  const molexEnv = require('../src');
  const r1 = molexEnv({ cwd: dir, attach: false, freeze: false });
  const r2 = molexEnv.load({ cwd: dir, attach: false, freeze: false });

  assert.deepStrictEqual(r1.parsed, r2.parsed);
});

/* ================================================================== */
/*  Edge cases                                                         */
/* ================================================================== */

test('edge: empty .menv file', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), '');

  const result = load({ cwd: dir, attach: false });

  assert.deepStrictEqual(result.parsed, {});
  assert.strictEqual(result.files.length, 1);
});

test('edge: .menv with only comments', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), '# only comments\n# nothing here\n');

  const result = load({ cwd: dir, attach: false });

  assert.deepStrictEqual(result.parsed, {});
});

test('edge: no options passed to load', () => {
  // Just verify it doesn't throw (uses cwd as default)
  assert.doesNotThrow(() => load());
});

test('edge: schema with all types combined in one load', () => {
  const dir = makeTempDir();
  fs.writeFileSync(path.join(dir, '.menv'), [
    'S=hello',
    'N=42',
    'B=true',
    'J={"x":1}',
    'D=2026-06-15',
  ].join('\n'));

  const result = load({
    cwd: dir,
    attach: false,
    schema: {
      S: 'string',
      N: 'number',
      B: 'boolean',
      J: 'json',
      D: 'date',
    },
  });

  assert.strictEqual(result.parsed.S, 'hello');
  assert.strictEqual(result.parsed.N, 42);
  assert.strictEqual(result.parsed.B, true);
  assert.deepStrictEqual(result.parsed.J, { x: 1 });
  assert.ok(result.parsed.D instanceof Date);
});
