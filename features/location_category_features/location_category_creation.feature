@location_category @creation
Feature: Location Category Creation
  Module   : Location Category Creation
  FRD Ref  : 6.2, US-2

  # ---------------------------- FUNCTIONAL ----------------------------

  @TC_CivitCORE_F_0018 @functional @high
  Scenario: Verify Add Location Category opens the creation form with the expected fields
    Given I am logged in as an "Admin" user with Add, View, Edit and Delete permissions
    And the baseline Location Category test data is loaded
    And I am on the Location Category List (Hierarchy) page
    When I click "Add Location Category"
    Then the creation form should be displayed with "Location Category Name", "Short Name" and "Parent Category" dropdown fields
    And the Location Category ID should not be available for user input

  @TC_CivitCORE_F_0019 @functional @high
  Scenario: Verify successful creation with Name, Short Name and Parent Category
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    And the Add Location Category form is open
    When I enter Location Category Name "Substation"
    And I enter Short Name "SUBST"
    And I select Parent Category "District" from the dropdown
    And I click Save
    Then the category should be created and a unique Location Category ID should be generated
    And the toaster "Location Category created successfully." should be shown
    And the category should be stored in the Master with Parent Category "District" stored by Parent ID

  @TC_CivitCORE_F_0020 @functional @high
  Scenario: Verify creation without Parent Category creates a top-level (L1) category
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    And the Add Location Category form is open
    When I enter Location Category Name "Railway Station"
    And I enter Short Name "RLYST"
    And I leave Parent Category unselected
    And I click Save
    Then the category should be created successfully without a Parent Category
    And the category should be displayed at the top level (L1) of the hierarchy

  @TC_CivitCORE_F_0021 @functional @high
  Scenario: Verify unique Location Category IDs are generated for successive creations
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    And the Add Location Category form is open
    When I create category "Substation" with Short Name "SUBST"
    And I create category "Control Room" with Short Name "CTRL"
    And I compare the generated IDs
    Then two different system-generated IDs should be assigned
    And neither ID should duplicate an existing category ID

  @TC_CivitCORE_F_0022 @functional @medium
  Scenario: Verify Name accepts all allowed special characters (- & / ( ) .)
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    And the Add Location Category form is open
    When I enter Location Category Name "North Zone-A & B/C (Phase 1.2)"
    And I enter Short Name "NZ-AB"
    And I click Save
    Then the category should be created
    And the Name should be stored exactly as "North Zone-A & B/C (Phase 1.2)"

  @TC_CivitCORE_F_0023 @functional @medium
  Scenario: Verify Short Name accepts all allowed special characters (- & .)
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    And the Add Location Category form is open
    When I enter Location Category Name "Warehouse Block"
    And I enter Short Name "WH-A & B.1"
    And I click Save
    Then the category should be created
    And the Short Name should be stored exactly as "WH-A & B.1"

  @TC_CivitCORE_F_0024 @functional @medium
  Scenario: Verify leading and trailing spaces are trimmed from Name and Short Name
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    And the Add Location Category form is open
    When I enter Location Category Name "   Substation   "
    And I enter Short Name "  SUBST  "
    And I click Save
    And I open the saved category's Detail view
    Then the category should be created
    And the saved Name should be "Substation"
    And the saved Short Name should be "SUBST"

  @TC_CivitCORE_F_0025 @functional @high
  Scenario: Verify Parent Category dropdown lists only valid existing categories
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    And the Add Location Category form is open
    When I open the Parent Category dropdown
    And I compare the options with the master "Country, State/Territory, District, City, Airport, Assembly Constituency, Zone, Depot"
    Then the dropdown should contain exactly the 8 existing valid categories
    And no invalid or deleted values should be present
    And no free-text value should be enterable

  # ----------------------------- NEGATIVE -----------------------------

  @TC_CivitCORE_N_0005 @negative @high
  Scenario: Verify creation is blocked when Location Category Name is blank
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    And the Add Location Category form is open
    When I leave Location Category Name blank
    And I enter Short Name "SUBST"
    And I click Save
    Then Save should be prevented
    And the message "Location Category Name is required" should be displayed
    And no category should be created and no ID should be generated

  @TC_CivitCORE_N_0006 @negative @high
  Scenario: Verify creation is blocked when Short Name is blank
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    And the Add Location Category form is open
    When I enter Location Category Name "Substation"
    And I leave Short Name blank
    And I click Save
    Then Save should be prevented
    And the message "Short Name is required" should be displayed
    And no category should be created

  @TC_CivitCORE_N_0007 @negative @high
  Scenario: Verify duplicate Name (exact match) is blocked on creation
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    And the Add Location Category form is open
    When I enter Location Category Name "Airport"
    And I enter Short Name "AIRP2"
    And I click Save
    Then Save should be prevented
    And the message "Location Category Name already exists" should be displayed
    And no new category should be created

  @TC_CivitCORE_N_0008 @negative @high
  Scenario: Verify duplicate Name is blocked case-insensitively
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    And the Add Location Category form is open
    When I enter Location Category Name "AIRPORT"
    And I enter Short Name "AIRP2"
    And I click Save
    Then Save should be prevented
    And the message "Location Category Name already exists" should be displayed

  @TC_CivitCORE_N_0009 @negative @high
  Scenario: Verify duplicate Short Name (exact match) is blocked on creation
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    And the Add Location Category form is open
    When I enter Location Category Name "Substation"
    And I enter Short Name "ARPT"
    And I click Save
    Then Save should be prevented
    And the message "Short Name already exists" should be displayed
    And no category should be created

  @TC_CivitCORE_N_0010 @negative @high
  Scenario: Verify duplicate Short Name is blocked case-insensitively
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    And the Add Location Category form is open
    When I enter Location Category Name "Substation"
    And I enter Short Name "arpt"
    And I click Save
    Then Save should be prevented
    And the message "Short Name already exists" should be displayed

  @TC_CivitCORE_N_0011 @negative @high
  Scenario: Verify Name uniqueness applies across the whole master, not only within one parent
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    And the Add Location Category form is open
    When I enter Location Category Name "City"
    And I select Parent Category "Zone"
    And I enter Short Name "CITY2"
    And I click Save
    Then Save should be prevented
    And the message "Location Category Name already exists" should be displayed

  @TC_CivitCORE_N_0012 @negative @medium
  Scenario: Verify Name rejects characters outside the allowed set
    # Error text not defined in FRD - confirm in UAT
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    And the Add Location Category form is open
    When I enter Location Category Name "Zone@North#1!"
    And I enter Short Name "ZN1"
    And I click Save
    Then Save should be prevented with a validation error for invalid characters
    And no category should be created

  @TC_CivitCORE_N_0013 @negative @medium
  Scenario: Verify Short Name rejects '/' (allowed in Name but not in Short Name)
    # Error text not defined in FRD
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    And the Add Location Category form is open
    When I enter Location Category Name "Substation"
    And I enter Short Name "SUB/ST"
    And I click Save
    Then Save should be prevented with a validation error
    And no category should be created

  @TC_CivitCORE_N_0014 @negative @api @high
  Scenario: Verify non-existent Parent Category is rejected
    Given I am authenticated as an "Admin" user
    And an API/request tool is available to submit a tampered payload
    When I submit a create request with a Parent Category ID that does not exist in the master
      """
      {"name":"Substation","shortName":"SUBST","parentId":"LC-INVALID-9999"}
      """
    And I check the master
    Then the request should be rejected with "Invalid Parent Category"
    And no category should be created

  @TC_CivitCORE_N_0015 @negative @medium
  Scenario: Verify Parent Category cannot be typed as free text (dropdown only)
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    And the Add Location Category form is open
    When I click into the Parent Category field
    And I type "Made Up Parent" and attempt to save
    Then only values from the dropdown should be selectable
    And the free-text value should not be accepted
    And the free-text value should not be saved

  @TC_CivitCORE_N_0016 @negative @api @high
  Scenario: Verify manually supplied Location Category ID is ignored/rejected on creation
    Given I am authenticated as an "Admin" user
    And an API/request tool is available
    When I submit a create request including a custom id
      """
      {"id":"LC-CUSTOM-001","name":"Substation","shortName":"SUBST"}
      """
    And I read the created record, if any
    Then either the request should be rejected, or the custom ID should be ignored and the system should generate its own ID
    And the ID "LC-CUSTOM-001" should never be persisted

  @TC_CivitCORE_N_0017 @negative @medium
  Scenario: Verify Cancel/Close on Add form discards entered data
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    And the Add Location Category form is open
    When I enter Location Category Name "Substation"
    And I enter Short Name "SUBST"
    And I click Close or Cancel without saving
    And I check the List
    Then the form should close
    And no category should be created
    And no toaster should be shown
    And no Activity Log entry should be created
