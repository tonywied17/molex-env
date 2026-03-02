'use strict';

const { invalidLineError } = require('./errors');

const KEY_VALUE_RE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/;

/**
 * Strip inline comments while preserving quoted values.
 * @param {string} line
 * @returns {string}
 */
function stripInlineComment(line)
{
    let inSingle = false;
    let inDouble = false;
    let escaped = false;

    for (let i = 0; i < line.length; i += 1)
    {
        const ch = line[i];
        if (escaped) { escaped = false; continue; }
        if (ch === '\\') { escaped = true; continue; }
        if (ch === '"' && !inSingle) { inDouble = !inDouble; continue; }
        if (ch === "'" && !inDouble) { inSingle = !inSingle; continue; }
        if (ch === '#' && !inSingle && !inDouble) return line.slice(0, i);
    }

    return line;
}

/**
 * Remove wrapping quotes and unescape common sequences.
 * @param {string} value
 * @returns {string}
 */
function stripQuotes(value)
{
    const trimmed = value.trim();
    if (trimmed.length < 2) return trimmed;

    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'"))
    {
        return trimmed.slice(1, -1).replace(/\\(.)/g, (_, ch) =>
        {
            switch (ch)
            {
                case 'n': return '\n';
                case 'r': return '\r';
                case 't': return '\t';
                case '\\': return '\\';
                default: return ch;
            }
        });
    }

    return trimmed;
}

/**
 * Parse raw text into key/value entries.
 * @param {string} text
 * @param {{strict?: boolean, filePath?: string}} options
 * @returns {{key: string, raw: string, line: number}[]}
 */
function parseEntries(text, options = {})
{
    const { strict, filePath } = options;
    const lines = text.split(/\r?\n/);
    const entries = [];

    for (let i = 0; i < lines.length; i += 1)
    {
        const rawLine = lines[i];
        const cleaned = stripInlineComment(rawLine).trim();
        if (!cleaned) continue;

        const match = cleaned.match(KEY_VALUE_RE);
        if (!match)
        {
            if (strict) throw invalidLineError(i + 1, rawLine, filePath);
            continue;
        }

        entries.push({
            key: match[1],
            raw: stripQuotes(match[2] || ''),
            line: i + 1,
        });
    }

    return entries;
}

module.exports = { parseEntries };
