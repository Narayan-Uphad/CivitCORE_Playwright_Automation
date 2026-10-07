@logout
Feature: Department Logout
  As an authenticated department user
  I want to log out of the MIDC Smart Governance Portal
  So that my session cannot be reused on a shared machine

  # TC_LOGOUT_01..05 each end the session, so they only work when every scenario owns its own
  # browser context. They are tagged @isolated-session and are filtered out of the ordered
  # `sequential` run, where the single shared session must be logged out exactly once
  # (TC_LOGOUT_FINAL) after all other feature files have finished.

  Background:
    Given I open the MIDC portal
    And the MIDC portal is loaded
    When I open the Department Login page
    Then the Department Login page is displayed
    When I log in with the configured Department Login credentials
    Then the scenario is skipped if Department Login authentication fails, because "Logout requires valid Department Login credentials."
    And the Masters Management link is visible

  @isolated-session
  Scenario: TC_LOGOUT_01 - Logout option is available from the user profile menu
    When I open the user profile menu
    Then the Logout option is visible within 15 seconds

  @isolated-session
  Scenario: TC_LOGOUT_02 - Logout from the landing page returns the user to Department Login
    When I open the user profile menu
    And I click Logout
    Then I am logged out and returned to the signed-out portal within 30 seconds
    And the Masters Management link is no longer visible

  @isolated-session
  Scenario: TC_LOGOUT_03 - Logout from Admin Portal ends the session
    When I open Masters Management
    Then the Admin Portal is loaded
    When I log out of the portal
    Then I am logged out and returned to the signed-out portal within 30 seconds

  @isolated-session
  Scenario: TC_LOGOUT_04 - Browser back after logout does not restore the session
    When I log out of the portal
    Then I am logged out and returned to the signed-out portal within 30 seconds
    When I navigate back in the browser
    Then the session is not restored

  @isolated-session
  Scenario: TC_LOGOUT_05 - Reopening the portal after logout requires signing in again
    When I log out of the portal
    Then I am logged out and returned to the signed-out portal within 30 seconds
    And reopening the MIDC portal does not restore the session
    When I open the Department Login page
    Then the Department Login page is displayed

  # Last scenario of the ordered `sequential` run: closes the one session the whole suite shared.
  @shared-session
  Scenario: TC_LOGOUT_FINAL - Log out of the shared session once every feature has run
    When I log out of the portal
    Then I am logged out and returned to the signed-out portal within 30 seconds
    And the Masters Management link is no longer visible
