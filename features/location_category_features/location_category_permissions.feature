@location_category @permissions
Feature: Location Category Permissions
  Module   : Permissions
  FRD Ref  : 3, 6.1 BR-3, 6.2, 6.7

  # ---------------------------- FUNCTIONAL ----------------------------

  @TC_CivitCORE_F_0006 @functional @high
  Scenario: Verify full-permission user sees Add, View, Edit and Delete actions
    Given I am logged in as an "Admin" user with Add, View, Edit and Delete permissions
    And the baseline Location Category test data is loaded
    And I am on the Location Category List (Hierarchy) page
    When I observe the toolbar above the list
    And I observe the row actions for any category
    Then the "Add Location Category" action should be visible and enabled
    And the "View", "Edit" and "Delete" actions should be visible on every row

  @TC_CivitCORE_F_0007 @functional @high
  Scenario: Verify view-only user sees only View action
    Given I am logged in as "Viewer_User1" with role "Viewer" having View/Search permission only
    And I am on the Location Category List
    When I observe the toolbar above the list
    And I observe the row actions for a category
    Then the "Add Location Category" action should be hidden or disabled
    And only the "View" action should be displayed
    And the "Edit" and "Delete" actions should not be available

  @TC_CivitCORE_F_0008 @functional @high
  Scenario: Verify user with View+Edit (no Delete) permission sees Edit but not Delete
    Given I am logged in as "Editor_User1" with role "Editor" having View and Edit permissions but no Delete permission
    And I am on the Location Category List
    When I observe the row actions for a category
    And I open the category Detail view and observe the actions
    Then the "View" and "Edit" actions should be displayed
    And the "Delete" action should not be displayed on the list
    And the "Delete" action should not be displayed on the Detail view

  # ----------------------------- NEGATIVE -----------------------------

  @TC_CivitCORE_N_0001 @negative @high
  Scenario: Verify user with no Location Category permission cannot access the module
    # Behaviour inferred from 'authorized user' wording in the FRD
    Given I am logged in as "NoAccess_User1" with role "NoAccess" having no Location Category Management permission
    When I check the left menu for "Location Category Management"
    And I attempt to open the Location Category URL directly
    Then the "Location Category Management" menu entry should not be displayed
    And direct URL access should be denied with an access denied message or redirect
    And no category data should be exposed

  @TC_CivitCORE_N_0002 @negative @api @high
  Scenario: Verify view-only user cannot create a Location Category via API (server-side permission)
    Given "Viewer_User1" with role "Viewer" is authenticated with a valid session token
    When I send a create-category request using the Viewer's token with payload
      """
      {"name":"Substation","shortName":"SUBST"}
      """
    And I check the Location Category Master
    Then the request should be rejected as unauthorized with status 403
    And no category should be created

  @TC_CivitCORE_N_0003 @negative @api @high
  Scenario: Verify user without Delete permission cannot delete a Location Category via API
    Given "Editor_User1" with role "Editor" having View and Edit but no Delete permission is authenticated
    And a deletable category "Zone" exists
    When I send a delete request for "Zone" using the Editor's token
    And I check the Location Category Master
    Then the request should be rejected as unauthorized
    And "Zone" should still exist in the master
