'use strict';

/**
 * Recursively freeze an object graph.
 * @param {object} obj
 * @returns {object}
 */
function deepFreeze(obj)
{
    if (!obj || typeof obj !== 'object' || Object.isFrozen(obj)) return obj;
    Object.freeze(obj);
    for (const key of Object.keys(obj))
    {
        deepFreeze(obj[key]);
    }
    return obj;
}

module.exports = { deepFreeze };
