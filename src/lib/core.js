'use strict';

const fs = require('fs');

const { normalizeCast } = require('./cast');
const { normalizeSchema, applySchemaDefaults } = require('./schema');
const { parseEntries } = require('./parser');
const { applyEntry } = require('./apply');
const { resolveFiles } = require('./files');
const { deepFreeze } = require('./utils');

/* ------------------------------------------------------------------ */
/*  Internal helpers (shared pipeline)                                 */
/* ------------------------------------------------------------------ */

/**
 * Create a fresh processing state container.
 * @returns {{values: object, raw: object, origins: object, seenPerFile: Map}}
 */
function createState()
{
    return {
        values: {},
        raw: {},
        origins: {},
        seenPerFile: new Map(),
    };
}

/**
 * Normalize user options into a consistent internal format.
 * @param {object} options - Raw user options.
 * @returns {object} Normalized processing options.
 */
function normalizeOptions(options)
{
    return {
        schema: normalizeSchema(options.schema),
        cast: normalizeCast(options.cast),
        strict: Boolean(options.strict),
        freeze: options.freeze !== false,
        onWarning: options.onWarning,
        debug: options.debug,
    };
}

/**
 * Process a block of .menv text into the state.
 * @param {object} state
 * @param {string} text
 * @param {string} filePath
 * @param {object} opts - Normalized options.
 */
function processText(state, text, filePath, opts)
{
    const entries = parseEntries(text, { strict: opts.strict, filePath });
    for (const entry of entries)
    {
        applyEntry(state, entry, opts, filePath);
    }
}

/**
 * Apply schema defaults and optionally deep-freeze the result.
 * @param {object} state
 * @param {object} opts - Normalized options.
 */
function finalizeState(state, opts)
{
    applySchemaDefaults(state.values, state.origins, opts.schema, opts.strict);
    if (opts.freeze) deepFreeze(state.values);
}

/* ------------------------------------------------------------------ */
/*  Side-effect helpers                                                */
/* ------------------------------------------------------------------ */

/**
 * Write parsed values to process.env when enabled.
 * @param {object} values
 * @param {object} options - Raw user options.
 */
function exportToEnv(values, options)
{
    if (!options.exportEnv) return;
    for (const [key, value] of Object.entries(values))
    {
        if (!options.override && Object.prototype.hasOwnProperty.call(process.env, key)) continue;
        process.env[key] = value === undefined ? '' : String(value);
    }
}

/**
 * Attach parsed values to process.menv unless disabled.
 * @param {object} values
 * @param {object} options - Raw user options.
 */
function attachToProcess(values, options)
{
    if (options.attach !== false) process.menv = values;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Load .menv files, merge, parse, and validate.
 * @param {object} [options]
 * @returns {{parsed: object, raw: object, origins: object, files: string[]}}
 */
function load(options = {})
{
    const opts = normalizeOptions(options);
    const state = createState();
    const filePaths = resolveFiles(options);
    const readFiles = [];

    for (const filePath of filePaths)
    {
        if (!fs.existsSync(filePath)) continue;
        processText(state, fs.readFileSync(filePath, 'utf8'), filePath, opts);
        readFiles.push(filePath);
    }

    finalizeState(state, opts);
    exportToEnv(state.values, options);
    attachToProcess(state.values, options);

    return {
        parsed: state.values,
        raw: state.raw,
        origins: state.origins,
        files: readFiles,
    };
}

/**
 * Parse a string of .menv content without loading files.
 * @param {string} text
 * @param {object} [options]
 * @returns {{parsed: object, raw: object, origins: object, files: string[]}}
 */
function parse(text, options = {})
{
    const opts = normalizeOptions(options);
    const state = createState();
    const filePath = options.filePath || '<inline>';

    processText(state, text, filePath, opts);
    finalizeState(state, opts);

    return {
        parsed: state.values,
        raw: state.raw,
        origins: state.origins,
        files: options.filePath ? [options.filePath] : [],
    };
}

module.exports = { load, parse };
