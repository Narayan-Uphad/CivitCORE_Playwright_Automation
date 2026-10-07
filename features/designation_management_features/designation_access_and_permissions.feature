@Designation @AccessControl
Feature: Designation Management - Access, Navigation and Permissions
  As a CivitCORE Administrator
  I want a centralized Designation Management screen
  So that I can view, create, update and delete Designations from a single entry point
  (FRD Ref: Section 6.1 - Designation Management Initiation)

  @TC_CivitCORE_F_0001 @Functional @High @Automation @Smoke
  Scenario: Admin user can access the Designation Management menu and lands on Designation List
    Given the user logs in with valid "Admin" credentials
    When the user navigates to "System Configuration" > "Master" > "Designation" from the left menu
    Then the Designation List screen is displayed as the landing view

  @TC_CivitCORE_F_0002 @Functional @High @Automation
  Scenario: Designation List displays with hierarchical structure as the landing view
    Given the user is logged in as an "Admin" user
    And the user has navigated to the "Designation Management" screen
    When the user observes the Designation List
    Then the Designation List is displayed by default
    And parent-child Designations linked via "Reporting To" are shown in a hierarchical (tree/indented) order

  @TC_CivitCORE_F_0003 @Functional @High @Automation
  Scenario: 'Add' action is visible for an authorized (Admin) user
    Given the user is logged in as an "Admin" user with Designation Management create permission
    When the user navigates to the Designation List screen
    Then the "Add" button is visible and enabled

  @TC_CivitCORE_F_0004 @Functional @High @Automation
  Scenario: 'Add' action is not visible/enabled for a Viewer (view-only) user
    Given the user is logged in as a "Viewer" user with only view access to Designation Management
    When the user navigates to the Designation List screen
    Then the "Add" button is not visible or is disabled

  @TC_CivitCORE_F_0005 @Functional @High @Automation
  Scenario: View, Edit and Delete actions are displayed on each Designation row for an Admin user
    Given the user is logged in as an "Admin" user with full Designation Management permission
    And at least one Designation exists in the Designation Master
    When the user navigates to the Designation List and selects a Designation row
    Then "View", "Edit" and "Delete" actions are displayed against the Designation row
    And the state of the "Delete" action reflects the dependency check outcome
