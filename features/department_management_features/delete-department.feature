# Source: delete-added-department.spec.ts  (test.describe 'Delete Department' — 2 tests)
# Safety guard: only departments created by these scenarios (DeleteDept/DelMulti + timestamp) are ever deleted.
@delete-department
Feature: Delete Department
  As an authenticated department user
  I want to delete departments I no longer need
  So that the Department List stays accurate

  Background:
    Given I open the MIDC portal
    And the MIDC portal is loaded
    When I open the Department Login page
    Then the Department Login page is displayed
    When I log in with the configured Department Login credentials
    Then the scenario is skipped if Department Login authentication fails, because "Delete Department requires valid Department Login credentials."
    And the Masters Management link is visible
    When I open Masters Management
    Then the Admin Portal is loaded
    When I open Organization Configuration
    And I select the organization "MIDC"
    Then the organization is shown as selected

  Scenario: Delete a single added department
    Given the following unique test data is generated:
      | alias               | template             |
      | departmentName      | DeleteDept{timestamp} |
      | departmentShortName | Del{timestamp:last4} |
    Then the value "{departmentName}" matches the deletable test department pattern
    When I add a department named "{departmentName}" with short name "{departmentShortName}" and Prod Code "CIRCLE"
    # Grid is paginated, so filter to bring the new department onto the visible page.
    And I filter the department grid by name "{departmentName}"
    Then the department grid shows exactly 1 row
    # Safety: never delete anything other than the department this scenario created.
    And the first row department name matches the deletable test department pattern
    And the first row department name equals "{departmentName}" ignoring case
    When I open the row action menu of the first row
    And I choose "Delete" from the row action menu
    Then the delete confirmation dialog asks to permanently delete 1 item
    When I confirm the deletion
    Then the department deleted success message is displayed within 30 seconds
    And the delete confirmation dialog is closed within 30 seconds
    And no departments are listed for the filter "{departmentName}", even after re-applying the filter

  Scenario: Delete multiple added departments
    Given the following unique test data is generated:
      | alias                | template             |
      | runId                | DelMulti{timestamp}  |
      | departmentAName      | {runId}A             |
      | departmentAShortName | DmA{timestamp:last4} |
      | departmentBName      | {runId}B             |
      | departmentBShortName | DmB{timestamp:last4} |
    Then the value "{departmentAName}" matches the deletable test department pattern
    And the value "{departmentBName}" matches the deletable test department pattern
    When I add a department named "{departmentAName}" with short name "{departmentAShortName}" and Prod Code "CIRCLE"
    And I add a department named "{departmentBName}" with short name "{departmentBShortName}" and Prod Code "CIRCLE"
    # Filter on the shared run prefix so only this run's departments are listed.
    And I filter the department grid by name "{runId}"
    Then the department grid shows exactly 2 rows
    # Safety: never tick a checkbox unless every filtered row is a department this scenario created.
    And all 2 visible department names match the deletable test department pattern
    When I select the checkboxes of the first 2 rows
    Then the Unselect All button is visible within 20 seconds
    And the bulk Delete button is visible within 20 seconds
    When I click the bulk Delete button
    Then the delete confirmation dialog asks to permanently delete 2 items
    When I confirm the deletion
    Then the department deleted success message is displayed within 30 seconds
    And the delete confirmation dialog is closed within 30 seconds
    # Neither department should survive the bulk delete.
    And no departments are listed for the filter "{runId}", even after re-applying the filter
