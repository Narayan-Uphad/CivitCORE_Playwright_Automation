# Source: masters-management-navigation.spec.ts  (test.describe 'Masters Management' — 2 tests)
# Note: no Background is used here on purpose. Gherkin does not apply a Background to a
# scenario that has no steps of its own, and the first test consists only of the shared login flow.
@masters-management
Feature: Masters Management
  As an authenticated department user
  I want to open Masters Management and Organization Configuration
  So that I can manage organization master data

  Scenario: Open Masters Management after Department Login
    Given I open the MIDC portal
    And the MIDC portal is loaded
    When I open the Department Login page
    Then the Department Login page is displayed
    When I log in with the configured Department Login credentials
    Then the scenario is skipped if Department Login authentication fails, because "Masters Management requires valid Department Login credentials."
    And the Masters Management link is visible
    When I open Masters Management
    Then the Admin Portal is loaded

  Scenario: Select MIDC from Organization Configuration dropdown
    Given I open the MIDC portal
    And the MIDC portal is loaded
    When I open the Department Login page
    Then the Department Login page is displayed
    When I log in with the configured Department Login credentials
    Then the scenario is skipped if Department Login authentication fails, because "Masters Management requires valid Department Login credentials."
    And the Masters Management link is visible
    When I open Masters Management
    Then the Admin Portal is loaded
    When I open Organization Configuration
    And I select the organization "MIDC"
    Then the organization is shown as selected
