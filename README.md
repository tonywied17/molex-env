# molex-env-npm

[![npm version](https://img.shields.io/npm/v/molex-env)](https://www.npmjs.com/package/molex-env)
[![npm downloads](https://img.shields.io/npm/dm/molex-env.svg)](https://www.npmjs.com/package/molex-env)
[![GitHub](https://img.shields.io/badge/GitHub-molex--env--npm-blue.svg)](https://github.com/tonywied17/molex-env-npm)
[![License: MIT](https://img.shields.io/npm/l/molex-env)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D14-brightgreen.svg)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-success.svg)](package.json)

> **Native .menv environment loader with profile support, typed parsing, origin tracking, and live reload. Zero dependencies.**

## Features

- **Zero dependencies** - Pure Node.js implementation
- **Profile support** - Environment-specific configs (dev, prod, staging)
- **Type-safe parsing** - Automatic conversion of booleans, numbers, JSON, and dates
- **Strict validation** - Schema enforcement with required fields and type checking
- **Origin tracking** - Know exactly which file and line each value came from
- **Debug mode** - See which files override values during cascading
- **Immutable config** - Deep-freeze protection prevents accidental modifications
- **Live reload** - Watch mode automatically reloads on file changes
- **Deterministic merging** - Predictable cascading from base to profile files

## Installation

```bash
npm install molex-env
```

## Quick Start

```javascript
const { load } = require('molex-env');

// Simplest usage - loads .menv files and attaches to process.menv
require('molex-env').load();
console.log(process.menv.PORT);  // Access typed values

// With profile and schema validation
const result = load({
  profile: 'prod',
  strict: true,
  schema: {
    PORT: 'number',
    DEBUG: 'boolean',
    SERVICE_URL: { type: 'string', required: true },
    METADATA: 'json'
  }
});

console.log(result.parsed.PORT);              // 3000 (number)
console.log(result.parsed.DEBUG);             // false (boolean)
console.log(result.origins.SERVICE_URL);      // { file: '.menv', line: 3 }
console.log(process.menv.METADATA.region);    // 'us-east-1' (parsed JSON)
```

## Setup

**1. Create .menv files in your project root:**

```env
# .menv (base configuration)
PORT=3000
DEBUG=false
SERVICE_URL=https://api.example.com
DATABASE_URL=postgres://localhost:5432/myapp
```

**2. Add profile-specific overrides (optional):**

```env
# .menv.prod (production overrides)
DEBUG=false
SERVICE_URL=https://api.production.com
DATABASE_URL=postgres://prod-server:5432/myapp
```

```env
# .menv.local (local machine overrides - add to .gitignore)
DEBUG=true
DATABASE_URL=postgres://localhost:5432/myapp_dev
```

**3. Load during application startup:**

```javascript
// Load with production profile
require('molex-env').load({ profile: 'prod' });

// Now use your typed config
const app = express();
app.listen(process.menv.PORT);
```

## File Format

molex-env supports simple key=value syntax with automatic type detection:

```env
# Comments start with #
# Strings (quotes are optional)
SERVICE_URL=https://api.example.com
API_KEY="secret-key-123"

# Numbers (integers and floats)
PORT=3000
TIMEOUT=30.5

# Booleans (case-insensitive)
DEBUG=true
ENABLE_CACHE=FALSE

# JSON objects and arrays
METADATA={"region":"us-east-1","tier":"premium"}
ALLOWED_IPS=["192.168.1.1","10.0.0.1"]

# Dates (ISO 8601 format)
START_DATE=2026-02-02
EXPIRES_AT=2026-12-31T23:59:59Z

# Empty values
OPTIONAL_KEY=
```

## File Precedence

Files are loaded and merged in this order (later files override earlier ones):

1. `.menv` - Base configuration
2. `.menv.local` - Local overrides
3. `.menv.{profile}` - Profile-specific config (e.g., `.menv.prod`)
4. `.menv.{profile}.local` - Profile + local overrides (e.g., `.menv.prod.local`)

**Example with `profile: 'prod'`:**
```
.menv            →  PORT=3000, DEBUG=true
.menv.local      →  (overrides) DEBUG=false
.menv.prod       →  (overrides) PORT=8080
.menv.prod.local →  (overrides) PORT=9000
Final result: PORT=9000, DEBUG=false
```

**Debug mode** - Use `debug: true` to see which files override values:
```javascript
load({ profile: 'prod', debug: true });
// Console output:
// [molex-env] Override: DEBUG
//   Previous: .menv:2 = true
//   New:      .menv.local:1 = false
// [molex-env] Override: PORT
//   Previous: .menv.local:3 = 3000
//   New:      .menv.prod:1 = 8080
```

## API Reference

### `load(options)` → `Object`

Load, merge, parse, and validate .menv files. This is the primary method you'll use.

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cwd` | `string` | `process.cwd()` | Base directory to resolve files from |
| `profile` | `string` | `undefined` | Profile name for `.menv.{profile}` files |
| `files` | `Array<string>` | Auto-detected | Custom file list (absolute or relative to cwd) |
| `schema` | `Object` | `{}` | Schema definition for validation and typing |
| `strict` | `boolean` | `false` | Reject unknown keys, within-file duplicates, and invalid lines |
| `cast` | `boolean\|Object` | `true` | Enable/disable type casting (see Type Casting) |
| `exportEnv` | `boolean` | `false` | Write parsed values to `process.env` |
| `override` | `boolean` | `false` | Override existing `process.env` values |
| `attach` | `boolean` | `true` | Attach parsed values to `process.menv` |
| `freeze` | `boolean` | `true` | Deep-freeze the parsed config object |
| `debug` | `boolean` | `false` | Log file precedence overrides to console |
| `onWarning` | `Function` | `undefined` | Callback for non-strict warnings |

**Returns:**

```javascript
{
  parsed: Object,   // Typed configuration values
  raw: Object,      // Raw string values before parsing
  origins: Object,  // Source tracking: { KEY: { file, line } }
  files: Array      // List of resolved file paths
}
```

**Examples:**

```javascript
// Basic usage
const result = load();
console.log(result.parsed);

// With profile
const result = load({ profile: 'production' });

// Custom directory
const result = load({ cwd: '/app/config' });

// Export to process.env
load({ exportEnv: true });
console.log(process.env.PORT);  // Now available in process.env

// Custom files
load({
  files: ['config/.menv', 'config/.menv.custom'],
  schema: { PORT: 'number', HOST: 'string' }
});

// Override existing environment variables
load({ 
  exportEnv: true, 
  override: true  // Will replace existing process.env values
});
```

---

### `parse(text, options)` → `Object`

Parse a string of .menv content without loading files. Useful for testing or processing environment strings from other sources.

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `schema` | `Object` | `{}` | Schema definition for validation |
| `strict` | `boolean` | `false` | Enable strict validation (rejects unknown keys, within-file duplicates, invalid lines) |
| `cast` | `boolean\|Object` | `true` | Enable/disable type casting |
| `freeze` | `boolean` | `true` | Deep-freeze the result |

> **Note:** The `parse()` function processes a single string, so the `debug` option for file precedence and cross-file features don't apply here.

**Returns:**

```javascript
{
  parsed: Object,   // Typed values
  raw: Object,      // Raw string values
  origins: Object   // Line numbers: { KEY: { line } }
}
```

**Example:**

```javascript
const { parse } = require('molex-env');

const envContent = `
PORT=3000
DEBUG=true
METADATA={"env":"production"}
`;

const result = parse(envContent, {
  schema: {
    PORT: 'number',
    DEBUG: 'boolean',
    METADATA: 'json'
  },
  strict: true
});

console.log(result.parsed.PORT);       // 3000 (number)
console.log(result.parsed.DEBUG);      // true (boolean)
console.log(result.parsed.METADATA);   // { env: 'production' } (object)
console.log(result.origins.PORT);      // { line: 2 }
```

---

### `watch(options, onChange)`

Watch .menv files and reload automatically when they change. Perfect for development environments.

**Arguments:**

- `options` - Same options as `load()`
- `onChange(error, result)` - Callback fired on file changes

**Example:**

```javascript
const { watch } = require('molex-env');

// Watch with callback
watch({ profile: 'dev', strict: true }, (err, result) => {
  if (err) {
    console.error('Config reload failed:', err.message);
    return;
  }
  
  console.log('Config reloaded!');
  console.log('New PORT:', result.parsed.PORT);
  
  // Restart your server or update app state here
  if (global.server) {
    global.server.close();
    global.server = startServer(result.parsed);
  }
});

console.log('Watching for .menv file changes...');
```

**Example with Express hot reload:**

```javascript
const express = require('express');
const { watch } = require('molex-env');

let server;

function startServer(config) {
  const app = express();
  app.get('/', (req, res) => res.json({ port: config.PORT }));
  return app.listen(config.PORT, () => {
    console.log(`Server running on port ${config.PORT}`);
  });
}

// Start with initial config
const initial = require('molex-env').load({ profile: 'dev' });
server = startServer(initial.parsed);

// Watch for changes
watch({ profile: 'dev' }, (err, result) => {
  if (!err && result.parsed.PORT !== initial.parsed.PORT) {
    console.log('Port changed, restarting...');
    server.close(() => {
      server = startServer(result.parsed);
    });
  }
});
```

---

## Schema Definition

Schemas provide type validation, required field enforcement, and default values.

### Schema Formats

**Simple string format:**
```javascript
const schema = {
  PORT: 'number',
  DEBUG: 'boolean',
  SERVICE_URL: 'string',
  METADATA: 'json',
  START_DATE: 'date'
};
```

**Object format with options:**
```javascript
const schema = {
  PORT: { 
    type: 'number', 
    default: 3000 
  },
  DEBUG: { 
    type: 'boolean', 
    default: false 
  },
  SERVICE_URL: { 
    type: 'string', 
    required: true  // Will throw error if missing
  },
  METADATA: { 
    type: 'json',
    default: { region: 'us-east-1' }
  },
  START_DATE: { 
    type: 'date' 
  }
};
```

### Schema Options

| Option | Type | Description |
|--------|------|-------------|
| `type` | `string` | Value type: `'string'`, `'boolean'`, `'number'`, `'json'`, or `'date'` |
| `default` | `any` | Default value if key is missing (must match type) |
| `required` | `boolean` | If `true`, throws error when key is missing |

### Type Parsing Rules

| Type | Description | Examples |
|------|-------------|----------|
| `string` | Plain text (default) | `"hello"`, `hello`, `"123"` |
| `boolean` | Case-insensitive true/false | `true`, `TRUE`, `false`, `False` |
| `number` | Integer or float | `3000`, `3.14`, `-42`, `1e6` |
| `json` | Valid JSON string | `{"key":"value"}`, `[1,2,3]`, `null` |
| `date` | ISO 8601 date string | `2026-02-02`, `2026-02-02T10:30:00Z` |

**Example with all types:**

```javascript
load({
  schema: {
    // String (explicit)
    API_KEY: { type: 'string', required: true },
    
    // Boolean
    DEBUG: { type: 'boolean', default: false },
    ENABLE_LOGGING: 'boolean',
    
    // Number
    PORT: { type: 'number', default: 3000 },
    TIMEOUT: 'number',
    RETRY_COUNT: { type: 'number', default: 3 },
    
    // JSON (objects and arrays)
    METADATA: { type: 'json', default: {} },
    ALLOWED_HOSTS: 'json',  // Can be array or object
    
    // Date
    START_DATE: 'date',
    EXPIRES_AT: { type: 'date', required: true }
  },
  strict: true
});
```

---

## Type Casting

Control how values are automatically converted from strings.

### Enable/Disable All Casting

```javascript
// Default: all types are cast
load({ cast: true });

// Disable all casting (everything stays as strings)
load({ cast: false });
console.log(typeof process.menv.PORT);  // 'string' (was '3000')
```

### Selective Casting

```javascript
// Only cast specific types
load({
  cast: {
    boolean: true,   // Cast booleans
    number: true,    // Cast numbers
    json: false,     // Keep JSON as strings
    date: false      // Keep dates as strings
  }
});
```

---

## Strict Mode

Strict mode provides rigorous validation to catch configuration errors early.

### What Strict Mode Enforces

When `strict: true`:
- ❌ **Unknown keys** - Keys not in schema are rejected
- ❌ **Duplicate keys** - Same key appearing twice **in the same file** throws error
  - **Note:** File precedence still works - different files can define the same key
- ❌ **Invalid lines** - Malformed lines throw errors
- ✅ **Type validation** - When schema is present, type mismatches throw errors (enabled by default with schema)

**Example:**

```javascript
// .menv file
PORT=3000
DEBUG=true
UNKNOWN_KEY=value  // ← Not in schema

load({
  schema: {
    PORT: 'number',
    DEBUG: 'boolean'
  },
  strict: true  // Will throw error about UNKNOWN_KEY
});
```

**Valid with strict mode (different files):**
```javascript
// .menv
PORT=3000

// .menv.prod
PORT=8080  // ✅ OK - overrides from different file

load({ profile: 'prod', strict: true });
// Result: PORT=8080
```

**Invalid with strict mode (same file):**
```javascript
// .menv
PORT=3000
PORT=8080  // ❌ ERROR - duplicate in same file

load({ strict: true });  // Throws error
```

### Non-Strict Mode (Default)

Without strict mode, the file precedence feature works as intended:
- ✅ Unknown keys are allowed and parsed
- ✅ **Duplicate keys override** - Later files can override keys from earlier files
- ✅ Invalid lines are skipped
- ⚠️  Warnings can be logged via `onWarning` callback for within-file duplicates

**Example with warning handler:**

```javascript
// .menv file with duplicate keys
// PORT=3000
// PORT=8080

load({
  strict: false,
  onWarning: (info) => {
    if (info.type === 'duplicate') {
      console.warn(`Warning: Duplicate key '${info.key}' in ${info.file}:${info.line}`);
    }
  }
});
// Output: Warning: Duplicate key 'PORT' in .menv:2
// Result: PORT=8080 (last value wins)
```

**Tip:** Use `debug: true` to see cross-file overrides (file precedence), or `onWarning` to catch within-file duplicates.

---

## Origin Tracking

Every configuration value includes its source file and line number, making debugging easy.

**Example:**

```javascript
const result = load({ profile: 'prod' });

console.log(result.origins);
// {
//   PORT: { file: '.menv', line: 1 },
//   DEBUG: { file: '.menv.local', line: 2 },
//   SERVICE_URL: { file: '.menv.prod', line: 3 }
// }

// Debug where a value came from
const portOrigin = result.origins.PORT;
console.log(`PORT is defined in ${portOrigin.file} at line ${portOrigin.line}`);
```

**Practical debugging use case:**

```javascript
const { load } = require('molex-env');

const result = load({ profile: 'prod', strict: true });

// Verify configuration sources before deployment
Object.keys(result.parsed).forEach(key => {
  const origin = result.origins[key];
  console.log(`${key}=${result.parsed[key]} (from ${origin.file}:${origin.line})`);
});

// Example output:
// PORT=8080 (from .menv.prod:1)
// DEBUG=false (from .menv.prod:2)
// DATABASE_URL=postgres://prod:5432/db (from .menv.prod.local:3)
```

---

## Advanced Examples

### Complete Production Setup

```javascript
const { load } = require('molex-env');

const config = load({
  profile: process.env.NODE_ENV || 'development',
  strict: true,
  exportEnv: true,
  schema: {
    // Server config
    NODE_ENV: { type: 'string', required: true },
    PORT: { type: 'number', default: 3000 },
    HOST: { type: 'string', default: '0.0.0.0' },
    
    // Database
    DATABASE_URL: { type: 'string', required: true },
    DB_POOL_SIZE: { type: 'number', default: 10 },
    
    // Redis
    REDIS_URL: { type: 'string', required: true },
    REDIS_TTL: { type: 'number', default: 3600 },
    
    // Feature flags
    ENABLE_CACHE: { type: 'boolean', default: true },
    ENABLE_METRICS: { type: 'boolean', default: false },
    
    // API config
    API_KEYS: { type: 'json', required: true },
    RATE_LIMITS: { type: 'json', default: { default: 100 } },
    
    // Dates
    MAINTENANCE_START: 'date',
    MAINTENANCE_END: 'date'
  }
});

console.log('Configuration loaded successfully');
console.log(`Running in ${config.parsed.NODE_ENV} mode on port ${config.parsed.PORT}`);

module.exports = config.parsed;
```

### Dynamic Profile from Command Line

```javascript
// Load profile from CLI argument
// Usage: node app.js --env=staging

const args = process.argv.slice(2);
const envArg = args.find(arg => arg.startsWith('--env='));
const profile = envArg ? envArg.split('=')[1] : 'development';

require('molex-env').load({
  profile,
  strict: true,
  schema: {
    PORT: 'number',
    DATABASE_URL: { type: 'string', required: true }
  }
});

console.log(`Started with profile: ${profile}`);
console.log(`PORT: ${process.menv.PORT}`);
```

### Development with Hot Reload

```javascript
const { watch } = require('molex-env');

let currentConfig;

watch({
  profile: 'dev',
  schema: {
    PORT: 'number',
    DEBUG: 'boolean',
    API_URL: 'string'
  }
}, (err, result) => {
  if (err) {
    console.error('Config error:', err.message);
    return;
  }
  
  const changed = [];
  if (!currentConfig) {
    console.log('Initial config loaded');
  } else {
    // Detect what changed
    Object.keys(result.parsed).forEach(key => {
      if (currentConfig[key] !== result.parsed[key]) {
        changed.push(`${key}: ${currentConfig[key]} → ${result.parsed[key]}`);
      }
    });
    
    if (changed.length > 0) {
      console.log('Config updated:', changed.join(', '));
    }
  }
  
  currentConfig = result.parsed;
});
```

### Validation and Error Handling

```javascript
const { load } = require('molex-env');

try {
  const config = load({
    profile: 'prod',
    strict: true,
    schema: {
      PORT: { type: 'number', required: true },
      DATABASE_URL: { type: 'string', required: true },
      REDIS_URL: { type: 'string', required: true }
    }
  });
  
  // Validate ranges
  if (config.parsed.PORT < 1024 || config.parsed.PORT > 65535) {
    throw new Error(`Invalid PORT: ${config.parsed.PORT} (must be 1024-65535)`);
  }
  
  // Validate URLs
  if (!config.parsed.DATABASE_URL.startsWith('postgres://')) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection string');
  }
  
  console.log('Configuration validated successfully');
  
} catch (err) {
  console.error('Configuration error:', err.message);
  process.exit(1);
}
```

---

## Best Practices

### Environment Strategy

```
Development:   .menv + .menv.local
Staging:       .menv + .menv.staging
Production:    .menv + .menv.prod + .menv.prod.local
```

### Security Tips

- ✅ **DO** use `strict: true` in production to catch unknown keys and configuration errors
- ✅ **DO** use `debug: true` during development to understand file precedence
- ✅ **DO** validate sensitive values (URLs, ports, etc.) after loading
- ❌ **DON'T** use `exportEnv: true` if you need immutable config

### Performance

- Config loading is synchronous and fast (~1-2ms for typical files)
- Frozen configs (default) prevent accidental mutations
- Use `watch()` only in development (slight memory overhead)

---

## Example Project

A complete example application is included in `examples/basic`.

```bash
cd examples/basic
npm install
npm start
```

The example demonstrates:
- Profile switching (dev/prod)
- Schema validation
- Type casting
- Origin tracking
- Live reload with watch mode

---

## Troubleshooting

### "Unknown key" error in strict mode

**Problem:** Getting errors about unknown keys when loading config.

**Solution:** Add all keys to your schema or disable strict mode:
```javascript
load({ strict: false });  // Allow unknown keys
```

### Values are strings instead of typed

**Problem:** `PORT` is `"3000"` (string) instead of `3000` (number).

**Solution:** Enable casting or add schema:
```javascript
load({ 
  cast: true,  // Ensure casting is enabled
  schema: { PORT: 'number' }
});
```

### Changes to .menv not reflected

**Problem:** Modified .menv file but app still uses old values.

**Solution:** 
- If using `attach: true` (default), restart the app
- Or use `watch()` for automatic reloading in development

### Type casting fails

**Problem:** Getting parse errors for JSON or dates.

**Solution:** Verify the format in your .menv file:
```env
# Valid JSON (use double quotes)
METADATA={"key":"value"}

# Valid date (ISO 8601)
START_DATE=2026-02-02
```

### Understanding which file sets a value

**Problem:** Not sure which file is providing a specific config value.

**Solution:** Use `debug: true` to see file precedence in action:
```javascript
load({ profile: 'prod', debug: true });
// Shows console output for each override
```

Or check the `origins` object:
```javascript
const result = load({ profile: 'prod' });
console.log(result.origins.PORT);  // { file: '.menv.prod', line: 1, raw: '8080' }
```

---

## License

ISC License
