/**
 * Designation Management test data.
 *
 * The feature files are written in FRD vocabulary ("Abbreviation", "Reporting To", "Save",
 * "Designation created successfully."). The MIDC build names the same things differently, so
 * every FRD term the steps understand is translated here — and only here — to the label or copy
 * the application actually renders. Anything without an entry is asserted verbatim.
 */
import { config } from '../support/config';
import { escapeRegExp } from '../utils/assertions';

/** FRD field name -> accessible name of the control in the Add / Edit Designation dialog. */
export const designationFieldLabels: Record<string, string> = {
  Abbreviation: 'Designation Short Name *',
  'Designation Name': 'Designation Name *',
  // "Reporting To" is the "Nest Designation Under" checkbox + this lookup (see DesignationPage).
  'Reporting To': 'Select Parent Designation',
};

/** FRD list column -> grid column header. FRD columns with no counterpart are absent on purpose. */
export const designationColumnHeaders: Record<string, string> = {
  Abbreviation: 'Short Name',
  'Designation Name': 'Designation Name',
  Actions: 'Actions',
};

/**
 * FRD message -> message the MIDC build shows for the same outcome.
 *
 * Each entry is an FRD copy deviation that the product owner should confirm; set
 * STRICT_FRD_MESSAGES=true to assert the FRD wording verbatim instead.
 */
export const designationMessageAliases: Record<string, string> = {
  'Designation created successfully.': 'Designation added successfully!',
  'Abbreviation is required': 'Designation Short Name is required',
  'A designation with this name already exists':
    'a Designation with the same name already exists for this Organization',
  'Selected designation is not available': 'Parent Designation Not Found with in the Current Organization',
};

/** Office whose Position (= FRD "Post") list is used by the Post-related scenarios. */
export const positionContext = {
  officeCategory: process.env.POSITION_OFFICE_CATEGORY?.trim() || 'Head Office',
  office: process.env.POSITION_OFFICE?.trim() || 'Engineering',
} as const;

export const designationMessages = {
  positionSaved: /position count saved successfully/i,
  deleteConfirmation: /permanently delete/i,
} as const;

/** Trims, collapses inner whitespace and lower-cases: the app title-cases and squeezes names. */
export function normalizeDesignationText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Whitespace / punctuation tolerant pattern for one expected message. */
function messageCore(message: string): string {
  const core = message.trim().replace(/[.!]+$/, '');
  return escapeRegExp(core).replace(/\s+/g, '\\s+');
}

/** Pattern for an FRD message: the FRD copy itself, or (unless strict) the app's copy for it. */
export function designationMessagePattern(message: string): RegExp {
  const alias = config.strictFrdMessages ? undefined : designationMessageAliases[message.trim()];
  const alternatives = [messageCore(message), ...(alias ? [messageCore(alias)] : [])];
  return new RegExp(alternatives.join('|'), 'i');
}

const SHORT_NAME_MAX_LENGTH = 20;

/**
 * Per-scenario unique test data.
 *
 * Every Designation Name / Abbreviation taken from a feature file gets the same scenario
 * suffix, so a scenario never collides with data from an earlier run or a parallel worker,
 * while the relationships the scenario is about are preserved: "Chief Engineer" and
 * "chief engineer" still differ only by case, "  Site Engineer  " still has its padding,
 * and "ce " still only differs from "CE" by case and a trailing space.
 * The fixed "Bdd" marker also makes any leftover record easy to find and remove by hand.
 */
export class DesignationTestData {
  readonly suffix: string;

  constructor(now: number = Date.now(), random: number = Math.random()) {
    const digits = `${now % 10_000_000}`.padStart(7, '0') + Math.floor(random * 10);
    this.suffix = `Bdd${digits}`;
  }

  /** "Chief Engineer" -> "Chief Engineer Bdd12345678"; blank / whitespace-only values are kept. */
  name(value: string): string {
    return this.decorate(value, (core) => `${core} ${this.suffix}`);
  }

  /** "CE" -> "CEBDD12345678"; the app only accepts letters and digits in a short name. */
  abbreviation(value: string): string {
    const result = this.decorate(value, (core) => `${core}${this.suffix.toUpperCase()}`);
    if (result.trim().length > SHORT_NAME_MAX_LENGTH) {
      throw new Error(`Abbreviation "${result.trim()}" exceeds the ${SHORT_NAME_MAX_LENGTH}-character limit.`);
    }
    return result;
  }

  /** Short name for a fixture whose feature step names only the Designation Name. */
  abbreviationFor(name: string, index: number): string {
    const initials = name.replace(/[^A-Za-z ]/g, '').split(/\s+/).map((word) => word.charAt(0)).join('');
    return this.abbreviation(`${initials.toUpperCase() || 'D'}${index > 0 ? index : ''}`);
  }

  /** True when a stored value belongs to this scenario's data. */
  owns(value: string): boolean {
    return value.toLowerCase().includes(this.suffix.toLowerCase());
  }

  private decorate(value: string, transform: (core: string) => string): string {
    if (value.trim() === '') return value;
    const [, lead, core, trail] = /^(\s*)(.*?)(\s*)$/s.exec(value)!;
    return `${lead}${transform(core)}${trail}`;
  }
}
