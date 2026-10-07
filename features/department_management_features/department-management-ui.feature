# Source: department-management-ui-test-cases
# This file reflects only the attached Department UI cases and does not add unlisted assumptions.
@department-ui
Feature: Department management UI

  Background:
    Given I open the MIDC portal
    And the MIDC portal is loaded
    When I open the Department Login page
    Then the Department Login page is displayed
    When I log in with the configured Department Login credentials
    Then the scenario is skipped if Department Login authentication fails, because "Department Management requires valid Department Login credentials."
    And the Masters Management link is visible within 30 seconds
    When I open Masters Management
    Then the Admin Portal is loaded
    When I open Organization Configuration
    And I select the organization "MIDC"
    And I open the Department tab within 30 seconds
    Then the "Department Name" column header is visible within 30 seconds

  @TC-001
  Scenario: Department List landing view shows the expected Department columns and Add Department action
    Then the "Department Name" column header is visible
    And the "Short Name" column header is visible
    And the "Dept Code" column header is visible
    And the "Hierarchy" column header is visible
    And an Add Department button is visible

  @TC_N_0001
  Scenario: TC_N_0001: blocks creation when Department Name is left blank
    Given the following unique test data is generated:
      | alias     | template             | max length |
      | shortName | ND{timestamp:last10} | 12         |
    Then the Add Department button is visible within 20 seconds
    When I click the Add Department button
    Then the Add Department dialog is displayed within 20 seconds
    When I leave the Department Name empty
    And I enter "{shortName}" as the Department Short Name
    And I select "CIRCLE" as the Department Prod Code
    And I submit the Add Department dialog
    Then a mandatory field validation message is displayed within 15 seconds
    And the Add Department dialog is still displayed

  @TC_N_0002
  Scenario: TC_N_0002: blocks creation when Short Name is left blank
    Given the following unique test data is generated:
      | alias          | template           |
      | departmentName | NDShort{timestamp} |
    Then the Add Department button is visible within 20 seconds
    When I click the Add Department button
    Then the Add Department dialog is displayed within 20 seconds
    When I enter "{departmentName}" as the Department Name
    And I leave the Department Short Name empty
    And I select "CIRCLE" as the Department Prod Code
    And I submit the Add Department dialog
    Then a mandatory field validation message is displayed within 15 seconds
    And the Add Department dialog is still displayed

  @TC_N_0004
  Scenario: TC_N_0004: blocks duplicate Department Name regardless of case
    Given the following unique test data is generated:
      | alias          | template                 | max length |
      | name           | DuplicateName{timestamp} |            |
      | shortName      | DU{timestamp:last8}      | 10         |
      | duplicateShort | DUP{timestamp:last7}     | 10         |
    And a department named "{name}" with short name "{shortName}" and Prod Code "CIRCLE" has been created successfully
    Then the Add Department button is visible within 20 seconds
    When I click the Add Department button
    Then the Add Department dialog is displayed within 20 seconds
    When I enter "{name:upper}" as the Department Name
    And I enter "{duplicateShort}" as the Department Short Name
    And I select "CIRCLE" as the Department Prod Code
    And I submit the Add Department dialog
    Then a duplicate name validation message is displayed in the dialog within 15 seconds
    And the Add Department dialog is still displayed

  @TC_N_0005
  Scenario: TC_N_0005: blocks duplicate Short Name regardless of case
    Given the following unique test data is generated:
      | alias      | template                      | max length |
      | name       | DuplicateShortName{timestamp} |            |
      | shortName  | DSN{timestamp:last7}          | 10         |
      | secondName | DuplicateShort{timestamp}     |            |
    And a department named "{name}" with short name "{shortName}" and Prod Code "CIRCLE" has been created successfully
    Then the Add Department button is visible within 20 seconds
    When I click the Add Department button
    Then the Add Department dialog is displayed within 20 seconds
    When I enter "{secondName}" as the Department Name
    And I enter "{shortName:lower}" as the Department Short Name
    And I select "CIRCLE" as the Department Prod Code
    And I submit the Add Department dialog
    Then a duplicate short name validation message is displayed within 15 seconds
    And the Add Department dialog is still displayed
