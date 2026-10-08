/**
 * Steps of location_category_audit_log.feature (FRD 7, US-8 - Audit / Activity Log).
 *
 * The MIDC build has no Activity Log screen for Location Categories, so every scenario of the feature is skipped
 * by the @audit_log hook in ./hooks.ts before its first step. The steps are defined so the feature stays
 * executable: once an Activity Log entry point appears the hook fails instead of skipping, and these steps must
 * then be automated against the real screen (they currently fail loudly if they are ever reached).
 * Steps shared with other features (create / delete / form open) are defined in their own files.
 */
import { Given, Then, When } from '@cucumber/cucumber';
import { unreachable } from './helpers';

Given(/^the Activity Log has entries$/, function () {
  unreachable('the Activity Log has entries');
});

When(/^I open the (?:Location Category )?Activity Log$/, function () {
  unreachable('I open the Activity Log');
});

When(/^I rename "([^"]*)" to "([^"]*)"$/, function (_value1: string, _value2: string) {
  unreachable('I rename a category');
});

When(/^I change the Parent of "([^"]*)" from none to "([^"]*)"$/, function (_value1: string, _value2: string) {
  unreachable('I change the Parent of a category');
});

When(/^I delete "([^"]*)"$/, function (_value1: string) {
  unreachable('I delete a category');
});

When(/^I look for edit and delete controls on entries$/, function () {
  unreachable('I look for edit and delete controls on entries');
});

When(/^I attempt to modify or delete an entry via API$/, function () {
  unreachable('I attempt to modify or delete an entry via API');
});

Then(/^an entry "([^"]*)" should be (?:added|present)(?: with .*)?$/, function (_value1: string) {
  unreachable('an Activity Log entry should be present');
});

Then(/^the entry should contain User.*$/, function () {
  unreachable('the entry should contain User and Date/Time');
});

Then(/^the entry should show Field Changed "([^"]*)", Previous Value (?:"[^"]*"|none or blank) and New Value "([^"]*)"$/, function (_value1: string, _value2: string) {
  unreachable('the entry should show the changed field');
});

Then(/^the entry should persist although the category no longer exists$/, function () {
  unreachable('the entry should persist');
});

Then(/^the Block Reason should be "([^"]*)"$/, function (_value1: string) {
  unreachable('the Block Reason should be shown');
});

Then(/^no "Created" entry should be added for the failed attempt$/, function () {
  unreachable('no Created entry should be added');
});

Then(/^the entries should appear in reverse chronological order "([^"]*)"$/, function (_value1: string) {
  unreachable('the entries should appear in reverse chronological order');
});

Then(/^no edit or delete controls should be displayed$/, function () {
  unreachable('no edit or delete controls should be displayed');
});

Then(/^the API modification or deletion of an entry should be rejected$/, function () {
  unreachable('the API modification or deletion should be rejected');
});

Then(/^the entries should remain unchanged$/, function () {
  unreachable('the entries should remain unchanged');
});
