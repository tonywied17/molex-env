'use strict';

const path = require('path');
const { load, watch } = require('molex-env');

console.log('=== Example 1: Basic Load with Profile ===');
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
console.log('Type of PORT:', typeof result.parsed.PORT, '(should be number)');
console.log('Type of DEBUG:', typeof result.parsed.DEBUG, '(should be boolean)');
console.log('Type of META:', typeof result.parsed.META, '(should be object)');
console.log('META.region:', result.parsed.META.region);

console.log('\n=== Example 2: Origin Tracking ===');
console.log('Origin for SERVICE_URL:', result.origins.SERVICE_URL);
console.log('Origin for PORT:', result.origins.PORT);

console.log('\n=== Example 3: Debug Mode (File Precedence) ===');
load({
  cwd: __dirname,
  profile: 'dev',
  debug: true,
  schema: {
    PORT: 'number',
    DEBUG: 'boolean',
    SERVICE_URL: 'string',
    START_DATE: 'date',
    META: 'json'
  }
});

console.log('\n=== Example 4: Duplicate Key Detection (Within File) ===');
try {
  load({
    cwd: __dirname,
    files: ['.menv.dup'],
    strict: true
  });
  console.log('❌ Unexpected success');
} catch (err) {
  console.log('✅ Caught expected error:', err.message);
}

console.log('\n=== Example 5: Watch Mode (Commented Out) ===');

watch({
  cwd: __dirname,
  profile: 'dev',
  debug: true,  // Automatically logs changes
  schema: {
    PORT: 'number',
    DEBUG: 'boolean',
    SERVICE_URL: 'string',
    START_DATE: 'date',
    META: 'json'
  }
}, (err, result) => {
  if (err) {
    console.error('Config reload error:', err.message);
  } else {
    console.log('✅ Config successfully reloaded');
  }
});

console.log('\n👀 Watching for changes... (Press Ctrl+C to exit)');
console.log('Try editing .menv or .menv.dev files');


console.log('\n✅ All examples completed successfully!');
