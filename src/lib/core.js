'use strict';

const fs = require('fs');

const { normalizeCast } = require('./cast');
const { normalizeSchema, applySchemaDefaults } = require('./schema');
const { parseEntries } = require('./parser');
const { applyEntry } = require('./apply');
const { resolveFiles } = require('./files');
const { deepFreeze } = require('./utils');

/**
 * Build a new parsing state container.
 * @returns {{values: object, origins: object, seen: Set<string>}}
 */
function buildState()
{
    return {
        values: {},
        origins: {},
        seen: new Set()
    };
}

/**
 * Export parsed values to process.env if enabled.
 * @param {object} values
 * @param {object} options
 * @returns {void}
 */
function exportToEnv(values, options)
{
    if (!options.exportEnv) return;
    for (const [key, value] of Object.entries(values))
    {
        if (!options.override && Object.prototype.hasOwnProperty.call(process.env, key))
        {
            continue;
        }
        process.env[key] = value === undefined ? '' : String(value);
    }
}

/**
 * Attach parsed values to process.menv unless disabled.
 * @param {object} values
 * @param {object} options
 * @returns {void}
 */
function attachToProcess(values, options)
{
    if (options.attach === false) return;
    process.menv = values;
}

/**
 * Load .menv files and return parsed values with origins.
 * @param {object} options
 * @returns {{parsed: object, origins: object, files: string[]}}
 */
function load(options = {})
{
    const normalizedSchema = normalizeSchema(options.schema);
    const cast = normalizeCast(options.cast);
    const strict = Boolean(options.strict);

    const state = buildState();
    const files = resolveFiles(options);
    const readFiles = [];

    for (const filePath of files)
    {
        if (!fs.existsSync(filePath)) continue;
        const text = fs.readFileSync(filePath, 'utf8');
        const entries = parseEntries(text, { strict, filePath });
        for (const entry of entries)
        {
            applyEntry(state, entry, {
                schema: normalizedSchema,
                strict,
                cast,
                onWarning: options.onWarning
            }, filePath);
        }
        readFiles.push(filePath);
    }

    applySchemaDefaults(state.values, state.origins, normalizedSchema, strict);
    exportToEnv(state.values, options);

    if (options.freeze !== false)
    {
        deepFreeze(state.values);
    }

    attachToProcess(state.values, options);

    return {
        parsed: state.values,
        origins: state.origins,
        files: readFiles
    };
}

/**
 * Parse a string containing .menv content.
 * @param {string} text
 * @param {object} options
 * @returns {{parsed: object, origins: object, files: string[]}}
 */
function parse(text, options = {})
{
    const normalizedSchema = normalizeSchema(options.schema);
    const cast = normalizeCast(options.cast);
    const strict = Boolean(options.strict);
    const state = buildState();
    const filePath = options.filePath || '<inline>';

    const entries = parseEntries(text, { strict, filePath });
    for (const entry of entries)
    {
        applyEntry(state, entry, {
            schema: normalizedSchema,
            strict,
            cast,
            onWarning: options.onWarning
        }, filePath);
    }

    applySchemaDefaults(state.values, state.origins, normalizedSchema, strict);

    if (options.freeze !== false)
    {
        deepFreeze(state.values);
    }

    return {
        parsed: state.values,
        origins: state.origins,
        files: options.filePath ? [options.filePath] : []
    };
}

module.exports = {
    load,
    parse
};
