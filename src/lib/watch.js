'use strict';

const fs = require('fs');
const path = require('path');
const { resolveFiles } = require('./files');

const DEBOUNCE_MS = 50;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Serialize a value for comparison (handles Date and objects).
 * @param {any} val
 * @returns {string}
 */
function serialize(val)
{
    if (val instanceof Date) return val.toISOString();
    return JSON.stringify(val);
}

/**
 * Detect which keys changed between two config snapshots.
 * @param {object} previous
 * @param {object} current
 * @returns {{key: string, old: any, new: any}[]}
 */
function detectChanges(previous, current)
{
    const changes = [];
    for (const key of Object.keys(current))
    {
        if (serialize(previous[key]) !== serialize(current[key]))
        {
            changes.push({ key, old: previous[key], new: current[key] });
        }
    }
    return changes;
}

/**
 * Log detected changes to console.
 * @param {{key: string, old: any, new: any}[]} changes
 */
function logChanges(changes)
{
    if (!changes.length) return;
    console.log('[molex-env] Config reloaded - changes detected:');
    for (const { key, old, new: val } of changes)
    {
        console.log(`  ${key}: ${old} → ${val}`);
    }
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Watch resolved .menv files and reload on changes.
 * @param {object} options
 * @param {(err: Error|null, result?: object) => void} onChange
 * @param {(options: object) => object} load
 * @returns {{close: () => void}}
 */
function watch(options, onChange, load)
{
    if (typeof onChange !== 'function') throw new Error('onChange callback is required');
    if (typeof load !== 'function') throw new Error('load function is required');

    const files = resolveFiles(options);
    const cwd = options.cwd || process.cwd();
    const basenames = new Set(files.map((f) => path.basename(f)));
    const watchers = [];
    let timer = null;
    let previousConfig = null;

    const reload = () =>
    {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() =>
        {
            try
            {
                const result = load({ ...options, debug: false });

                if (options.debug && previousConfig)
                {
                    logChanges(detectChanges(previousConfig, result.parsed));
                }

                previousConfig = { ...result.parsed };
                onChange(null, result);
            } catch (err)
            {
                onChange(err);
            }
        }, DEBOUNCE_MS);
    };

    // Watch existing files
    for (const filePath of files)
    {
        if (!fs.existsSync(filePath)) continue;
        watchers.push(fs.watch(filePath, reload));
    }

    // Watch directory for new files matching expected names
    if (options.watchMissing !== false)
    {
        watchers.push(fs.watch(cwd, (_event, filename) =>
        {
            if (filename && basenames.has(filename)) reload();
        }));
    }

    return {
        close()
        {
            watchers.forEach((w) => w.close());
            watchers.length = 0;
        },
    };
}

module.exports = { watch };
