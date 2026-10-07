# Source: search-department.spec.ts  (test.describe 'Search Department' — 6 tests)
@search-department
Feature: Search Department
  As an authenticated department user
  I want to search the Department List using its column filters
  So that I can find a department quickly

  Background:
    Given I open the MIDC portal
    And the MIDC portal is loaded
    When I open the Department Login page
    Then the Department Login page is displayed
    When I log in with the configured Department Login credentials
    Then the scenario is skipped if Department Login authentication fails, because "Search Department requires valid Department Login credentials."
    And the Masters Management link is visible
    When I open Masters Management
    Then the Admin Portal is loaded
    When I open Organization Configuration
    And I select the organization "MIDC"
    Then the organization is shown as selected

  Scenario: Search department by department name
    Then the "Department Name" column filter is visible within 20 seconds
    When I filter the department grid by "Department Name" with "Building"
    Then a department row containing "Building Permission" is visible within 20 seconds
    And the department row containing "Building Permission" also contains "BLD"

  Scenario: Search department by short name
    Then the "Short Name" column filter is visible within 20 seconds
    When I filter the department grid by "Short Name" with "BLD"
    Then a department row containing "BLD" is visible within 20 seconds
    And the department row containing "BLD" also contains "Building Permission"

  Scenario: Search department by dept code
    Then the "Dept Code" column filter is visible within 20 seconds
    When I filter the department grid by "Dept Code" with "033"
    Then a department row containing "Building Permission" is visible within 20 seconds
    And the department row containing "Building Permission" also contains "033"

  Scenario: Search is case-insensitive
    Then the "Department Name" column filter is visible within 20 seconds
    When I filter the department grid by "Department Name" with "building permission"
    Then a department row containing "Building Permission" is visible within 20 seconds

  Scenario: Search with a non-existing department shows no rows
    Given the following unique test data is generated:
      | alias       | template              |
      | missingDept | NoSuchDept{timestamp} |
    Then the "Department Name" column filter is visible within 20 seconds
    When I filter the department grid by "Department Name" with "{missingDept}"
    Then the department grid shows exactly 0 rows
    And the message "No Rows To Show" is displayed within 20 seconds

  Scenario: Clearing the search filter restores the full department list
    Then the "Department Name" column filter is visible within 20 seconds
    When I filter the department grid by "Department Name" with "Building"
    Then the department grid shows exactly 1 row
    When I clear the "Department Name" column filter
    Then the department grid shows more than 0 rows
    And the "Department Name" column filter is empty
