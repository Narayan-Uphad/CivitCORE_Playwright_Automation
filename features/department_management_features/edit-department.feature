# Source: edit-department.spec.ts  (test.describe 'Edit Department' — 5 tests)
@edit-department
Feature: Edit Department
  As an authenticated department user
  I want to edit an existing department
  So that its name and short name stay correct

  Background:
    Given I open the MIDC portal
    And the MIDC portal is loaded
    When I open the Department Login page
    Then the Department Login page is displayed
    When I log in with the configured Department Login credentials
    Then the scenario is skipped if Department Login authentication fails, because "Edit Department requires valid Department Login credentials."
    And the Masters Management link is visible
    When I open Masters Management
    Then the Admin Portal is loaded
    When I open Organization Configuration
    And I select the organization "MIDC"
    Then the organization is shown as selected

  Scenario: Edit department name and short name
    Given the following unique test data is generated:
      | alias               | template             |
      | departmentName      | EditDept{timestamp}  |
      | departmentShortName | Edt{timestamp:last4} |
    When I add a department named "{departmentName}" with short name "{departmentShortName}" and Prod Code "CIRCLE"
    When I open the Edit dialog for the department "{departmentName}"
    # The app normalises the saved casing, so values are compared case-insensitively.
    Then the Department Name field in the dialog has the value "{departmentName}" ignoring case within 15 seconds
    And the Department Short Name field in the dialog has the value "{departmentShortName}" ignoring case
    Given the following unique test data is generated:
      | alias                      | template               |
      | updatedDepartmentName      | UpdatedDept{timestamp} |
      | updatedDepartmentShortName | Upd{timestamp:last4}   |
    When I enter "{updatedDepartmentName}" as the Department Name
    And I enter "{updatedDepartmentShortName}" as the Department Short Name
    And I click the Update button in the dialog
    Then the department updated success message is displayed within 30 seconds
    And the Edit Department dialog is closed within 30 seconds
    When I filter the department grid by name "{updatedDepartmentName}"
    Then the department grid shows exactly 1 row
    And the first row contains "{updatedDepartmentShortName}" ignoring case
    # The original department name should no longer exist.
    When I filter the department grid by name "{departmentName}"
    Then the department grid shows exactly 0 rows

  Scenario: Edit only the department short name
    Given the following unique test data is generated:
      | alias               | template             |
      | departmentName      | EditShort{timestamp} |
      | departmentShortName | Esh{timestamp:last4} |
    When I add a department named "{departmentName}" with short name "{departmentShortName}" and Prod Code "CIRCLE"
    When I open the Edit dialog for the department "{departmentName}"
    Given the following unique test data is generated:
      | alias            | template             |
      | updatedShortName | Nsh{timestamp:last4} |
    When I enter "{updatedShortName}" as the Department Short Name
    And I click the Update button in the dialog
    Then the department updated success message is displayed within 30 seconds
    And the Edit Department dialog is closed within 30 seconds
    When I filter the department grid by name "{departmentName}"
    Then the department grid shows exactly 1 row
    And the first row contains "{updatedShortName}" ignoring case

  Scenario: Edit dialog is prefilled with the selected department values
    Given the following unique test data is generated:
      | alias               | template               |
      | departmentName      | EditPrefill{timestamp} |
      | departmentShortName | Epf{timestamp:last4}   |
    When I add a department named "{departmentName}" with short name "{departmentShortName}" and Prod Code "CIRCLE"
    When I open the Edit dialog for the department "{departmentName}"
    Then the Department Name field in the dialog has the value "{departmentName}" ignoring case within 15 seconds
    And the Department Short Name field in the dialog has the value "{departmentShortName}" ignoring case
    And the Department Prod Code in the dialog has a value

  Scenario: Cancelling the edit dialog keeps the original department values
    Given the following unique test data is generated:
      | alias               | template              |
      | departmentName      | EditCancel{timestamp} |
      | departmentShortName | Ecl{timestamp:last4}  |
      | discardedName       | Discarded{timestamp}  |
    When I add a department named "{departmentName}" with short name "{departmentShortName}" and Prod Code "CIRCLE"
    When I open the Edit dialog for the department "{departmentName}"
    And I enter "{discardedName}" as the Department Name
    And I click Cancel in the dialog
    Then the Edit Department dialog is closed within 30 seconds
    When I filter the department grid by name "{departmentName}"
    Then the department grid shows exactly 1 row
    And the first row contains "{departmentShortName}" ignoring case

  Scenario: Mandatory fields cannot be cleared when editing a department
    Given the following unique test data is generated:
      | alias               | template             |
      | departmentName      | EditReq{timestamp}   |
      | departmentShortName | Erq{timestamp:last4} |
    When I add a department named "{departmentName}" with short name "{departmentShortName}" and Prod Code "CIRCLE"
    When I open the Edit dialog for the department "{departmentName}"
    And I leave the Department Name empty
    And I click the Update button in the dialog
    # The update must not go through while a mandatory field is empty.
    Then the dialog shows "Department Name is required" within 15 seconds
    And the Edit Department dialog is still displayed
    And no department updated success message is shown
