/**
 * Scenario-scoped state of the Location Category steps.
 *
 * Feature files name categories in FRD terms ("Zone", "State/Territory"); the scenario keeps the unique
 * copies those names were turned into (see LocationCategoryTestData) and the IDs the app gave them, so later
 * steps can refer back to "the category Zone" or "its parent".
 */
import type { ApiResult, LocationCategoryApiCall, SubmitOutcome } from '../pages/location_category';
import { LocationCategoryTestData, normalizeLocationCategoryText } from '../test-data/location-category.data';

export interface CategoryFixture {
  id: number;
  /** FRD name the feature file used ("Zone"). */
  frd: string;
  /** Name / short name as created (the app may normalise them; compare case-insensitively). */
  name: string;
  shortName: string;
  /** FRD name of the parent the fixture was created under. */
  parentFrd?: string;
}

/** What the user typed into the open Add / Edit form, so the stored record can be compared with it. */
export interface EnteredValues {
  name?: string;
  shortName?: string;
  parentFrd?: string;
  parentName?: string;
}

export interface LocationFixture {
  name: string;
  code: string;
  categoryFrd: string;
  id?: number;
}

export class LocationCategoryScenario {
  readonly data = new LocationCategoryTestData();
  private readonly byFrd = new Map<string, CategoryFixture>();

  /** The category the scenario is currently acting on. */
  target?: CategoryFixture;
  /** Values entered into the currently open form, and the record it edits (if any). */
  entered: EnteredValues = {};
  editing?: CategoryFixture;
  lastOutcome?: SubmitOutcome;
  lastDelete?: LocationCategoryApiCall;
  /** Result of the last request the scenario sent straight to the API. */
  apiResult?: ApiResult;
  /** Whether the last attempt to make a category its own / its child's parent was possible in the UI. */
  parentOptionOffered?: boolean;
  /** Ids created by earlier steps of the scenario (e.g. "I create category ... with Short Name ..."), in order. */
  readonly createdViaUi: CategoryFixture[] = [];
  /** ID noted from the API before an action ("I note the Location Category ID of Zone"). */
  notedId?: number;
  /** Master records (id -> name/short/parent) snapshotted before an action, to prove "nothing changed". */
  snapshot?: Array<{ id: number; name: string; shortName: string; parentId: number | null }>;
  /** The grid has to be reloaded before the next UI step because fixtures were created through the API. */
  needsRefresh = false;
  /** Locations the scenario created (the clean-up hook removes them before the categories). */
  readonly locations: LocationFixture[] = [];
  /** Free-form values a feature's own steps hand to each other (see the step file that sets them). */
  readonly scratch: Record<string, unknown> = {};
  /** Search text last entered and the column it was applied to. */
  lastSearch?: { text: string; column: 'Location Category' | 'Short Name' };

  remember(fixture: CategoryFixture): CategoryFixture {
    this.byFrd.set(normalizeLocationCategoryText(fixture.frd), fixture);
    this.target = fixture;
    return fixture;
  }

  fixture(frdName: string): CategoryFixture | undefined {
    return this.byFrd.get(normalizeLocationCategoryText(frdName));
  }

  fixtures(): CategoryFixture[] {
    return [...this.byFrd.values()];
  }

  /** Updates a fixture after the app changed it (rename, short name change, new parent). */
  refresh(id: number, values: Partial<CategoryFixture>): void {
    for (const fixture of [...this.byFrd.values(), ...this.createdViaUi]) {
      if (fixture.id === id) Object.assign(fixture, values);
    }
  }
}
