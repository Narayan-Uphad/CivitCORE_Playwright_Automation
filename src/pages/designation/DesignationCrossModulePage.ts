/**
 * Designation consumption by other modules (feature: designation_cross_module_consumption.feature).
 *
 * What the MIDC build offers (checked against the live portal):
 *  - Post: no separate master. A Post is a Position of a Designation in an Office (Organization
 *    configuration > Position), so the Position tab is the Post-side Designation lookup.
 *  - Employee: "Register New Employee" has no Designation field, so there is no Employee-side lookup.
 *  - Other Civit products (CivitBUILD) are not reachable from this portal.
 */
import { expect } from '../../utils/assertions';
import type { PositionPage } from '../PositionPage';

export interface PostLookupContext {
  organization: string;
  officeCategory: string;
  office: string;
}

export class DesignationCrossModulePage {
  constructor(
    private readonly position: PositionPage,
    private readonly context: PostLookupContext,
  ) {}

  get office(): string {
    return this.context.office;
  }

  /** Opens the Post (Position) Designation lookup of the configured office. */
  async openPostLookup(): Promise<void> {
    const { organization, officeCategory, office } = this.context;
    await this.position.open(organization, officeCategory, office);
  }

  /** Clears the lookup filter and checks it lists Designations. */
  async expectPostLookupPopulated(): Promise<void> {
    await this.position.filter('');
    await expect(this.position.dataRows.first(), 'the Post (Position) Designation lookup lists Designations').toBeVisible({ timeout: 20000 });
  }

  /** The Designation is listed, and its row action (how a Post of it is created) is enabled. */
  async expectSelectableForPost(designation: string): Promise<void> {
    const row = await this.position.expectListed(designation);
    await expect(row.getByRole('button')).toBeEnabled();
  }

  async expectNotSelectableForPost(designation: string): Promise<void> {
    await this.position.expectNotListed(designation);
  }

  async postCount(designation: string): Promise<number> {
    return (await this.position.counts(designation)).total;
  }

  /** Adds (positive) or removes (negative) Posts of a Designation in the open office. */
  async changePosts(designation: string, delta: number): Promise<void> {
    await this.position.changePositions(designation, delta);
  }
}
