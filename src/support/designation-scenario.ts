/**
 * Scenario-scoped state of the Designation Management steps.
 *
 * Feature files name Designations in FRD terms ("CE" - "Chief Engineer"); the scenario keeps the
 * unique values those names were turned into (see DesignationTestData) and the IDs the app gave
 * them, so later steps can refer back to "the Designation CE" or "the parent Designation".
 */
import type { SubmitOutcome } from '../pages/designation';
import { DesignationTestData, normalizeDesignationText } from '../test-data/designation.data';

export interface DesignationFixture {
  id: number;
  /** Name / short name as stored by the app (it title-cases names and strips characters it refuses). */
  name: string;
  shortName: string;
}

/** What the user typed into the open Add / Edit form, so the stored record can be compared with it. */
export interface EnteredValues {
  name?: string;
  abbreviation?: string;
  parent?: DesignationFixture;
}

export class DesignationScenario {
  readonly data = new DesignationTestData();
  private readonly byName = new Map<string, DesignationFixture>();
  private readonly byAbbreviation = new Map<string, DesignationFixture>();

  /** The Designation the scenario is currently acting on. */
  target?: DesignationFixture;
  /** Values entered into the currently open form, and the record it edits (if any). */
  entered: EnteredValues = {};
  editing?: DesignationFixture;
  lastOutcome?: SubmitOutcome;
  /** Name of the Designation a scenario deleted on purpose. */
  deletedName?: string;
  /** Which list column "the Designation List search field" means in the current scenario. */
  searchColumn: 'Designation Name' | 'Short Name' = 'Designation Name';
  /** Positions added per Designation id; the clean-up hook removes them before deleting the Designation. */
  readonly addedPositions = new Map<number, number>();

  remember(fixture: DesignationFixture, frdName?: string, frdAbbreviation?: string): DesignationFixture {
    if (frdName) this.byName.set(normalizeDesignationText(frdName), fixture);
    if (frdAbbreviation) this.byAbbreviation.set(normalizeDesignationText(frdAbbreviation), fixture);
    this.target = fixture;
    return fixture;
  }

  /** Looks a fixture up by the FRD name or abbreviation a feature file used for it. */
  fixture(frdNameOrAbbreviation: string): DesignationFixture | undefined {
    const key = normalizeDesignationText(frdNameOrAbbreviation);
    return this.byName.get(key) ?? this.byAbbreviation.get(key);
  }

  /** Replaces a fixture's stored values (after an update), keeping every FRD key that points at it. */
  refresh(id: number, values: Partial<DesignationFixture>): void {
    for (const map of [this.byName, this.byAbbreviation]) {
      for (const fixture of map.values()) if (fixture.id === id) Object.assign(fixture, values);
    }
    if (this.target?.id === id) Object.assign(this.target, values);
  }

  get fixtureCount(): number {
    return new Set([...this.byName.values(), ...this.byAbbreviation.values()].map((fixture) => fixture.id)).size;
  }
}
