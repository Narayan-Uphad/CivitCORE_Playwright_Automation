@location_category @location_association
Feature: Location Category - Location Association
  Module   : Location Association
  FRD Ref  : 6.5

  # ---------------------------- FUNCTIONAL ----------------------------

  @TC_CivitCORE_F_0033 @functional @high
  Scenario: Verify Location create/edit form provides a Location Category dropdown populated from the Master
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    When I open "Location Management" and click "Add Location"
    And I open the Location Category dropdown
    Then the dropdown should list all valid categories from the CivitCORE Location Category Master "Country, State/Territory, District, City, Airport, Assembly Constituency, Zone, Depot"

  @TC_CivitCORE_F_0034 @functional @high
  Scenario: Verify selecting a category stores the association using the Location Category ID
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    When I create Location "Nashik Substation" selecting category "Depot"
    And I save the Location
    And I query the Location record
    Then the Location record should store the Location Category ID of "Depot"
    And the Location record should not store the category Name

  @TC_CivitCORE_F_0035 @functional @high
  Scenario: Verify changing a Location's category updates the reference
    Given I am logged in as an "Admin" user
    And the Location "Pune Depot" is tagged to "Depot"
    When I edit Location "Pune Depot" and change category from "Depot" to "Zone"
    And I save the Location
    And I query the Location and both categories' dependencies
    Then the Location should store the Category ID of "Zone"
    And "Depot" should no longer have "Pune Depot" as a dependency
    And "Zone" should now have "Pune Depot" as a dependency

  # ----------------------------- NEGATIVE -----------------------------

  @TC_CivitCORE_N_0024 @negative @high
  Scenario: Verify free-text Location Category cannot be entered on a Location
    Given I am logged in as an "Admin" user
    And the baseline Location Category test data is loaded
    When I open Add Location
    And I try to type the category "Custom Category" that is not in the dropdown and save
    Then free text should not be accepted
    And only an existing category should be selectable

  @TC_CivitCORE_N_0025 @negative @api @high
  Scenario: Verify a non-existent Location Category ID is rejected when saving a Location
    Given I am authenticated as an "Admin" user
    And an API/request tool is available
    When I submit a create-Location request with an unknown Location Category ID
      """
      {"name":"Test Location","categoryId":"LC-INVALID-9999"}
      """
    And I check the Locations list
    Then the request should be rejected
    And no Location should be created with an invalid category reference
