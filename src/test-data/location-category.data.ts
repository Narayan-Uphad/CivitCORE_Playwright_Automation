/**
 * Location Category Management test data.
 *
 * The feature files are written in FRD vocabulary ("Location Category Name", "Parent Category",
 * "Location Category created successfully.") and name an 8-record baseline (Country, Zone, Airport ...).
 * The MIDC build differs in three ways, all translated here and only here:
 *
 *  1. Wording: "Location Category Name" is labelled "Location Category", the Parent Category dropdown
 *     is the "Nest Location Under" checkbox + "Select Parent Location Category" lookup, Save is
 *     "Add / Update Location Category", and messages read differently (see the aliases below).
 *  2. Required extras: the form also needs a Location Category Code and a Prod Code, which the FRD does
 *     not mention; they are filled with unique / fixed values so FRD scenarios stay about the FRD fields.
 *  3. Data: the live master holds 23 real categories and none of the FRD's baseline names. Scenarios
 *     therefore get their own copy of every baseline category they use ("Zone" -> "Zone Bdd1234567"),
 *     created through the API and removed afterwards, so real data is never edited or deleted.
 *
 * Set STRICT_FRD_MESSAGES=true to assert the FRD message copy verbatim instead of the app's copy.
 */
import { config } from '../support/config';
import { escapeRegExp } from '../utils/assertions';

export interface BaselineCategory {
  name: string;
  /** FRD does not give every short name; the ones marked (assumed) only need to be unique and valid. */
  shortName: string;
  parent?: string;
}

/** The FRD baseline hierarchy: Country > State/Territory > {District > City > Airport, Assembly Constituency}; Zone, Depot at L1. */
export const baselineCategories: readonly BaselineCategory[] = [
  { name: 'Country', shortName: 'CTRY' },
  { name: 'State/Territory', shortName: 'STT', parent: 'Country' }, // (assumed)
  { name: 'District', shortName: 'DIST', parent: 'State/Territory' },
  { name: 'City', shortName: 'CITY', parent: 'District' }, // (assumed)
  { name: 'Airport', shortName: 'ARPT', parent: 'City' },
  { name: 'Assembly Constituency', shortName: 'ASMC', parent: 'State/Territory' }, // (assumed)
  { name: 'Zone', shortName: 'ZONE' },
  { name: 'Depot', shortName: 'DEPT' }, // (assumed)
];

export const baselineNames: readonly string[] = baselineCategories.map((category) => category.name);

export function baselineCategory(name: string): BaselineCategory | undefined {
  const key = normalizeLocationCategoryText(name);
  return baselineCategories.find((category) => normalizeLocationCategoryText(category.name) === key);
}

/** Prod Code every created category gets (its label in the form's Prod Code select, and the API code). */
export const defaultProdCode = { label: 'Zone', code: 'CORE018008' } as const;

/** Organization the Location Category tab is opened for. */
export const API_ORG_ID = 1;

export const locationCategoryMessages = {
  deleteConfirmation: /permanently delete/i,
} as const;

/**
 * FRD message -> what the MIDC build shows for the same outcome (strings or patterns).
 * Entries marked (unconfirmed) were not observed on the live build yet and use a tolerant pattern.
 */
export const locationCategoryMessageAliases: Record<string, Array<string | RegExp>> = {
  'Location Category created successfully.': ['Location category added successfully!'],
  'Location Category updated successfully.': [/location category (updated|edited|modified) successfully/i], // (unconfirmed)
  'Location Category deleted successfully.': ['Location category deleted successfully!'],
  'Location Category Name is required': ['Location Category is required'],
  'Short Name is required': ['Location Category Short Name is required'],
  'Location Category Name already exists': [/category with the same name already exists/i],
  'Short Name already exists': [/^(?=.*short)(?=.*(already exists|same|duplicate))/i], // (unconfirmed)
  'Invalid Parent Category': [/^(?=.*parent)(?=.*(not found|invalid|does not exist))/i], // (unconfirmed)
  'Location Category cannot be deleted because it is associated with one or more Locations.': [
    /^(?=.*delet)(?=.*location)(?=.*(associated|assigned|in use|mapped|tagged|linked))/i,
  ], // (unconfirmed)
  'Location Category cannot be deleted because it has one or more child Location Categories.': [
    /^(?=.*delet)(?=.*(child|nested|sub.?categor|hierarchy))/i,
  ], // (unconfirmed)
};

