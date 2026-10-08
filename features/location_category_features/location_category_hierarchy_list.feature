@location_category @hierarchy_list
Feature: Location Category Hierarchy (List)
  Module   : Location Category Hierarchy (List)
  FRD Ref  : 6.1

  @TC_CivitCORE_F_0001 @functional @high
  Scenario: Verify Location Category List (Hierarchy) page loads as the landing view of Location Category Management
    Given I am logged in to CivitCORE as "Admin_User1" with role "Admin"
    And the user has valid credentials and Location Category Management permission
    When I navigate to "Location Category Management" from the left menu
    Then the Location Category List (Hierarchy) page should be displayed by default as the landing view
    And the categories available in the CivitCORE Location Category Master should be listed

  @TC_CivitCORE_F_0002 @functional @high
  Scenario: Verify categories are displayed in a parent-child hierarchy
    Given I am logged in as an "Admin" user with Add, View, Edit and Delete permissions
    And the baseline Location Category test data is loaded
    And I am on the Location Category List (Hierarchy) page
    When I expand the hierarchy "Country > State/Territory > District > City > Airport"
    And I expand "State/Territory" and observe its children
    Then each child category should be nested under its Parent Category exactly as stored
    And "State/Territory" should show both "District" and "Assembly Constituency" as children

  @TC_CivitCORE_F_0003 @functional @high
  Scenario: Verify categories without a Parent Category are displayed at the top level (L1)
    Given I am logged in as an "Admin" user with Add, View, Edit and Delete permissions
    And the baseline Location Category test data is loaded
    And I am on the Location Category List (Hierarchy) page
    When I identify the categories that have no Parent Category
    Then "Country", "Zone" and "Depot" should appear at the top level (L1) of the hierarchy with no parent

  @TC_CivitCORE_F_0004 @functional @high
  Scenario: Verify only categories present in the CivitCORE Location Category Master are displayed
    Given I am logged in as an "Admin" user with Add, View, Edit and Delete permissions
    And the baseline Location Category test data is loaded
    And I am on the Location Category List (Hierarchy) page
    When I note the total number of records in the Location Category Master via DB/API
    And I expand all nodes and count all displayed categories on the Location Category List
    And I compare the master count and names with the displayed count and names
    Then the master count should be 8
    And the list should show exactly the 8 master records "Country, State/Territory, District, City, Airport, Assembly Constituency, Zone, Depot"
    And no extra, missing or deleted categories should be displayed

  @TC_CivitCORE_F_0005 @functional @medium
  Scenario: Verify pagination is shown when record count exceeds configured page size
    Given the page size is configured as 10
    And the Location Category Master contains 25 Location Categories
    And I am logged in as an "Admin" user
    When I open the Location Category List
    Then the first page should show 10 records
    And pagination controls should be visible
    When I click page 2
    And I click page 3
    Then the pagination controls should display 3 pages
    And pages 1, 2 and 3 should show 10, 10 and 5 records respectively
    And there should be no duplicate records across pages
