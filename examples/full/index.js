'use strict';

const { load, parse, watch } = require('molex-env');

/* ────────────────────────────────────────────────────────────────── *
 *  Helpers                                                          *
 * ────────────────────────────────────────────────────────────────── */

const SEP = '─'.repeat(60);

function header(title)
{
    console.log(`\n${SEP}`);
    console.log(`  ${title}`);
    console.log(SEP);
}

function table(obj)
{
    const entries = Object.entries(obj);
    const maxKey = Math.max(...entries.map(([k]) => k.length));
    for (const [key, val] of entries)
    {
        const type = val instanceof Date ? 'date' : typeof val;
        console.log(`  ${key.padEnd(maxKey)}  ${String(val).padEnd(40)}  (${type})`);
    }
}

/* ────────────────────────────────────────────────────────────────── *
 *  1. Basic Load                                                    *
 * ────────────────────────────────────────────────────────────────── */

header('1. Basic Load (reads .menv + .menv.local)');

const basic = load({ cwd: __dirname, attach: false, freeze: false });

console.log('  Files loaded:', basic.files.map((f) => f.split(/[/\\]/).pop()));
console.log();
table(basic.parsed);

/* ────────────────────────────────────────────────────────────────── *
 *  2. Profile-Based Loading                                         *
 * ────────────────────────────────────────────────────────────────── */

header('2. Profile: dev');

const dev = load({ cwd: __dirname, profile: 'dev', attach: false, freeze: false });

console.log('  Files loaded:', dev.files.map((f) => f.split(/[/\\]/).pop()));
console.log();
table(dev.parsed);

header('2b. Profile: prod');

const prod = load({ cwd: __dirname, profile: 'prod', attach: false, freeze: false });

console.log('  Files loaded:', prod.files.map((f) => f.split(/[/\\]/).pop()));
console.log();
table(prod.parsed);

/* ────────────────────────────────────────────────────────────────── *
 *  3. Raw vs Parsed Values                                          *
 * ────────────────────────────────────────────────────────────────── */

header('3. Raw vs Parsed Values');

const raw = load({ cwd: __dirname, attach: false });

const keys = ['PORT', 'DEBUG', 'META', 'LAUNCH_DATE', 'TIMEOUT'];
const maxK = Math.max(...keys.map((k) => k.length));

for (const key of keys)
{
    const r = raw.raw[key] || '(undefined)';
    const p = raw.parsed[key];
    const type = p instanceof Date ? 'date' : typeof p;
    console.log(`  ${key.padEnd(maxK)}  raw: ${String(r).padEnd(24)}  parsed: ${String(p).padEnd(24)}  (${type})`);
}

/* ────────────────────────────────────────────────────────────────── *
 *  4. Origin Tracking                                               *
 * ────────────────────────────────────────────────────────────────── */

header('4. Origin Tracking');

const tracked = load({ cwd: __dirname, profile: 'dev', attach: false });

for (const [key, origin] of Object.entries(tracked.origins))
{
    const file = origin.file.split(/[/\\]/).pop();
    console.log(`  ${key.padEnd(14)}  ${file}:${origin.line}  (raw: ${origin.raw})`);
}

/* ────────────────────────────────────────────────────────────────── *
 *  5. Schema Validation & Defaults                                  *
 * ────────────────────────────────────────────────────────────────── */

header('5. Schema Validation & Defaults');

const withSchema = load({
    cwd: __dirname,
    attach: false,
    schema: {
        PORT: { type: 'number', default: 3000 },
        HOST: { type: 'string', default: '127.0.0.1' },
        DEBUG: { type: 'boolean', default: false },
        META: { type: 'json' },
        LAUNCH_DATE: { type: 'date' },
        LOG_LEVEL: { type: 'string', default: 'info' }, // not in .menv — default applied
    },
});

console.log('  PORT:       ', withSchema.parsed.PORT, `(${typeof withSchema.parsed.PORT})`);
console.log('  HOST:       ', withSchema.parsed.HOST, `(${typeof withSchema.parsed.HOST})`);
console.log('  DEBUG:      ', withSchema.parsed.DEBUG, `(${typeof withSchema.parsed.DEBUG})`);
console.log('  META:       ', JSON.stringify(withSchema.parsed.META), `(${typeof withSchema.parsed.META})`);
console.log('  LAUNCH_DATE:', withSchema.parsed.LAUNCH_DATE, `(${withSchema.parsed.LAUNCH_DATE instanceof Date ? 'Date' : typeof withSchema.parsed.LAUNCH_DATE})`);
console.log('  LOG_LEVEL:  ', withSchema.parsed.LOG_LEVEL, '← default applied (not in .menv)');