/** Text of any message that explains why a Location Category cannot be deleted. */
export const DELETION_BLOCKED_PATTERN = /(cannot|can't|unable to|not allowed).{0,40}delet|delet.{0,80}(because|since|associated|child|location)/i;

export function normalizeLocationCategoryText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function messageCore(message: string): string {
  const core = message.trim().replace(/[.!]+$/, '');
  return escapeRegExp(core).replace(/\s+/g, '\\s+');
}

/** Pattern for an FRD message: the FRD copy itself, or (unless strict) the app's copy for it. */
export function locationCategoryMessagePattern(message: string): RegExp {
  const aliases = config.strictFrdMessages ? [] : (locationCategoryMessageAliases[message.trim()] ?? []);
  const alternatives = [messageCore(message), ...aliases.map((alias) => (typeof alias === 'string' ? messageCore(alias) : alias.source))];
  return new RegExp(alternatives.join('|'), 'i');
}

/**
 * The Short Name field's real limit. The form's note and message say 20 characters, but the app already refuses
 * 11 ("Location Category Short Name cannot exceed 20 characters"), so test values stay within 10.
 */
const SHORT_NAME_MAX_LENGTH = 10;

/**
 * Per-scenario unique test data. Every name / short name taken from a feature file gets the scenario's
 * suffix, so scenarios never collide with each other or with real data while the relationships they are
 * about survive: "Airport" and "AIRPORT" still differ only by case, "  Substation  " keeps its padding.
 * The fixed "Bdd" marker makes leftovers easy to find: filter the Location Category grid for "Bdd".
 */
export class LocationCategoryTestData {
  readonly suffix: string;
  readonly shortSuffix: string;
  private readonly digits: string;
  private codeCounter = 0;

  constructor(now: number = Date.now(), random: number = Math.random()) {
    const digits = `${now % 10_000_000}`.padStart(7, '0') + Math.floor(random * 10);
    this.digits = digits;
    this.suffix = `Bdd${digits}`;
    this.shortSuffix = digits.slice(-4);
  }

  /** "Zone" -> "Zone Bdd12345678"; blank / whitespace-only values are kept. */
  name(value: string): string {
    return this.decorate(value, (core) => `${core} ${this.suffix}`);
  }

  /**
   * "ZONE" -> "ZONE1234". A value with no room left for the suffix ("WH-A & B.1" is already 10 characters) is kept
   * as it is; the record is still found by its suffixed Name.
   */
  shortName(value: string): string {
    return this.decorate(value, (core) => (core.length + this.shortSuffix.length > SHORT_NAME_MAX_LENGTH ? core : `${core}${this.shortSuffix}`));
  }

  /** Unique Location Category Code (the form requires one; the FRD has no such field). */
  code(): string {
    this.codeCounter += 1;
    return `C${this.digits.slice(-6)}${this.codeCounter}`;
  }

  /** True when a stored Name belongs to this scenario's data (every name the scenario creates carries the suffix). */
  owns(name: string): boolean {
    return name.toLowerCase().includes(this.suffix.toLowerCase());
  }

  private decorate(value: string, transform: (core: string) => string): string {
    if (value.trim() === '') return value;
    const [, lead, core, trail] = /^(\s*)(.*?)(\s*)$/s.exec(value)!;
    return `${lead}${transform(core)}${trail}`;
  }
}
