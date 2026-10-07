# Source: department-management-updated.spec.ts
#         (test.describe 'CivitCORE Department Management — verified-behavior suite' — 7 tests)
#
# Traceability: Test Case IDs (TC-xxx) from CivitCORE_Department_Management_Test_Cases_v6.xlsx,
# Requirement IDs (REQ-xx) from CivitCORE_Department_FRD_3.pdf.
# Documented adaptations vs. the FRD (kept exactly as in the original spec):
#   1. An Organization Name ("MIDC") must be selected before the Department grid populates.
#   2. The FRD's free-text "Department Code" does not exist; a mandatory "Department Prod Code" dropdown is used.
#   3. There is no "Office" field (TC-010, TC-036, TC-037 not automated).
#   4. The real toaster text is "Department added successfully!" (FRD says "Department created successfully.").
#   5. The List has no "Department ID" column, so TC-011's view-screen assertion is excluded.
# TC-048 (search by Dept Code) is intentionally NOT automated (inconclusive evidence).
# The original spec had no authentication-error skip; none is added here.
@verified-behavior
Feature: CivitCORE Department Management — verified-behavior suite

  Background:
    Given I open the MIDC portal
    When I open the Department Login page
    Then the Department Login page is displayed
    When I log in with the configured Department Login credentials
    Then the Masters Management link is visible within 30 seconds
    When I open Masters Management
    Then the Admin Portal is loaded
    When I open Organization Configuration
    And I select the organization "MIDC"
    And I open the Department tab within 30 seconds
    Then the "Department Name" column header is visible within 30 seconds

  @TC-001 @REQ-01
  Scenario: TC-001 | REQ-01 - Department List is the landing view under Department tab
    Then the "Department Name" column header is visible
    And the "Short Name" column header is visible
    And the "Dept Code" column header is visible
    And the "Hierarchy" column header is visible
    And an Add Department button is visible

  @TC-045 @REQ-08
  Scenario: TC-045 | REQ-08 - Department List displays existing departments by default
    Then the pagination summary is visible
    And the first department row is visible

  @TC-028 @REQ-05
  Scenario: TC-028 | REQ-05 - Department ID input is not present on the Add Department form
    When I open the Add Department modal
    Then no field labelled "Department ID" exists
    And no field has a placeholder containing "Department ID"

  @TC-009 @TC-035 @REQ-06
  Scenario: TC-009/TC-035 | REQ-06 - Create top-level Department with Nest Department Under left unchecked
    # The API rejects a Department Short Name longer than 10 characters.
    Given the following unique test data is generated:
      | alias     | template             | max length |
      | unique    | {timestamp}          |            |
      | deptName  | AutoDept{unique}     |            |
      | shortName | AD{unique}           | 10         |
    When I open the Add Department modal
    And I enter "{deptName}" in the field labelled "Department Name"
    And I enter "{shortName}" in the field labelled "Department Short Name"
    # Mandatory dropdown that replaces the FRD's free-text "Department Code"
    And I choose the first option from the "Select Prod Code" dropdown
    # Leave "Nest Department Under" unchecked -> top-level department
    Then the "Nest Department Under" checkbox is not checked
    When I click the Add Department button
    # Real toaster text (differs from FRD/TC-084's "Department created successfully.")
    Then the message "Department added successfully!" is displayed
    And the text "{deptName}" is visible

  @TC-008 @TC-034 @REQ-02 @REQ-06
  Scenario: TC-008/TC-034 | REQ-02,REQ-06 - Create a Department nested under an existing parent
    # The API rejects a Department Short Name longer than 10 characters.
    Given the following unique test data is generated:
      | alias       | template           | max length |
      | unique      | {timestamp}        |            |
      | parentName  | AutoParent{unique} |            |
      | parentShort | AP{unique}         | 10         |
      | childName   | AutoChild{unique}  |            |
      | childShort  | AC{unique}         | 10         |
    # Step 1: create the parent (top-level) department
    When I open the Add Department modal
    And I enter "{parentName}" in the field labelled "Department Name"
    And I enter "{parentShort}" in the field labelled "Department Short Name"
    And I choose the first option from the "Select Prod Code" dropdown
    And I click the Add Department button
    Then the message "Department added successfully!" is displayed
    # Step 2: create the child, nested under the parent just created
    When I open the Add Department modal
    And I enter "{childName}" in the field labelled "Department Name"
    And I enter "{childShort}" in the field labelled "Department Short Name"
    And I choose the first option from the "Select Prod Code" dropdown
    And I tick the "Nest Department Under" checkbox
    And I choose "{parentName}" from the "Select Parent Department" dropdown
    And I click the Add Department button
    Then the message "Department added successfully!" is displayed
    # The child is nested under its (collapsed) parent on a paginated grid, so the grid is
    # filtered by name instead of scanning the visible page.
    When I filter the department grid by name "{childName}"
    Then a department grid cell containing "{childName}" is visible within 20 seconds

  @TC-015 @REQ-02
  Scenario: TC-015 | REQ-02 - Mandatory fields are marked with an asterisk on the Add Department form
    When I open the Add Department modal
    Then the following fields are marked as mandatory with an asterisk:
      | Organization Name     |
      | Department Name       |
      | Department Short Name |
      | Department Prod Code  |

  @TC-031 @REQ-06
  Scenario: TC-031 | REQ-06 - Nest Department Under dropdown is populated from existing departments only
    # Free-text rejection (the other half of TC-031) was not exercised in the source video and is not asserted.
    When I open the Add Department modal
    And I tick the "Nest Department Under" checkbox
    And I open the "Select Parent Department" dropdown
    Then at least one parent department option is available