/* ────────────────────────────────────────────────────────────────── *
 *  6. Type Casting Controls                                         *
 * ────────────────────────────────────────────────────────────────── */

header('6a. Cast: true (default — auto-detect all types)');

const autoCast = load({ cwd: __dirname, attach: false });
console.log('  PORT:  ', autoCast.parsed.PORT, `(${typeof autoCast.parsed.PORT})`);
console.log('  DEBUG: ', autoCast.parsed.DEBUG, `(${typeof autoCast.parsed.DEBUG})`);
console.log('  META:  ', JSON.stringify(autoCast.parsed.META), `(${typeof autoCast.parsed.META})`);

header('6b. Cast: false (everything stays a string)');

const noCast = load({ cwd: __dirname, cast: false, attach: false });
console.log('  PORT:  ', noCast.parsed.PORT, `(${typeof noCast.parsed.PORT})`);
console.log('  DEBUG: ', noCast.parsed.DEBUG, `(${typeof noCast.parsed.DEBUG})`);
console.log('  META:  ', noCast.parsed.META, `(${typeof noCast.parsed.META})`);

header('6c. Selective Cast (only numbers + booleans)');

const selective = load({
    cwd: __dirname,
    cast: { number: true, boolean: true, json: false, date: false },
    attach: false,
});
console.log('  PORT:       ', selective.parsed.PORT, `(${typeof selective.parsed.PORT})`);
console.log('  DEBUG:      ', selective.parsed.DEBUG, `(${typeof selective.parsed.DEBUG})`);
console.log('  META:       ', selective.parsed.META, `(${typeof selective.parsed.META}) ← stays string`);
console.log('  LAUNCH_DATE:', selective.parsed.LAUNCH_DATE, `(${typeof selective.parsed.LAUNCH_DATE}) ← stays string`);

/* ────────────────────────────────────────────────────────────────── *
 *  7. Strict Mode Error Handling                                    *
 * ────────────────────────────────────────────────────────────────── */

header('7a. Strict: unknown key rejected');

try
{
    load({
        cwd: __dirname,
        strict: true,
        attach: false,
        schema: { PORT: 'number' }, // only PORT allowed
    });
    console.log('  ✗ Unexpected success');
}
catch (err)
{
    console.log('  ✓ Caught:', err.message);
}

header('7b. Strict: within-file duplicate rejected');

try
{
    load({ cwd: __dirname, files: ['.menv.dup'], strict: true, attach: false });
    console.log('  ✗ Unexpected success');
}
catch (err)
{
    console.log('  ✓ Caught:', err.message);
}

header('7c. Strict: required key missing');

try
{
    load({
        cwd: __dirname,
        strict: true,
        attach: false,
        schema: { MISSING_KEY: { type: 'string', required: true } },
    });
    console.log('  ✗ Unexpected success');
}
catch (err)
{
    console.log('  ✓ Caught:', err.message);
}

/* ────────────────────────────────────────────────────────────────── *
 *  8. onWarning Callback                                            *
 * ────────────────────────────────────────────────────────────────── */

header('8. onWarning (non-strict duplicate detection)');

const warnings = [];
load({
    cwd: __dirname,
    files: ['.menv.dup'],
    attach: false,
    onWarning: (w) => warnings.push(w),
});

for (const w of warnings)
{
    console.log(`  ⚠ ${w.type}: key="${w.key}" at ${w.file.split(/[/\\]/).pop()}:${w.line}`);
}
console.log(`  Total warnings: ${warnings.length}`);

/* ────────────────────────────────────────────────────────────────── *
 *  9. parse() — Inline String Parsing                               *
 * ────────────────────────────────────────────────────────────────── */

header('9. parse() — Inline String Parsing');

const inline = parse([
    '# Server config',
    'PORT=5000',
    'DEBUG=true',
    'HOSTS=["a.com","b.com"]',
    'DEPLOYED=2026-03-01',
].join('\n'), {
    schema: {
        PORT: 'number',
        DEBUG: 'boolean',
        HOSTS: 'json',
        DEPLOYED: 'date',
    },
    filePath: 'virtual.menv',
});

console.log('  Parsed:', inline.parsed);
console.log('  Raw:   ', inline.raw);
console.log('  Files: ', inline.files);
console.log('  Origin:', inline.origins.PORT);

/* ────────────────────────────────────────────────────────────────── *
 *  10. Freeze (Immutability)                                        *
 * ────────────────────────────────────────────────────────────────── */

