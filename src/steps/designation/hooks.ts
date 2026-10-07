/**
 * Removes the test data a Designation scenario created, so every scenario can be re-run.
 *
 * Defined under src/steps on purpose: Cucumber runs After hooks in reverse definition order, and
 * src/support is loaded first, so this hook runs while the scenario's browser context is still open.
 *
 * Only records carrying the scenario's unique suffix are touched, and a delete confirmation is
 * only ever confirmed here, for those records.
 */
import { After } from '@cucumber/cucumber';
import type { CustomWorld } from '../../support/world';
import { midcTestData } from '../../test-data/midc.data';

/**
 * Clean-up gets a fixed budget inside the hook's own timeout: a stuck UI action must leave the
 * scenario's result untouched and be reported as leftover test data, not as a hook failure.
 */
const CLEANUP_BUDGET_MS = 90000;
const HOOK_TIMEOUT_MS = CLEANUP_BUDGET_MS + 30000;

After(
  { tags: '@Designation', name: 'Remove Designation test data', timeout: HOOK_TIMEOUT_MS },
  async function (this: CustomWorld) {
    if (!this.hasPage || this.page.isClosed()) return;
    const designation = this.pages.designation;
    const scenario = this.designation;
    const createdIds = designation.api.createdIds();
    if (createdIds.length === 0 && scenario.addedPositions.size === 0) return;

    const leftovers: string[] = [];
    let budgetExceeded = false;

    const cleanUp = async (): Promise<void> => {
      try {
        await designation.dismissOverlays();

        // Posts first: a Designation that still has Positions must not be deleted.
        if (scenario.addedPositions.size > 0) {
          await designation.list.open(midcTestData.organizationName);
          const names = new Map([...scenario.addedPositions.keys()].map((id) => [id, designation.api.recordById(id)?.name]));
          await designation.crossModule.openPostLookup();
          for (const [id, count] of scenario.addedPositions) {
            const name = names.get(id);
            if (name && count > 0) await designation.crossModule.changePosts(name, -count);
          }
          scenario.addedPositions.clear();
        }

        await designation.list.open(midcTestData.organizationName);
        // Newest first, so a child is removed before its parent.
        for (const id of createdIds.reverse()) {
          if (budgetExceeded) return;
          const record = designation.api.recordById(id);
          if (!record) continue;
          if (!scenario.data.owns(record.name) && !scenario.data.owns(record.shortName)) {
            leftovers.push(`#${id} "${record.name}" (not recognised as test data, left untouched)`);
            continue;
          }
          const call = await designation.deletion.deleteDesignation(record.name);
          if (call.status >= 300) leftovers.push(`#${id} "${record.name}": ${call.message}`);
        }
      } catch (error) {
        if (!budgetExceeded) leftovers.push(`clean-up stopped: ${(error as Error).message.split('\n')[0]}`);
      }
    };

    let timer: NodeJS.Timeout | undefined;
    const budget = new Promise<void>((resolve) => {
      timer = setTimeout(() => {
        budgetExceeded = true;
        leftovers.push(`clean-up stopped: it did not finish within ${CLEANUP_BUDGET_MS / 1000} s`);
        resolve();
      }, CLEANUP_BUDGET_MS);
    });
    await Promise.race([cleanUp(), budget]);
    clearTimeout(timer);

    if (leftovers.length > 0) {
      // Never fails the scenario: its own result must stay visible. Leftovers carry the scenario suffix.
      const note = `Designation clean-up incomplete (records contain "${scenario.data.suffix}"): ${leftovers.join('; ')}`;
      this.log(note);
      console.warn(note);
    }
  },
);
