/**
 * Location Category hooks.
 *
 * - After: removes the test data a scenario created (Locations first, then categories deepest-first), so every
 *   scenario can be re-run. Defined under src/steps on purpose: Cucumber runs After hooks in reverse definition
 *   order, and src/support is loaded first, so this hook runs while the scenario's browser context is still open.
 *   Only records carrying the scenario's unique suffix are touched.
 * - Before @audit_log: the MIDC build has no Activity Log screen for Location Categories, so those scenarios
 *   are skipped; once an entry point appears the hook fails instead, so the log steps get automated.
 */
import { After, Before } from '@cucumber/cucumber';
import type { CustomWorld } from '../../support/world';
import { ensureOnList, skipBecause } from './helpers';

/**
 * Clean-up gets a fixed budget inside the hook's own timeout: a stuck request must leave the scenario's result
 * untouched and be reported as leftover test data, not as a hook failure.
 */
const CLEANUP_BUDGET_MS = 90000;
const HOOK_TIMEOUT_MS = CLEANUP_BUDGET_MS + 30000;

After({ tags: '@location_category', name: 'Remove Location Category test data', timeout: HOOK_TIMEOUT_MS }, async function (this: CustomWorld) {
  if (!this.hasPage || this.page.isClosed()) return;
  const { api, location } = this.pages.locationCategory;
  if (!api.hasSession()) return;

  const leftovers: string[] = [];
  const deadline = Date.now() + CLEANUP_BUDGET_MS;
  try {
    await this.pages.locationCategory.dismissOverlays().catch(() => undefined);

    // Locations first: a category that still has Locations cannot be deleted.
    for (const id of [...location.createdIds].reverse()) {
      if (Date.now() > deadline) break;
      const result = await location.remove(id);
      if (result.status >= 300) leftovers.push(`Location #${id}: ${result.status} ${result.message}`);
    }

    const owned = (await api.fetchMaster()).filter((record) => this.locationCategory.data.owns(record.name));
    // Deepest first, so a child is removed before its parent.
    for (const record of owned.sort((a, b) => b.depth - a.depth)) {
      if (Date.now() > deadline) {
        leftovers.push(`#${record.id} "${record.name}" (clean-up budget exhausted)`);
        continue;
      }
      const result = await api.remove(record.id);
      if (result.status >= 300) leftovers.push(`#${record.id} "${record.name}": ${result.status} ${result.message}`);
    }

    const remaining = (await api.fetchMaster()).filter((record) => this.locationCategory.data.owns(record.name));
    for (const record of remaining) {
      const text = `#${record.id} "${record.name}" is still in the master`;
      if (!leftovers.some((entry) => entry.startsWith(`#${record.id} `))) leftovers.push(text);
    }
  } catch (error) {
    leftovers.push(`clean-up stopped: ${(error as Error).message}`);
  }

  if (leftovers.length > 0) {
    this.log(`Location Category test data left behind (filter the grid for "Bdd" to find it):\n${leftovers.join('\n')}`);
  }
});

let activityLogAvailable: boolean | undefined;

Before({ tags: '@audit_log', name: 'Skip Activity Log scenarios while the build has no Activity Log' }, async function (this: CustomWorld) {
  if (activityLogAvailable === undefined) {
    await ensureOnList(this);
    activityLogAvailable = await this.pages.locationCategory.activityLog.isAvailable();
  }
  if (activityLogAvailable) {
    throw new Error(
      'An Activity / Audit Log entry point is now present on the Location Category screen; ' +
        'automate the audit log steps (src/steps/location_category_steps/audit-log.steps.ts) against it.',
    );
  }
  return skipBecause(this, 'the MIDC build has no Activity / Audit Log screen for Location Categories.');
});
