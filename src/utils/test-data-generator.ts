/**
 * Resolves the dynamic test-data templates used in the feature files so that
 * the original `Date.now()`-based naming rules are reproduced exactly.
 *
 * Supported tokens:
 *   {timestamp}         -> Date.now()                                   e.g. `Civiltest${Date.now()}`
 *   {timestamp:lastN}   -> Date.now().toString().slice(-N)              e.g. `Civil${Date.now().toString().slice(-4)}`
 *   {alias}             -> value previously generated under that alias  e.g. `${runId}A`
 *   {alias:upper}       -> alias value upper-cased                      e.g. `name.toUpperCase()`
 *   {alias:lower}       -> alias value lower-cased                      e.g. `shortName.toLowerCase()`
 *
 * An optional max length reproduces `.slice(0, N)` from the original code.
 */
const TOKEN_PATTERN = /\{([A-Za-z][A-Za-z0-9_]*)(?::([A-Za-z0-9]+))?\}/g;
const ALIAS_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

export class TestDataStore {
  private readonly values = new Map<string, string>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  /** Generates a value from a template, stores it under `alias` and returns it. */
  generate(alias: string, template: string, maxLength?: number): string {
    if (!ALIAS_PATTERN.test(alias)) {
      throw new Error(`Invalid test-data alias "${alias}". Use letters, digits and underscores only.`);
    }
    if (alias === 'timestamp') throw new Error('"timestamp" is a reserved token and cannot be used as an alias.');
    let value = this.resolve(template);
    if (maxLength !== undefined) value = value.slice(0, maxLength);
    this.values.set(alias, value);
    return value;
  }

  get(alias: string): string {
    const value = this.values.get(alias);
    if (value === undefined) {
      throw new Error(`Test-data alias "{${alias}}" has not been generated in this scenario.`);
    }
    return value;
  }

  /** Replaces every {token} in `text`. Text without tokens is returned unchanged. */
  resolve(text: string): string {
    return text.replace(TOKEN_PATTERN, (_match, name: string, modifier?: string) => {
      if (name === 'timestamp') {
        const timestamp = String(this.now());
        if (!modifier) return timestamp;
        const last = /^last(\d+)$/.exec(modifier);
        if (last) return timestamp.slice(-Number(last[1]));
        throw new Error(`Unsupported timestamp modifier "${modifier}". Use {timestamp} or {timestamp:lastN}.`);
      }
      const value = this.get(name);
      switch (modifier) {
        case undefined:
          return value;
        case 'upper':
          return value.toUpperCase();
        case 'lower':
          return value.toLowerCase();
        default:
          throw new Error(`Unsupported modifier "${modifier}" for alias "${name}". Use upper or lower.`);
      }
    });
  }
}
