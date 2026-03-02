'use strict';

/**
 * Base error type for molex-env.
 */
class MenvError extends Error
{
    constructor(message, details)
    {
        super(message);
        this.name = 'MenvError';
        if (details) this.details = details;
    }
}

/**
 * Format a file/line suffix for error messages.
 * @param {string} file
 * @param {number} line
 * @returns {string}
 */
function formatLocation(file, line)
{
    if (!file) return '';
    if (!line) return ` (${file})`;
    return ` (${file}:${line})`;
}

/** @returns {MenvError} */
function invalidLineError(line, rawLine, file)
{
    return new MenvError(`Invalid line ${line}: ${rawLine}${formatLocation(file)}`);
}

/** @returns {MenvError} */
function unknownKeyError(key, file, line)
{
    return new MenvError(`Unknown key: ${key}${formatLocation(file, line)}`);
}

/** @returns {MenvError} */
function duplicateKeyError(key, file, line)
{
    return new MenvError(`Duplicate key: ${key}${formatLocation(file, line)}`);
}

/** @returns {MenvError} */
function missingRequiredError(key)
{
    return new MenvError(`Missing required key: ${key}`);
}

/** @returns {MenvError} */
function invalidTypeError(type, raw, file, line)
{
    return new MenvError(`Invalid ${type}: ${raw}${formatLocation(file, line)}`);
}

module.exports = {
    MenvError,
    invalidLineError,
    unknownKeyError,
    duplicateKeyError,
    missingRequiredError,
    invalidTypeError,
};
