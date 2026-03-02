'use strict';

const { load, parse } = require('./lib/core');
const { watch } = require('./lib/watch');

/**
 * Watch resolved .menv files and reload on change.
 * @param {object} options         Same options as load().
 * @param {Function} onChange      Callback: (err, result) => void.
 * @returns {{close: () => void}}
 */
function watchFiles(options, onChange) {
  return watch(options, onChange, load);
}

/*
 * Default export is `load` itself so callers can do:
 *   require('molex-env')()          — quick load
 *   require('molex-env').load()     — explicit
 *   require('molex-env').parse()    — string parsing
 *   require('molex-env').watch()    — file watching
 */
module.exports = Object.assign(load, {
  load,
  parse,
  watch: watchFiles,
});
