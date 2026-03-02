'use strict';

const { invalidTypeError } = require('./errors');

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const CAST_ALL_ON = { boolean: true, number: true, json: true, date: true };
const CAST_ALL_OFF = { boolean: false, number: false, json: false, date: false };
const NUMBER_RE = /^-?\d+(\.\d+)?$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/;

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** @returns {boolean} */
function isNumber(value)
{
    return NUMBER_RE.test(value);
}

/** @returns {boolean} */
function isIsoDate(value)
{
    return ISO_DATE_RE.test(value);
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Normalize cast options into explicit booleans.
 * @param {boolean|{boolean?: boolean, number?: boolean, json?: boolean, date?: boolean}} cast
 * @returns {{boolean: boolean, number: boolean, json: boolean, date: boolean}}
 */
function normalizeCast(cast)
{
    if (cast === true || cast === undefined) return { ...CAST_ALL_ON };
    if (cast === false) return { ...CAST_ALL_OFF };
    return {
        boolean: cast.boolean !== false,
        number: cast.number !== false,
        json: cast.json !== false,
        date: cast.date !== false,
    };
}

/**
 * Coerce a raw string to the requested schema type.
 * @param {string} raw
 * @param {string} type
 * @param {string} file
 * @param {number} line
 * @returns {any}
 */
function coerceType(raw, type, file, line)
{
    switch (type)
    {
        case 'string':
            return raw;

        case 'boolean': {
            const lower = raw.toLowerCase();
            if (lower === 'true') return true;
            if (lower === 'false') return false;
            throw invalidTypeError('boolean', raw, file, line);
        }

        case 'number':
            if (!isNumber(raw)) throw invalidTypeError('number', raw, file, line);
            return Number(raw);

        case 'json':
            return JSON.parse(raw);

        case 'date': {
            const date = new Date(raw);
            if (Number.isNaN(date.getTime())) throw invalidTypeError('date', raw, file, line);
            return date;
        }

        default:
            return raw;
    }
}

/**
 * Auto-cast a raw string based on enabled casting rules.
 * @param {string} raw
 * @param {{boolean: boolean, number: boolean, json: boolean, date: boolean}} cast
 * @returns {any}
 */
function autoCast(raw, cast)
{
    const trimmed = raw.trim();

    if (cast.boolean)
    {
        const lower = trimmed.toLowerCase();
        if (lower === 'true') return true;
        if (lower === 'false') return false;
    }

    if (cast.number && isNumber(trimmed))
    {
        return Number(trimmed);
    }

    if (cast.json && (trimmed.startsWith('{') || trimmed.startsWith('[')))
    {
        try
        {
            return JSON.parse(trimmed);
        } catch (_err)
        {
            return trimmed;
        }
    }

    if (cast.date && isIsoDate(trimmed))
    {
        const date = new Date(trimmed);
        if (!Number.isNaN(date.getTime())) return date;
    }

    return trimmed;
}

module.exports = { normalizeCast, coerceType, autoCast };
