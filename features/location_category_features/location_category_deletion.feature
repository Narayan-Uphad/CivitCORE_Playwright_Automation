@location_category @deletion
Feature: Location Category Deletion
  Module   : Location Category Deletion
  FRD Ref  : 6.5, 6.7, US-5, US-6, US-7

  # ---------------------------- FUNCTIONAL ----------------------------

  @TC_CivitCORE_F_0036 @functional @high
  Scenario: Verify confirmation prompt is shown for a category with no Locations and no children
    Given I am logged in as an "Admin" user
    And "Zone" has no Locations and no children
    When I click Delete against "Zone"
    Then the confirmation prompt "Are you sure you want to delete this Location Category?" should be displayed

  @TC_CivitCORE_F_0037 @functional @high
  Scenario: Verify confirming deletion removes the category permanently
    Given I am logged in as an "Admin" user
    And "Zone" has no Locations and no children
    When I click Delete against "Zone"
    And I click Yes or Confirm on the prompt
    And I search for "Zone" and check the master via DB/API
    Then the toaster "Location Category deleted successfully." should be displayed
    And "Zone" should be removed from the List
    And "Zone" should be permanently removed from the Master (hard delete)

  @TC_CivitCORE_F_0038 @functional @high
  Scenario: Verify deletion becomes allowed after removing the last Location association
    Given I am logged in as an "Admin" user
    And "Depot" is tagged only to "Pune Depot"
    When I attempt to delete "Depot"
    Then the deletion should be blocked with "Location Category cannot be deleted because it is associated with one or more Locations."
    When I change the category of "Pune Depot" to "Zone"
    And I attempt to delete "Depot" again and confirm
    Then the confirmation should be shown
    And the deletion should succeed with "Location Category deleted successfully."

  @TC_CivitCORE_F_0039 @functional @high
  Scenario: Verify parent can be deleted after its last child is deleted
    Given I am logged in as an "Admin" user
    And parent "Zone" has exactly one new leaf child "Substation" created for this test
    And neither "Zone" nor "Substation" has Locations
    When I attempt to delete "Zone"
    Then the deletion should be blocked with "Location Category cannot be deleted because it has one or more child Location Categories."
    When I delete child "Substation" and confirm
    Then the child deletion should succeed
    When I delete "Zone" and confirm
    Then the parent deletion should succeed with "Location Category deleted successfully."

  # ----------------------------- NEGATIVE -----------------------------

  @TC_CivitCORE_N_0026 @negative @high
  Scenario: Verify deletion is blocked for a category tagged to Locations - from List
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    And "Airport" has no children and is tagged to 2 Locations
    When I click Delete against "Airport" on the List
    Then the deletion should be blocked
    And the final confirmation prompt should not be displayed
    And the message "Location Category cannot be deleted because it is associated with one or more Locations." should be displayed
    And "Airport" should still exist in the master

  @TC_CivitCORE_N_0027 @negative @high
  Scenario: Verify deletion is blocked for a category tagged to Locations - from Detail view
    Given I am logged in as an "Admin" user
    And the Detail view of "Airport" is open
    When I click Delete on the Detail view
    Then no confirmation prompt should be displayed
    And the message "Location Category cannot be deleted because it is associated with one or more Locations." should be displayed
    And "Airport" should remain in the master

  @TC_CivitCORE_N_0028 @negative @high
  Scenario: Verify deletion is blocked when category has child categories - from List
    Given I am logged in as an "Admin" user
    And "State/Territory" has children "District" and "Assembly Constituency" and no Locations
    When I click Delete against "State/Territory" on the List
    Then the deletion should be blocked
    And the final confirmation prompt should not be displayed
    And the message "Location Category cannot be deleted because it has one or more child Location Categories." should be displayed
    And "State/Territory" and its children should remain

  @TC_CivitCORE_N_0029 @negative @medium
  Scenario: Verify Location dependency takes precedence when category has both Locations and children
    Given I am logged in as an "Admin" user
    And "City" has child "Airport" and is tagged to Location "Nashik City Office"
    When I click Delete against "City"
    Then the deletion should be blocked with the Location message "Location Category cannot be deleted because it is associated with one or more Locations."
    And no confirmation prompt should be displayed

  @TC_CivitCORE_N_0030 @negative @high
  Scenario: Verify Cancel on the delete confirmation keeps the category
    Given I am logged in as an "Admin" user
    And "Zone" has no Locations and no children
    When I click Delete against "Zone"
    And I click No or Cancel on the confirmation prompt
    And I check the List
    Then the prompt should close
    And "Zone" should not be deleted
    And no success toaster should be shown
    And no "deleted" Activity Log entry should be created

  @TC_CivitCORE_N_0031 @negative @api @high
  Scenario: Verify deletion is blocked server-side when the UI is bypassed - Location dependency
    Given I am authenticated as an "Admin" user
    And an API/request tool is available
    When I send a direct delete request for "Airport" which is tagged to Locations
    And I check the master
    Then the request should be rejected with the Location-dependency reason "Location Category cannot be deleted because it is associated with one or more Locations."
    And "Airport" should still exist
    And a "Deletion Blocked" entry should be logged
