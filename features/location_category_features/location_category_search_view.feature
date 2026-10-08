@location_category @search_view
Feature: Location Category Search / View
  Module   : Location Category Search/View
  FRD Ref  : 4, 6.1, 6.3, US-3

  # ---------------------------- FUNCTIONAL ----------------------------

  @TC_CivitCORE_F_0009 @functional @high
  Scenario: Verify search by Location Category Name
    Given I am logged in as an "Admin" user with Add, View, Edit and Delete permissions
    And the baseline Location Category test data is loaded
    And I am on the Location Category List (Hierarchy) page
    When I enter "Airport" in the search box
    And I click Search or press Enter
    Then the matching category "Airport" with Short Name "ARPT" should be displayed in the results

  @TC_CivitCORE_F_0010 @functional @high
  Scenario: Verify search by Short Name
    Given I am logged in as an "Admin" user with Add, View, Edit and Delete permissions
    And the baseline Location Category test data is loaded
    And I am on the Location Category List (Hierarchy) page
    When I enter "DIST" in the search box
    And I click Search or press Enter
    Then the matching category "District" should be displayed in the results

  @TC_CivitCORE_F_0011 @functional @high
  Scenario: Verify search by Location Category ID
    Given I am logged in as an "Admin" user with Add, View, Edit and Delete permissions
    And the baseline Location Category test data is loaded
    And I am on the Location Category List (Hierarchy) page
    When I copy the Location Category ID of "City" from its Detail view
    And I paste the ID in the search box and search
    Then exactly the category with that ID, "City", should be displayed

  @TC_CivitCORE_F_0012 @functional @high
  Scenario: Verify search by Parent Category
    Given I am logged in as an "Admin" user with Add, View, Edit and Delete permissions
    And the baseline Location Category test data is loaded
    And I am on the Location Category List (Hierarchy) page
    When I enter "State/Territory" in the search box
    And I click Search or press Enter
    Then the categories whose Parent Category is "State/Territory" should be displayed
    And the results should contain "District" and "Assembly Constituency"

  @TC_CivitCORE_F_0013 @functional @medium
  Scenario: Verify search is case-insensitive
    # Assumption per test case: search is case-insensitive, consistent with duplicate validation; confirm in UAT
    Given I am logged in as an "Admin" user with Add, View, Edit and Delete permissions
    And the baseline Location Category test data is loaded
    And I am on the Location Category List (Hierarchy) page
    When I enter "aIrPoRt" in the search box
    And I click Search
    Then "Airport" should be returned in the results

  @TC_CivitCORE_F_0014 @functional @high
  Scenario: Verify Detail view displays ID, Name, Short Name and Parent Category
    Given I am logged in as an "Admin" user with Add, View, Edit and Delete permissions
    And the baseline Location Category test data is loaded
    And I am on the Location Category List (Hierarchy) page
    When I select the category "Airport" from the list using the View action
    Then the Detail view should display the system-generated Location Category ID
    And the Detail view should display Location Category Name "Airport"
    And the Detail view should display Short Name "ARPT"
    And the Detail view should display Parent Category "City"

  @TC_CivitCORE_F_0015 @functional @medium
  Scenario: Verify Detail view of a top-level category shows an empty Parent Category
    Given I am logged in as an "Admin" user with Add, View, Edit and Delete permissions
    And the baseline Location Category test data is loaded
    And I am on the Location Category List (Hierarchy) page
    When I select "Country" from the list
    Then the Parent Category should be shown as blank or None
    And the Location Category ID should be displayed
    And the Location Category Name "Country" should be displayed
    And the Short Name "CTRY" should be displayed

  @TC_CivitCORE_F_0016 @functional @medium
  Scenario: Verify user can navigate back from Detail view to the List
    Given I am logged in as an "Admin" user with Add, View, Edit and Delete permissions
    And the baseline Location Category test data is loaded
    And I am on the Location Category List (Hierarchy) page
    When I open the Detail view of "Zone"
    And I click Back or Close
    Then I should be returned to the Location Category List

  @TC_CivitCORE_F_0017 @functional @medium
  Scenario: Verify Edit and Delete actions are not shown on Detail view for a view-only user
    Given I am logged in as "Viewer_User1" with role "Viewer" having View only permission
    When I open the Detail view of "Zone"
    And I observe the available actions
    Then the "Edit" and "Delete" actions should not be displayed
    And the Detail fields should be viewable

  # ----------------------------- NEGATIVE -----------------------------

  @TC_CivitCORE_N_0004 @negative @medium
  Scenario: Verify search with no matching records
    Given I am logged in as an "Admin" user with Add, View, Edit and Delete permissions
    And the baseline Location Category test data is loaded
    And I am on the Location Category List (Hierarchy) page
    When I enter "ZZZ-NoMatch-999" in the search box
    And I click Search
    Then no records should be displayed
    And no error or exception should occur
    And an empty result indication should be shown
