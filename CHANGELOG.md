# Changelog

## 0.3.2 - 2026-02-04
### Changed
- **BREAKING**: Duplicate key checking in strict mode now only validates within the same file, not across files
  - This allows file precedence to work correctly even in strict mode
  - Cross-file overrides are now supported in both strict and non-strict modes
  - Only duplicate keys within the same file will trigger errors in strict mode
  - Per-file duplicate tracking implemented via `seenPerFile` Map in state object

### Added
- `debug` option to log file precedence overrides to console
  - Shows which files override values during cascading (file path, line number, old vs new values)
  - Useful for understanding configuration cascading behavior
  - Example output: `[molex-env] Override: PORT` with before/after comparison
- Watch mode change detection with automatic diff logging when debug is enabled
  - Displays changed keys with old → new value comparison
  - Only shows actual changes (smart comparison for dates and objects)
  - Debug mode temporarily disabled during reload to avoid duplicate override messages
- Enhanced origin tracking to support per-file duplicate detection
- Package.json publishing scripts for both NPM and GitHub Package Registry

### Fixed
- File precedence now works correctly in strict mode (cross-file overrides no longer throw errors)
- Watch mode now properly detects and logs configuration changes
- Improved debug output formatting and clarity

## 0.2.0 - 2026-02-02
### Changed
- Rename `export` option to `exportEnv` (no alias).
- Attach parsed values to `process.menv` by default (disable with `attach: false`).
