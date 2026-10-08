@location_category @audit_log
Feature: Location Category Audit / Activity Log
  Module   : Audit Log
  FRD Ref  : 7, US-8

  @TC_CivitCORE_F_0040 @audit @high
  Scenario: Verify Activity Log entry on Location Category creation
    Given I am logged in as "Admin_User1" with role "Admin"
    And the baseline Location Category test data is loaded
    And the Add Location Category form is open
    When I create category "Substation" with Short Name "SUBST"
    And I open the Location Category Activity Log
    Then an entry "Location Category Created" should be added
    And the entry should contain User "Admin_User1", Date/Time, Location Category ID and Name "Substation"

  @TC_CivitCORE_F_0041 @audit @high
  Scenario: Verify Activity Log entry on Name update captures field, previous and new value
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    When I rename "Zone" to "Operations Zone"
    And I open the Activity Log
    Then an entry "Location Category Updated" should be present with User and Date/Time
    And the entry should show Field Changed "Name", Previous Value "Zone" and New Value "Operations Zone"

  @TC_CivitCORE_F_0042 @audit @high
  Scenario: Verify Activity Log entry on Parent Category update
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    When I change the Parent of "Zone" from none to "Country"
    And I open the Activity Log
    Then the entry should show Field Changed "Parent Category", Previous Value none or blank and New Value "Country"
    And the entry should contain User and Date/Time

  @TC_CivitCORE_F_0043 @audit @high
  Scenario: Verify Activity Log entry on successful deletion
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    When I delete "Zone" and confirm
    And I open the Activity Log
    Then an entry "Location Category Deleted" should be present with User, Date/Time, Location Category ID and Name "Zone"
    And the entry should persist although the category no longer exists

  @TC_CivitCORE_F_0044 @audit @high
  Scenario: Verify Deletion Blocked entry with 'Location Dependency' reason
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    When I attempt to delete "Airport" which is tagged to Locations
    And I open the Activity Log
    Then an entry "Location Category Deletion Blocked" should be present
    And the entry should contain User, Date/Time, ID and Name "Airport"
    And the Block Reason should be "Location Dependency"

  @TC_CivitCORE_F_0045 @audit @high
  Scenario: Verify Deletion Blocked entry with 'Hierarchy Dependency' reason
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    When I attempt to delete "State/Territory" which has children
    And I open the Activity Log
    Then an entry "Location Category Deletion Blocked" should be present
    And the entry should contain User, Date/Time, ID and Name "State/Territory"
    And the Block Reason should be "Hierarchy Dependency"

  @TC_CivitCORE_F_0046 @audit @medium
  Scenario: Verify no Activity Log entry is created when creation fails validation
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    And the Add Location Category form is open
    When I attempt to create a category with Name "Airport" and Short Name "AIRP2"
    And I open the Activity Log
    Then no "Created" entry should be added for the failed attempt

  @TC_CivitCORE_F_0047 @audit @high
  Scenario: Verify Activity Log is displayed latest first
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    When I create category "Substation" with Short Name "SUBST"
    And I rename "Substation" to "Substation A"
    And I delete "Substation A"
    And I open the Activity Log
    Then the entries should appear in reverse chronological order "Deleted, Updated, Created"

  @TC_CivitCORE_F_0048 @audit @api @high
  Scenario: Verify Activity Log is read-only
    Given I am logged in as "Auditor_User1" with role "Auditor"
    And the Activity Log has entries
    When I open the Activity Log
    And I look for edit and delete controls on entries
    And I attempt to modify or delete an entry via API
    Then no edit or delete controls should be displayed
    And the API modification or deletion of an entry should be rejected
    And the entries should remain unchanged
