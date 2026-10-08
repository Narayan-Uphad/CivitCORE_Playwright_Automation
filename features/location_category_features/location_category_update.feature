@location_category @update
Feature: Location Category Update
  Module   : Location Category Update
  FRD Ref  : 6.4, US-4

  # ---------------------------- FUNCTIONAL ----------------------------

  @TC_CivitCORE_F_0026 @functional @high
  Scenario: Verify Edit opens form pre-filled with existing values and read-only ID
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    When I click Edit against "Airport" on the List
    Then the form should show existing Name "Airport"
    And the form should show existing Short Name "ARPT"
    And the form should show existing Parent "City"
    And the Location Category ID should be displayed read-only and cannot be changed

  @TC_CivitCORE_F_0027 @functional @high
  Scenario: Verify successful update of Location Category Name with ID unchanged
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    When I edit category "Zone"
    And I note the Location Category ID of "Zone"
    And I change Name to "Operations Zone"
    And I click Save
    Then the record should be updated
    And the toaster "Location Category updated successfully." should be shown
    And the Location Category ID should be unchanged
    And the Short Name should remain "ZONE"

  @TC_CivitCORE_F_0028 @functional @high
  Scenario: Verify successful update of Short Name
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    When I edit category "Zone"
    And I change Short Name to "OPSZ"
    And I click Save
    Then the Short Name should be updated to "OPSZ"
    And the ID and Name should be unchanged
    And the toaster "Location Category updated successfully." should be shown

  @TC_CivitCORE_F_0029 @functional @high
  Scenario: Verify successful update of Parent Category moves the category in the hierarchy
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    When I edit category "Zone" which is at L1
    And I select Parent Category "Country"
    And I click Save
    And I open the hierarchy
    Then "Zone" should be saved with Parent "Country" and displayed under it
    And the ID should be unchanged
    And the toaster "Location Category updated successfully." should be shown

  @TC_CivitCORE_F_0030 @functional @medium
  Scenario: Verify removing the Parent Category makes the category top-level (L1)
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    When I edit category "Assembly Constituency" whose parent is "State/Territory"
    And I clear the Parent Category
    And I click Save
    Then the category should be saved without a parent
    And "Assembly Constituency" should be displayed at the top level (L1)
    And the ID should be unchanged

  @TC_CivitCORE_F_0031 @functional @medium
  Scenario: Verify Save without changes does not raise a duplicate error against itself
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    When I edit category "Airport"
    And I do not change any field
    And I click Save
    Then the Save should succeed or the form should close without change
    And no "Location Category Name already exists" error should be raised for the record's own values
    And no "Short Name already exists" error should be raised for the record's own values

  @TC_CivitCORE_F_0032 @functional @medium
  Scenario: Verify updating a parent keeps its child categories nested under it
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    When I edit "State/Territory" and change its Parent from "Country" to "Zone"
    And I expand the hierarchy
    Then "State/Territory" should move under "Zone" along with its children "District" and "Assembly Constituency"
    And the child Parent IDs should be unchanged

  # ----------------------------- NEGATIVE -----------------------------

  @TC_CivitCORE_N_0018 @negative @high
  Scenario: Verify update to a duplicate Name is blocked
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    When I edit category "Zone"
    And I change Name to "Airport"
    And I click Save
    Then the update should be prevented
    And the message "Location Category Name already exists" should be displayed
    And "Zone" should keep its original Name

  @TC_CivitCORE_N_0019 @negative @high
  Scenario: Verify update to a duplicate Short Name is blocked
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    When I edit category "Zone"
    And I change Short Name to "DIST"
    And I click Save
    Then the update should be prevented
    And the message "Short Name already exists" should be displayed
    And "Zone" should keep its original Short Name

  @TC_CivitCORE_N_0020 @negative @high
  Scenario: Verify update is blocked when Name is cleared
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    When I edit category "Zone"
    And I clear the Name field
    And I click Save
    Then the update should be prevented
    And the message "Location Category Name is required" should be displayed

  @TC_CivitCORE_N_0021 @negative @high
  Scenario: Verify a category cannot be set as its own Parent
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    When I edit category "District"
    And I attempt to select "District" as its own Parent Category via dropdown or tampered request
    And I click Save
    Then the self-reference should be blocked, either the option is unavailable or Save is rejected with "Invalid Parent Category"
    And the Parent of "District" should remain "State/Territory"

  @TC_CivitCORE_N_0022 @negative @high
  Scenario: Verify direct circular hierarchy is blocked (Parent <-> Child)
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    When I edit category "State/Territory" which is the parent of "District"
    And I set Parent Category to "District"
    And I click Save
    Then the circular hierarchy should be blocked
    And the update should not be saved
    And the hierarchy should remain "Country > State/Territory > District"

  @TC_CivitCORE_N_0023 @negative @api @high
  Scenario: Verify Location Category ID cannot be changed via a tampered update request
    Given I am authenticated as an "Admin" user
    And an API/request tool is available
    When I submit an update for "Zone" including a different id in the payload
      """
      {"id":"LC-HACK-777","name":"Operations Zone"}
      """
    And I re-read the record
    Then the ID change should be rejected or ignored
    And the record should keep its original system-generated ID
