# Source: add-nested-department-fixed.spec.ts  (test.describe 'Department Management' — 1 test)
@nested-department
Feature: Department Management - nested department

  Background:
    Given I open the MIDC portal
    And the MIDC portal is loaded
    When I open the Department Login page
    Then the Department Login page is displayed
    When I log in with the configured Department Login credentials
    Then the scenario is skipped if Department Login authentication fails, because "Add nested department requires valid Department Login credentials."
    And the Masters Management link is visible
    When I open Masters Management
    Then the Admin Portal is loaded
    When I open Organization Configuration

  Scenario: Add nested department under an existing parent department
    When I choose "MIDC" from the organization list by its text within 10 seconds
    And I open the Department tab within 20 seconds
    Then the "Department Name" column header is visible within 30 seconds
    Given the following unique test data is generated:
      | alias           | template                 |
      | parentName      | NestedParent{timestamp}  |
      | parentShortName | NP{timestamp:last4}      |
      | childName       | NestedChild{timestamp}   |
      | childShortName  | NC{timestamp:last4}      |
    # Parent department
    Then the Add Department button is visible within 20 seconds
    When I click the Add Department button
    Then the Add Department dialog is displayed within 20 seconds
    When I select organization "MIDC" in the dialog if the organization selector is shown
    And I enter "{parentName}" as the Department Name
    And I enter "{parentShortName}" as the Department Short Name
    And I select "CIRCLE" as the Department Prod Code
    And I submit the Add Department dialog
    Then the Add Department dialog is closed within 10 seconds
    When I filter the department grid by name "{parentName}"
    Then a department grid cell containing "{parentName}" is visible within 15 seconds
    # Clear the filter before adding the child department
    When I clear the department name filter
    And I click the Add Department button
    Then the Add Department dialog is displayed within 20 seconds
    When I select organization "MIDC" in the dialog if the organization selector is shown
    And I enter "{childName}" as the Department Name
    And I enter "{childShortName}" as the Department Short Name
    And I select "CIRCLE" as the Department Prod Code
    And I tick the "Nest Department Under" checkbox in the dialog
    Then the text "Nest Department Under" is visible in the dialog
    When I open the Select Parent Department field in the dialog
    # The app normalises stored names (e.g. "NestedParent" -> "Nestedparent"), so match case-insensitively.
    Then the parent department option matching "{parentName}" ignoring case is visible in the dialog within 15 seconds
    When I click the parent department option matching "{parentName}" ignoring case
    And I submit the Add Department dialog
    Then the Add Department dialog is closed within 10 seconds
    When I filter the department grid by name "{childName}"
    Then a department grid cell containing "{childName}" is visible within 15 seconds
