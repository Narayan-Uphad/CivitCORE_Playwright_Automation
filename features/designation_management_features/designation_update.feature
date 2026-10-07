@Designation @UpdateDesignation
Feature: Designation Update
  As a CivitCORE Administrator
  I want to update an existing Designation's Abbreviation, Designation Name, or Reporting To
  So that I can correct or refine data without impacting existing Employee or Post associations
  (FRD Ref: Section 6.4 - Designation Update)

  Background:
    Given the user is logged in as an "Admin" user
    And the user has navigated to the "Designation Management" screen

  # ---------------------------------------------------------------
  # Functional (positive) scenarios
  # ---------------------------------------------------------------

  @TC_CivitCORE_F_0023 @Functional @High @Automation @Smoke
  Scenario: 'Edit' action allows updating Abbreviation, Designation Name and Reporting To
    Given an existing Designation "CE" - "Chief Engineer" is available for editing
    When the user clicks "Edit" on the Designation "CE"
    And the user updates the "Abbreviation" field to "C.ENG"
    And the user updates the "Designation Name" field to "Chief Engineering Officer"
    And the user selects "Managing Director" from the "Reporting To" dropdown
    And the user clicks "Save"
    Then the Designation record is updated successfully
    And a toaster message "Designation updated successfully." is displayed

  @TC_CivitCORE_F_0024 @Functional @High @Automation
  Scenario: Designation ID remains unchanged after an update
    Given an existing Designation record with a known Designation ID
    When the user edits the Designation's Abbreviation, Designation Name or Reporting To
    And the user clicks "Save"
    And the user reopens the Designation in View mode
    Then the Designation ID after update is identical to the Designation ID before update

  @TC_CivitCORE_F_0025 @Functional @Medium @Automation
  Scenario: Successful update is reflected immediately in the Designation List
    Given an existing Designation is being edited
    When the user updates the Designation Name and clicks "Save"
    And the user returns to the Designation List
    Then the Designation List displays the newly updated Designation Name without requiring a page reload

  # ---------------------------------------------------------------
  # Negative / validation scenarios
  # ---------------------------------------------------------------

  @TC_CivitCORE_N_0010 @Negative @High @Automation
  Scenario: A Designation cannot select itself as its own Reporting To during update
    Given a Designation "CE" - "Chief Engineer" exists and is open in Edit mode
    When the user attempts to set "Reporting To" to "CE" - "Chief Engineer" (itself)
    And the user clicks "Save"
    Then the self-reference update is blocked

  @TC_CivitCORE_N_0011 @Negative @High @Automation
  Scenario: Updating a Designation with a Name that duplicates another existing Designation is blocked
    Given a Designation "PM" - "Project Manager" already exists
    And a Designation "SPM" - "Senior Project Manager" is open in Edit mode
    When the user changes the Designation Name of "SPM" to "project manager"
    And the user clicks "Save"
    Then the save action is blocked
    And the validation message "A designation with this name already exists" is displayed
    And "SPM" retains its original Designation Name