header('10. Freeze (immutability)');

const frozen = load({ cwd: __dirname, attach: false, freeze: true });

console.log('  Object.isFrozen(parsed):', Object.isFrozen(frozen.parsed));

try
{
    frozen.parsed.PORT = 9999;
    console.log('  ✗ Mutation allowed — unexpected');
}
catch (err)
{
    console.log('  ✓ Mutation blocked:', err.message.slice(0, 60) + '...');
}

const mutable = load({ cwd: __dirname, attach: false, freeze: false });
mutable.parsed.PORT = 9999;
console.log('  freeze: false → PORT mutated to:', mutable.parsed.PORT);

/* ────────────────────────────────────────────────────────────────── *
 *  11. exportEnv & override                                         *
 * ────────────────────────────────────────────────────────────────── */

header('11. exportEnv & override');

// Set a pre-existing env var
process.env.MENV_DEMO_PORT = '1111';

load({ cwd: __dirname, exportEnv: true, override: false, attach: false });
console.log('  override: false → MENV_DEMO_PORT:', process.env.PORT, '(unchanged, was already set)');

load({ cwd: __dirname, exportEnv: true, override: true, attach: false });
console.log('  override: true  → PORT in env:   ', process.env.PORT, '(overwritten)');

// Cleanup
delete process.env.MENV_DEMO_PORT;
delete process.env.PORT;
delete process.env.HOST;
delete process.env.DEBUG;
delete process.env.SERVICE_URL;
delete process.env.DATABASE_URL;
delete process.env.TIMEOUT;
delete process.env.ENABLE_CACHE;
delete process.env.ALLOWED_IPS;
delete process.env.META;
delete process.env.LAUNCH_DATE;
delete process.env.SECRET_KEY;

/* ────────────────────────────────────────────────────────────────── *
 *  12. attach / process.menv                                        *
 * ────────────────────────────────────────────────────────────────── */

header('12. attach / process.menv');

const orig = process.menv;

load({ cwd: __dirname, attach: true });
console.log('  attach: true  → process.menv.PORT:', process.menv.PORT);
console.log('  attach: true  → typeof process.menv:', typeof process.menv);

load({ cwd: __dirname, attach: false });
console.log('  attach: false → process.menv unchanged:', process.menv.PORT);

// Cleanup
if (orig === undefined) delete process.menv;
else process.menv = orig;

/* ────────────────────────────────────────────────────────────────── *
 *  13. Debug Mode (File Precedence Logging)                         *
 * ────────────────────────────────────────────────────────────────── */

header('13. Debug Mode (file precedence logging)');

load({ cwd: __dirname, profile: 'dev', debug: true, attach: false });

/* ────────────────────────────────────────────────────────────────── *
 *  14. Custom Files Option                                          *
 * ────────────────────────────────────────────────────────────────── */

header('14. Custom Files Option');

const custom = load({
    cwd: __dirname,
    files: ['.menv.prod'],
    attach: false,
});

console.log('  Only .menv.prod loaded');
console.log('  Files:', custom.files.map((f) => f.split(/[/\\]/).pop()));
console.log('  PORT:', custom.parsed.PORT, '(from prod, not base)');

/* ────────────────────────────────────────────────────────────────── *
 *  15. Watch Mode                                                   *
 * ────────────────────────────────────────────────────────────────── */

header('15. Watch Mode');

if (process.argv.includes('--watch'))
{
    const handle = watch({
        cwd: __dirname,
        profile: 'dev',
        debug: true,
        attach: false,
        schema: {
            PORT: 'number',
            DEBUG: 'boolean',
            SERVICE_URL: 'string',
        },
    }, (err, result) =>
    {
        if (err)
        {
            console.error('  Config reload error:', err.message);
            return;
        }
        console.log('  ✓ Config reloaded:', result.parsed);
    });

    console.log('  Watching for .menv file changes... (Ctrl+C to exit)');
    console.log('  Try editing .menv or .menv.dev');

    // Keep the process alive — Ctrl+C will exit
    process.on('SIGINT', () =>
    {
        handle.close();
        console.log('\n  Watch stopped.');
        process.exit(0);
    });
}
else
{
    console.log('  (Skipped — run with --watch flag to enable)');
    console.log('  Usage: node index.js --watch');
}

/* ────────────────────────────────────────────────────────────────── *
 *  Done                                                             *
 * ────────────────────────────────────────────────────────────────── */

if (!process.argv.includes('--watch'))
{
    console.log(`\n${SEP}`);
    console.log('  All 15 examples completed successfully!');
    console.log(SEP);
}
