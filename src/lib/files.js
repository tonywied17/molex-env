'use strict';

const path = require('path');

/**
 * Resolve .menv file paths based on options.
 * @param {{cwd?: string, files?: string[], profile?: string}} options
 * @returns {string[]}
 */
function resolveFiles(options = {})
{
    const cwd = options.cwd || process.cwd();

    if (Array.isArray(options.files) && options.files.length > 0)
    {
        return options.files.map((f) => (path.isAbsolute(f) ? f : path.join(cwd, f)));
    }

    const files = [
        path.join(cwd, '.menv'),
        path.join(cwd, '.menv.local'),
    ];

    if (options.profile)
    {
        files.push(
            path.join(cwd, `.menv.${options.profile}`),
            path.join(cwd, `.menv.${options.profile}.local`),
        );
    }

    return files;
}

module.exports = { resolveFiles };
