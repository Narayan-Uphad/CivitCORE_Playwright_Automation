/**
 * Steps of designation_activity_log.feature (FRD 7 - Activity / Audit Log).
 * Page object: DesignationActivityLogPage.
 *
 * The MIDC build has no Activity / Audit Log screen for Designations, so the scenarios are skipped.
 * The Given steps probe for an entry point first: once one appears, they fail instead of skipping,
 * so the log assertions get automated against the real screen rather than silently staying skipped.
 */
import { Given, Then, When } from '@cucumber/cucumber';
import type { CustomWorld } from '../../support/world';
import { skipBecause, unreachable } from './helpers';

const NO_ACTIVITY_LOG = 'the MIDC build has no Activity / Audit Log screen for Designations.';

async function skipUnlessActivityLogExists(world: CustomWorld): Promise<'skipped'> {
  if (await world.pages.designation.activityLog.isAvailable()) {
    throw new Error(
      'An Activity / Audit Log entry point is now present on the Designation screen; ' +
        'automate the Activity Log steps (src/steps/designation/activity-log.steps.ts) against it.',
    );
  }
  return skipBecause(world, NO_ACTIVITY_LOG);
}

Given(/^a Designation has multiple Activity Log entries recorded at different times$/, async function (this: CustomWorld) {
  return skipUnlessActivityLogExists(this);
});

Given(/^the Activity Log has at least one entry for a Designation$/, async function (this: CustomWorld) {
  return skipUnlessActivityLogExists(this);
});

When(/^the user opens the Activity Log(?: for that Designation| screen)?$/, async function () {
  unreachable('the user opens the Activity Log');
});

Then(/^the entries are displayed with the most recently occurring activity listed first$/, async function () {
  unreachable('the entries are displayed with the most recent activity first');
});

Then(/^the entries are in strict chronological \(descending\) order$/, async function () {
  unreachable('the entries are in strict chronological order');
});

When(/^the user attempts to edit or delete an existing log entry$/, async function () {
  unreachable('the user attempts to edit or delete an existing log entry');
});

Then(/^no edit or delete controls are available on the Activity Log entries$/, async function () {
  unreachable('no edit or delete controls are available on the Activity Log entries');
});

Then(/^the log entries remain unchanged after the attempt$/, async function () {
  unreachable('the log entries remain unchanged after the attempt');
});
