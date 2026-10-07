@Designation @UIVisual
Feature: Designation Management - UI / Visual Checks
  As a CivitCORE user
  I want the Designation form and dialogs to present clear, consistent controls and messaging
  So that I can operate Designation Management confidently and without ambiguity
  (FRD Ref: Sections 6.2, 6.7, 9 - Reference Screens)

  Background:
    Given the user is logged in as an "Admin" user
    And the user has navigated to the "Designation Management" screen

  @TC_CivitCORE_U_0006 @UI_Visual @Low @Automation
  Scenario: 'Save' and 'Close' buttons are visible and correctly labeled on the Designation form
    When the user opens the Add Designation form
    Then the "Save" and "Close" buttons are visible and clearly labeled
    And the buttons are enabled or disabled appropriately based on form state

  @TC_CivitCORE_U_0009 @UI_Visual @Medium @Automation
  Scenario: Inline validation messages appear directly near the corresponding field
    Given the user is on the Add Designation form
    When the user leaves the "Abbreviation" field blank
    And the user clicks "Save"
    Then the validation message "Abbreviation is required" appears inline, close to the "Abbreviation" field

  @TC_CivitCORE_U_0012 @UI_Visual @Medium @Automation
  Scenario: Delete confirmation dialog UI displays a clear message with Confirm and Cancel options
    Given a dependency-free Designation's Delete action is triggered
    When the user clicks "Delete" on a Designation with no dependency
    Then the confirmation dialog clearly states the delete action
    And the dialog displays distinctly labeled "Confirm"/"Yes" and "Cancel"/"No" buttons
