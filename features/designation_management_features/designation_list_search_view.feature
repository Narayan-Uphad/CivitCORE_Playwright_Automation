@Designation @SearchAndView
Feature: Designation List, Search and View
  As a CivitCORE Administrator
  I want to search the Designation List and view a Designation's full details
  So that I can quickly find and review a specific Designation
  (FRD Ref: Section 6.3 - Designation View / Search)

  Background:
    Given the user is logged in as an "Admin" user
    And the user has navigated to the "Designation Management" screen

  @TC_CivitCORE_F_0011 @Functional @High @Automation
  Scenario: Newly created Designation appears immediately in the Designation List
    When the user creates a new Designation with Abbreviation "PM" and Designation Name "Project Manager"
    And the user clicks "Save"
    Then the Designation "PM" - "Project Manager" is visible in the Designation List without a manual refresh

  @TC_CivitCORE_F_0019 @Functional @High @Automation @Smoke
  Scenario: Designation List search by Abbreviation returns correct partial, case-insensitive matches
    Given multiple Designations exist including one with Abbreviation "CE"
    When the user enters "ce" in the Designation List search field
    Then the Designation List filters to show only Designations whose Abbreviation contains "ce" regardless of case

  @TC_CivitCORE_F_0020 @Functional @High @Automation
  Scenario: Designation List search by Designation Name returns correct partial, case-insensitive matches
    Given a Designation named "Chief Engineer" exists
    When the user enters "CHIEF eng" in the Designation List search field
    Then the Designation List filters to show Designations whose name contains "CHIEF eng" regardless of case

  @TC_CivitCORE_F_0021 @Functional @Medium @Automation
  Scenario: Designation List displays the recommended columns
    Given the Designation List has at least one Designation record
    When the user observes the Designation List column headers
    Then the list displays "Designation ID", "Abbreviation", "Designation Name", "Reporting To", "Created By", "Created Date" and "Actions" columns

  @TC_CivitCORE_F_0022 @Functional @High @Automation
  Scenario: 'View' action displays full Designation details
    Given an existing Designation "CE" - "Chief Engineer" with Reporting To "Director" is available
    When the user selects "CE" - "Chief Engineer" in the Designation List
    And the user clicks "View"
    Then the view screen displays Designation ID, Abbreviation "CE", Designation Name "Chief Engineer" and Reporting To "Director" correctly

  @TC_CivitCORE_N_0015 @Negative @Medium @Automation
  Scenario: Searching the Designation List with text that matches no records returns an empty result gracefully
    Given the Designation List contains existing records none of which match the search text
    When the user enters "zzz_no_match" in the Designation List search field
    Then the Designation List displays an empty/no-records state
    And no error message or application crash occurs
