@Designation @CrossModuleConsumption
Feature: Designation Usage in Employee & Post Management and Multi-Product Consumption
  As a CivitCORE Administrator
  I want the CivitCORE Designation Master to be consumed consistently by Employee Management,
  Post Management, and other Civit products
  So that Employee, Post and cross-product references always use the single common Designation identity
  (FRD Ref: Sections 6.5 - Designation Usage in Employee & Post Management,
            6.6 - Designation Consumption by Civit Products)

  Background:
    Given the user is logged in as an "Admin" user
    And the user has navigated to the "Designation Management" screen

  @TC_CivitCORE_F_0012 @Functional @High @Automation
  Scenario: Newly created Designation is immediately selectable in the Employee Designation lookup
    When the user creates a new Designation with Abbreviation "QA" and Designation Name "Quality Auditor"
    And the user clicks "Save"
    And the user navigates to the Employee creation screen
    And the user opens the Designation lookup on the Employee form
    Then the Designation "QA" - "Quality Auditor" is available for selection

  @TC_CivitCORE_F_0013 @Functional @High @Automation
  Scenario: Newly created Designation is immediately selectable in the Post Designation lookup
    When the user creates a new Designation with Abbreviation "SS" and Designation Name "Site Supervisor"
    And the user clicks "Save"
    And the user navigates to the Post creation screen
    And the user opens the Designation lookup on the Post form
    Then the Designation "SS" - "Site Supervisor" is available for selection

  @TC_CivitCORE_F_0026 @Functional @High @Automation
  Scenario: Updating a Designation does not affect its existing Employee association(s)
    Given a Designation is associated with one or more existing Employees
    When the user edits the Designation's Name, Abbreviation or Reporting To
    And the user clicks "Save"
    And the user navigates to the associated Employee record(s)
    Then the Designation update completes successfully
    And the existing Employee-Designation association(s) remain intact and unchanged

  @TC_CivitCORE_F_0027 @Functional @High @Automation
  Scenario: Updating a Designation does not affect its existing Post association(s)
    Given a Designation is associated with one or more existing Posts
    When the user edits the Designation's Name, Abbreviation or Reporting To
    And the user clicks "Save"
    And the user navigates to the associated Post record(s)
    Then the Designation update completes successfully
    And the existing Post-Designation association(s) remain intact and unchanged

  @TC_CivitCORE_F_0029 @Functional @High @Automation
  Scenario: Employee's Designation reference continues to point to the same Designation ID after an Abbreviation update
    Given Employee "E1001" is assigned Designation "CE" - "Chief Engineer"
    When the user edits Designation "CE" and changes its Abbreviation to "C.ENG"
    And the user clicks "Save"
    And the user opens Employee "E1001" record
    Then the Employee's Designation reference continues to point to the same Designation ID without interruption
    And it is now displayed as "C.ENG" - "Chief Engineer"

  @TC_CivitCORE_F_0048 @Functional @Low @Automation
  Scenario: A Civit product is not obligated to configure product-specific settings for every CivitCORE Designation
    Given Designation "Trainee Engineer" exists in CivitCORE but has not been configured in "CivitBUILD"
    When the user references Designation "Trainee Engineer" within "CivitBUILD" without configuring any product-specific settings
    Then the Designation is available for reference in "CivitBUILD"
    And it has no product-specific behavior until explicitly configured
    And no error occurs
