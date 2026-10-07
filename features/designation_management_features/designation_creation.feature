@Designation @CreateDesignation
Feature: Designation Creation
  As a CivitCORE Administrator
  I want to create a new Designation with an Abbreviation, Designation Name and optional Reporting To
  So that it becomes available across CivitCORE with its reporting hierarchy captured
  (FRD Ref: Section 6.2 - Designation Creation)

  Background:
    Given the user is logged in as an "Admin" user
    And the user has navigated to the "Designation Management" screen

  # Note: TC_CivitCORE_F_0011 (List visibility), F_0012 and F_0013 (Employee/Post lookup
  # availability) are also creation-triggered but are covered under
  # designation_list_search_view.feature and designation_cross_module_consumption.feature
  # respectively, to keep each TC ID mapped to exactly one scenario.

  # ---------------------------------------------------------------
  # Functional (positive) scenarios
  # ---------------------------------------------------------------

  @TC_CivitCORE_F_0006 @Functional @High @Automation
  Scenario: Designation creation form displays all required fields
    When the user clicks "Add" on the Designation List screen
    Then the Designation creation form displays the "Abbreviation", "Designation Name" and "Reporting To" fields
    And "Save" and "Back" buttons are present

  @TC_CivitCORE_F_0007 @Functional @High @Automation @Smoke
  Scenario: Successful creation of a Designation with Abbreviation, Designation Name and Reporting To
    Given a Designation with Designation Name "Director" already exists
    When the user clicks "Add" on the Designation List screen
    And the user enters "CE" in the "Abbreviation" field
    And the user enters "Chief Engineer" in the "Designation Name" field
    And the user selects "Director" from the "Reporting To" dropdown
    And the user clicks "Save"
    Then the Designation is created successfully
    And a unique Designation ID is generated
    And a toaster message "Designation created successfully." is displayed
    And the Designation "CE" - "Chief Engineer" is visible in the Designation List

  @TC_CivitCORE_F_0008 @Functional @High @Automation
  Scenario: A Designation can be created without selecting a Reporting To (top-level)
    When the user clicks "Add" on the Designation List screen
    And the user enters "DIR" in the "Abbreviation" field
    And the user enters "Director" in the "Designation Name" field
    And the user leaves the "Reporting To" field unselected
    And the user clicks "Save"
    Then the Designation is accepted as having no reporting relationship
    And the Designation is saved as a level-1 (top-level) record
    And a toaster message "Designation created successfully." is displayed

  @TC_CivitCORE_F_0014 @Functional @Medium @Automation
  Scenario: Reporting To lookup is populated only from the CivitCORE Designation Master
    When the user clicks "Add" on the Designation List screen
    And the user opens the "Reporting To" dropdown
    Then only Designations existing in the CivitCORE Designation Master are listed
    And no free-text or unrelated values are shown

  @TC_CivitCORE_F_0015 @Functional @Medium @Automation
  Scenario: Abbreviation field accepts letters, numbers, spaces and special characters
    When the user clicks "Add" on the Designation List screen
    And the user enters "Sr Eng-2" in the "Abbreviation" field
    And the user enters "Senior Engineer Grade 2" in the "Designation Name" field
    And the user clicks "Save"
    Then the Designation is created successfully
    And a toaster message "Designation created successfully." is displayed

  @TC_CivitCORE_F_0016 @Functional @Medium @Automation
  Scenario: Designation Name field accepts hyphen, ampersand, period and parentheses
    When the user clicks "Add" on the Designation List screen
    And the user enters "HR&A" in the "Abbreviation" field
    And the user enters "Head - Admin & Accounts (HQ)" in the "Designation Name" field
    And the user clicks "Save"
    Then the Designation is created successfully
    And a toaster message "Designation created successfully." is displayed

  # ---------------------------------------------------------------
  # Negative / validation scenarios
  # ---------------------------------------------------------------

  @TC_CivitCORE_N_0001 @Negative @High @Automation
  Scenario: Block creation when Abbreviation is left blank
    When the user clicks "Add" on the Designation List screen
    And the user leaves the "Abbreviation" field blank
    And the user enters "Quality Engineer" in the "Designation Name" field
    And the user clicks "Save"
    Then the save action is blocked
    And the validation message "Abbreviation is required" is displayed
    And no Designation record is created

  @TC_CivitCORE_N_0002 @Negative @High @Automation
  Scenario: Block creation when Designation Name is left blank
    When the user clicks "Add" on the Designation List screen
    And the user enters "QE" in the "Abbreviation" field
    And the user leaves the "Designation Name" field blank
    And the user clicks "Save"
    Then the save action is blocked
    And the validation message "Designation Name is required" is displayed
    And no Designation record is created

  @TC_CivitCORE_N_0003 @Negative @High @Automation
  Scenario: Duplicate Abbreviation is blocked on a case-insensitive, trimmed basis
    Given a Designation with Abbreviation "CE" already exists in the Designation Master
    When the user clicks "Add" on the Designation List screen
    And the user enters "ce " in the "Abbreviation" field
    And the user enters "Chief Executive" in the "Designation Name" field
    And the user clicks "Save"
    Then the save action is blocked
    And the validation message "A designation with this abbreviation already exists" is displayed

  @TC_CivitCORE_N_0004 @Negative @High @Automation
  Scenario: Duplicate Designation Name is blocked on a case-insensitive basis
    Given a Designation with Designation Name "Chief Engineer" already exists in the Designation Master
    When the user clicks "Add" on the Designation List screen
    And the user enters "CE2" in the "Abbreviation" field
    And the user enters "chief engineer" in the "Designation Name" field
    And the user clicks "Save"
    Then the save action is blocked
    And the validation message "A designation with this name already exists" is displayed

  @TC_CivitCORE_N_0005 @Negative @High @Automation
  Scenario: Leading/trailing spaces are trimmed before the Designation Name uniqueness check
    Given a Designation with Designation Name "Site Engineer" already exists in the Designation Master
    When the user clicks "Add" on the Designation List screen
    And the user enters "SEN" in the "Abbreviation" field
    And the user enters "  Site Engineer  " in the "Designation Name" field
    And the user clicks "Save"
    Then the save action is blocked
    And the validation message "A designation with this name already exists" is displayed

  @TC_CivitCORE_N_0008 @Negative @High @Automation
  Scenario: Non-existent/stale Reporting To reference is rejected at save time
    Given the user has selected a Reporting To value on the Add Designation form
    And the referenced Designation has since been removed from the Designation Master
    When the user enters "FS" in the "Abbreviation" field
    And the user enters "Field Supervisor" in the "Designation Name" field
    And the user clicks "Save"
    Then the save action is blocked
    And the validation message "Selected designation is not available" is displayed

  @TC_CivitCORE_N_0009 @Negative @High @Automation
  Scenario: A Designation cannot select itself as its own Reporting To during creation
    Given a Designation "CE" - "Chief Engineer" already exists
    When the user opens the Add Designation form
    And the user attempts to select "CE" - "Chief Engineer" as its own "Reporting To"
    And the user clicks "Save"
    Then the self-reference selection is blocked

  @TC_CivitCORE_N_0013 @Negative @Medium @Automation
  Scenario: Whitespace-only Abbreviation is treated as invalid
    When the user clicks "Add" on the Designation List screen
    And the user enters "   " in the "Abbreviation" field
    And the user enters "Site Supervisor" in the "Designation Name" field
    And the user clicks "Save"
    Then the whitespace-only value is treated as blank
    And the save action is blocked
    And the validation message "Abbreviation is required" is displayed
    And no Designation record is created

  @TC_CivitCORE_N_0014 @Negative @Medium @Automation
  Scenario: Whitespace-only Designation Name is treated as invalid
    When the user clicks "Add" on the Designation List screen
    And the user enters "SS" in the "Abbreviation" field
    And the user enters "   " in the "Designation Name" field
    And the user clicks "Save"
    Then the whitespace-only value is treated as blank
    And the save action is blocked
    And the validation message "Designation Name is required" is displayed
    And no Designation record is created

  @TC_CivitCORE_N_0016 @Negative @Medium @Automation
  Scenario: Clicking 'Back' without saving discards unsaved entries
    When the user clicks "Add" on the Designation List screen
    And the user enters "DTD" in the "Abbreviation" field
    And the user enters "Discard Test Designation" in the "Designation Name" field
    And the user clicks "Back" without clicking "Save"
    And the user navigates to the Designation List
    And the user searches the Designation List for "Discard Test Designation"
    Then no Designation record is created
    And "Discard Test Designation" does not appear in the Designation List

  @TC_CivitCORE_N_0017 @Negative @Medium @Automation
  Scenario: Consecutive internal spaces in Designation Name are normalized and do not bypass the duplicate check
    Given a Designation with Designation Name "Senior Engineer" already exists
    When the user clicks "Add" on the Designation List screen
    And the user enters "SRE2" in the "Abbreviation" field
    And the user enters "Senior   Engineer" in the "Designation Name" field
    And the user clicks "Save"
    Then the consecutive spaces are normalized to a single space before comparison
    And the save action is blocked
    And the validation message "A designation with this name already exists" is displayed
