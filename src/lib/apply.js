'use strict';

const { unknownKeyError, duplicateKeyError } = require('./errors');
const { coerceType, autoCast } = require('./cast');

/**
 * Apply a parsed entry to the state with schema/type checks.
 * @param {{values: object, raw: object, origins: object, seenPerFile: Map<string, Set<string>>}} state
 * @param {{key: string, raw: string, line: number}} entry
 * @param {{schema: object|null, strict: boolean, cast: object, onWarning?: Function, debug?: boolean}} options
 * @param {string} filePath
 */
function applyEntry(state, entry, options, filePath)
{
    const { schema, strict, cast, onWarning, debug } = options;
    const { key, raw, line } = entry;

    // Reject keys not defined in schema when strict
    if (schema && strict && !schema[key])
    {
        throw unknownKeyError(key, filePath, line);
    }

    // Per-file duplicate tracking
    if (!state.seenPerFile.has(filePath))
    {
        state.seenPerFile.set(filePath, new Set());
    }
    const fileKeys = state.seenPerFile.get(filePath);

    if (fileKeys.has(key))
    {
        if (strict) throw duplicateKeyError(key, filePath, line);
        if (typeof onWarning === 'function')
        {
            onWarning({ type: 'duplicate', key, file: filePath, line });
        }
    }

    // Debug logging for cross-file overrides
    if (debug && state.values[key] !== undefined)
    {
        const prev = state.origins[key];
        console.log(`[molex-env] Override: ${key}`);
        console.log(`  Previous: ${prev.file}:${prev.line} = ${prev.raw}`);
        console.log(`  New:      ${filePath}:${line} = ${raw}`);
    }

    // Type coercion: schema type takes precedence, otherwise auto-cast
    const def = schema ? schema[key] : null;
    const value = (def && def.type)
        ? coerceType(raw, def.type, filePath, line)
        : autoCast(raw, cast);

    state.values[key] = value;
    state.raw[key] = raw;
    state.origins[key] = { file: filePath, line, raw };
    fileKeys.add(key);
}

module.exports = { applyEntry };
