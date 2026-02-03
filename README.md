# molex-env

[![npm](https://img.shields.io/npm/v/molex-env)](https://www.npmjs.com/package/molex-env)
[![downloads](https://img.shields.io/npm/dm/molex-env)](https://www.npmjs.com/package/molex-env)
[![license](https://img.shields.io/npm/l/molex-env)](LICENSE)
[![deps](https://img.shields.io/badge/deps-0-brightgreen)](package.json)

> Native .menv loader with profiles, typing, origin tracking, and optional reload.

Highlights
- Deterministic profile merging
- Typed parsing (boolean, number, json, date)
- Strict mode for unknown or duplicate keys
- Origin tracking (file + line)
- Immutable config objects (optional)
- Optional file watching for reload

Install
```bash
npm install molex-env
```

Quick start
```js
const { load } = require('molex-env');

const result = load({
  profile: 'prod',
  export: true,
  strict: true,
  schema: {
    PORT: 'number',
    DEBUG: 'boolean',
    SERVICE_URL: { type: 'string', required: true }
  }
});

console.log(result.parsed.PORT);
console.log(result.origins.SERVICE_URL);
```

Setup
1) Add one or more .menv files in your project root.
2) Call `load()` during startup.
3) Optionally enable profile-specific files (e.g. `prod`).

File format
```env
# Comments start with #
PORT=3000
DEBUG=true
SERVICE_URL="https://api.example.com"
METADATA={"region":"us-east-1"}
START_DATE=2026-02-02
```

File precedence
1) .menv
2) .menv.local
3) .menv.{profile}
4) .menv.{profile}.local

API

load(options)
Load, merge, parse, and validate .menv files.

Options
- cwd: base directory (default: process.cwd())
- profile: profile name for .menv.{profile}
- files: custom file list (absolute or relative to cwd)
- schema: allowed keys, types, defaults, required
- strict: reject unknown keys, duplicates, and invalid lines
- cast: true | false | { boolean, number, json, date }
- export: write values to process.env
- override: override existing process.env values
- freeze: deep-freeze parsed config (default true)
- onWarning: function(info) for non-strict duplicates

Returns
```js
{
  parsed,   // typed values
  raw,      // raw strings
  origins,  // { KEY: { file, line } }
  files     // list of resolved files
}
```

parse(text, options)
Parse a string of .menv content using the same typing rules as `load()`.

Options
- schema
- strict
- cast
- freeze

watch(options, onChange)
Watch resolved files and reload on change.

Arguments
- options: same as `load()`
- onChange: function(err, result)

Schema
You can define simple types or richer objects per key.

```js
const schema = {
  PORT: { type: 'number', default: 3000 },
  DEBUG: { type: 'boolean', default: false },
  METADATA: { type: 'json' },
  START_DATE: { type: 'date' },
  SERVICE_URL: { type: 'string', required: true }
};
```

Schema options per key
- type: string | boolean | number | json | date
- default: value used when key is missing
- required: true | false

Typing rules
- boolean: true/false (case-insensitive)
- number: integer or float
- json: JSON.parse on the value
- date: Date.parse on the value

Strict mode
When `strict` is true, the loader rejects:
- unknown keys not in `schema`
- duplicate keys across files
- invalid lines or parse errors

Non-strict mode
Duplicates are allowed and `onWarning(info)` is called with:
```js
{
  key,
  previous: { file, line },
  next: { file, line }
}
```

Examples

Custom files
```js
load({
  files: ['config/.menv', 'config/.menv.local'],
  schema: { PORT: 'number' }
});
```

Disable casting
```js
load({ cast: false });
```

Freeze control
```js
load({ freeze: false });
```

Notes
- Use .menv.local for machine-specific values
- Use strict mode to detect surprises early

Example project
An example app is included in examples/basic.
Run it with:
```bash
cd examples/basic
npm install
npm start
```
