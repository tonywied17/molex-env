// Type definitions for molex-env
// Project: https://github.com/tonywied17/molex-env-npm

/* ------------------------------------------------------------------ */
/*  Option types                                                       */
/* ------------------------------------------------------------------ */

export interface CastOptions
{
    boolean?: boolean;
    number?: boolean;
    json?: boolean;
    date?: boolean;
}

export interface SchemaDefinition
{
    type: 'string' | 'boolean' | 'number' | 'json' | 'date';
    required?: boolean;
    default?: any;
}

export interface Warning
{
    type: string;
    key: string;
    file: string;
    line: number;
}

export interface LoadOptions
{
    /** Base directory to resolve files from. */
    cwd?: string;
    /** Profile name for `.menv.{profile}` files. */
    profile?: string;
    /** Custom file list (absolute or relative to cwd). */
    files?: string[];
    /** Schema definition for validation and typing. */
    schema?: Record<string, SchemaDefinition | string>;
    /** Reject unknown keys, within-file duplicates, and invalid lines. */
    strict?: boolean;
    /** Enable/disable type casting. */
    cast?: boolean | CastOptions;
    /** Write parsed values to `process.env`. */
    exportEnv?: boolean;
    /** Override existing `process.env` values. */
    override?: boolean;
    /** Attach parsed values to `process.menv`. */
    attach?: boolean;
    /** Deep-freeze the parsed config object. */
    freeze?: boolean;
    /** Log file precedence overrides to console. */
    debug?: boolean;
    /** Callback for non-strict warnings. */
    onWarning?: (warning: Warning) => void;
}

export interface ParseOptions
{
    /** Schema definition for validation. */
    schema?: Record<string, SchemaDefinition | string>;
    /** Enable strict validation. */
    strict?: boolean;
    /** Enable/disable type casting. */
    cast?: boolean | CastOptions;
    /** Deep-freeze the result. */
    freeze?: boolean;
    /** Virtual file path for origin tracking. */
    filePath?: string;
    /** Callback for non-strict warnings. */
    onWarning?: (warning: Warning) => void;
}

/* ------------------------------------------------------------------ */
/*  Result types                                                       */
/* ------------------------------------------------------------------ */

export interface Origin
{
    file: string;
    line: number;
    raw: string | undefined;
}

export interface LoadResult
{
    /** Typed configuration values. */
    parsed: Record<string, any>;
    /** Raw string values before type casting. */
    raw: Record<string, string>;
    /** Source tracking: file, line, and raw value per key. */
    origins: Record<string, Origin>;
    /** List of resolved file paths that were read. */
    files: string[];
}

export interface WatchHandle
{
    /** Stop watching all files. */
    close(): void;
}

export type WatchCallback = (error: Error | null, result?: LoadResult) => void;

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Load .menv files, merge, parse, and validate.
 */
export function load(options?: LoadOptions): LoadResult;

/**
 * Parse a string of .menv content without loading files.
 */
export function parse(text: string, options?: ParseOptions): LoadResult;

/**
 * Watch .menv files and reload automatically on change.
 */
export function watch(options: LoadOptions, onChange: WatchCallback): WatchHandle;

/**
 * Default export — `load` function with named exports attached.
 */
declare const molexEnv: typeof load & {
    load: typeof load;
    parse: typeof parse;
    watch: typeof watch;
};

export = molexEnv;
