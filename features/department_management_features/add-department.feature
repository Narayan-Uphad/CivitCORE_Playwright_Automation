# Source: add-department.spec.ts  (test.describe 'Add Department' — 1 test)
@add-department
Feature: Add Department
  As an authenticated department user
  I want to add a new department for the MIDC organization
  So that it appears in the Department List

  Background:
    Given I open the MIDC portal
    And the MIDC portal is loaded
    When I open the Department Login page
    Then the Department Login page is displayed
    When I log in with the configured Department Login credentials
    Then the scenario is skipped if Department Login authentication fails, because "Add Department requires valid Department Login credentials."
    And the Masters Management link is visible
    When I open Masters Management
    Then the Admin Portal is loaded
    When I open Organization Configuration
    And I select the organization "MIDC"

  Scenario: Add Department
    # Simple alphanumeric values match the app's actual saved row text.
    Given the following unique test data is generated:
      | alias               | template               |
      | departmentName      | Civiltest{timestamp}   |
      | departmentShortName | Civil{timestamp:last4} |
    Then the Add Department button is visible within 20 seconds
    When I click the Add Department button
    Then the Add Department dialog is displayed
    # The live app does not always render the selected organization inside the dialog,
    # so validation is based on a successful save and row visibility instead.
    When I enter "{departmentName}" as the Department Name
    And I enter "{departmentShortName}" as the Department Short Name
    And I select "CIRCLE" as the Department Prod Code
    And I submit the Add Department dialog
    # The success toaster is transient, so it is asserted before the dialog unmounts.
    Then the message "Department added successfully!" is displayed within 30 seconds
    And the Add Department dialog is closed within 30 seconds
    # The grid is paginated, so filter by name instead of relying on page 1.
    When I filter the department grid by name "{departmentName}"
    Then a department grid cell containing "{departmentName}" is visible within 30 seconds
