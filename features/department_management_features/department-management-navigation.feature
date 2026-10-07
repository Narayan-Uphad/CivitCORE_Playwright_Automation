# Source: department-management-navigation.spec.ts  (test.describe 'Department Management' — 2 tests)
@department-navigation
Feature: Department Management - navigation and search
  As an authorized department user
  I want to land on the Department List and search it
  So that I can find departments quickly

  Background:
    Given I open the MIDC portal
    And the MIDC portal is loaded
    When I open the Department Login page
    Then the Department Login page is displayed
    When I log in with the configured Department Login credentials
    Then the scenario is skipped if Department Login authentication fails, because "Department Management requires valid Department Login credentials."
    And the Masters Management link is visible
    When I open Masters Management
    Then the Admin Portal is loaded
    When I open Organization Configuration
    And I select the organization "MIDC"

  Scenario: Authorized user lands on Department List on navigating to Department Management
    When I open the Department tab within 20 seconds
    Then the department tree grid is visible within 20 seconds
    And an Add Department button is visible within 20 seconds
    And the column header exactly named "Department Name" is visible within 20 seconds
    And the column header exactly named "Hierarchy" is visible within 20 seconds
    And the page contains text matching "Department Name|Hierarchy" within 20 seconds

  Scenario: Search department by name from Department List
    # The original spec searched for the seeded departments "Civildemo"/"Civildemo1", which no longer
    # exist in this environment. The scenario now creates the department it searches for, so the
    # search behaviour is verified without depending on pre-existing data.
    When I open the Department tab within 20 seconds
    Given the following unique test data is generated:
      | alias               | template                |
      | searchName          | SearchDept{timestamp}   |
      | searchShortName     | Sd{timestamp:last4}     |
    When I add a department named "{searchName}" with short name "{searchShortName}" and Prod Code "CIRCLE"
    Then the department name filter is visible within 20 seconds
    When I click the department name filter
    And I type "{searchName}" in the department name filter
    Then a department grid cell containing "{searchName}" is visible within 20 seconds
    When I click the department row named "{searchName}"
