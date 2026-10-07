@Designation @ToasterMessages
Feature: Designation Management Toaster Notifications
  As a CivitCORE user
  I want clear, transient confirmation messages after I create, update or delete a Designation
  So that I know my action completed successfully
  (FRD Ref: Section 8 - Toaster Messages)

  Background:
    Given the user is logged in as an "Admin" user
    And the user has navigated to the "Designation Management" screen

  @TC_CivitCORE_F_0059 @Functional @Medium @Automation @Smoke
  Scenario: Toaster message is displayed after successful Designation creation
    Given the user is on the Add Designation form with valid data entered
    When the user fills all mandatory fields with valid, unique values
    And the user clicks "Save"
    Then a toaster message "Designation created successfully." is displayed
    And the toaster is transient and auto-dismisses

  @TC_CivitCORE_F_0060 @Functional @Medium @Automation @Smoke
  Scenario: Toaster message is displayed after successful Designation update
    Given an existing Designation is open in Edit mode with a valid change made
    When the user updates a field with a valid, unique value
    And the user clicks "Save"
    Then a toaster message "Designation updated successfully." is displayed

  @TC_CivitCORE_F_0061 @Functional @Medium @Automation @Smoke
  Scenario: Toaster message is displayed after successful Designation deletion
    Given a dependency-free Designation is selected for deletion
    When the user clicks "Delete" on the dependency-free Designation
    And the user confirms the deletion
    Then a toaster message "Designation deleted successfully." is displayed
