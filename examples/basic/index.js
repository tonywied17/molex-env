'use strict';

const path = require('path');
const { load } = require('molex-env');

const result = load({
  cwd: __dirname,
  profile: 'dev',
  strict: true,
  schema: {
    PORT: { type: 'number', default: 3000 },
    DEBUG: { type: 'boolean', default: false },
    SERVICE_URL: { type: 'string', required: true },
    START_DATE: { type: 'date' },
    META: { type: 'json' }
  }
});

console.log('Parsed config:', result.parsed);
console.log('Origin for SERVICE_URL:', result.origins.SERVICE_URL);
console.log('process.menv.PORT:', process.menv.PORT);
console.log('Example path:', path.join(__dirname, '.menv'));

console.log('\n--- Testing debug mode ---');
load({
  cwd: __dirname,
  profile: 'dev',
  debug: true, 
  schema: {
    PORT: 'number',
    DEBUG: 'boolean',
    SERVICE_URL: 'string',
    START_DATE: 'date',
  }
});

// Accessing nested JSON values
console.log(typeof process.menv.META);
console.log(process.menv.META.region);

console.log('\n--- Testing duplicate key detection (within same file) ---');
try
{
  load({
    cwd: __dirname,
    files: ['.menv.dup'],
    strict: true  // Strict mode will catch duplicates in same file
  });
  console.log('Duplicate test: unexpected success');
} catch (err)
{
  console.log('Duplicate test: expected error:', err.message);
}
