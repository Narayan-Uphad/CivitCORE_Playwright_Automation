# Source: department-login-navigation.spec.ts  (test.describe 'Department Login' — 3 tests)
@department-login
Feature: Department Login
  As a department user
  I want to reach the MIDC Department Login page
  So that I can sign in to the Smart Governance Portal

  Scenario: TC01 - Verify MIDC portal loads
    Given I open the MIDC portal
    Then the MIDC portal URL is loaded
    And the MIDC portal is loaded

  Scenario: TC02 - Open Department Login page
    Given I open the MIDC portal
    And the MIDC portal is loaded
    When I open the Department Login page
    Then the Department Login page is displayed

  # The original test only submits the form; it makes no assertion after login.
  Scenario: TC03 - Submit Department Login credentials
    Given I open the MIDC portal
    When I open the Department Login page
    Then the Department Login page is displayed
    When I log in with the configured Department Login credentials
