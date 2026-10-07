# Source: department-negative-test-cases.spec.ts
#         (test.describe 'CivitCORE Department Management — Negative Test Cases' — 7 tests, 4 of them test.fixme)
@negative
Feature: CivitCORE Department Management — Negative Test Cases

  Background:
    Given I open the MIDC portal
    And the MIDC portal is loaded
    When I open the Department Login page
    Then the Department Login page is displayed
    When I log in with the configured Department Login credentials
    Then the scenario is skipped if Department Login authentication fails, because "Department Management requires valid Department Login credentials."
    And the Masters Management link is visible within 30 seconds
    When I open Masters Management
    Then the Admin Portal is loaded
    When I open Organization Configuration
    And I select the organization "MIDC"
    And I open the Department tab within 30 seconds
    Then the "Department Name" column header is visible within 30 seconds

  @TC_N_0001
  Scenario: TC_N_0001: blocks creation when Department Name is left blank
    Given the following unique test data is generated:
      | alias     | template             | max length |
      | shortName | ND{timestamp:last10} | 12         |
    Then the Add Department button is visible within 20 seconds
    When I click the Add Department button
    Then the Add Department dialog is displayed within 20 seconds
    When I leave the Department Name empty
    And I enter "{shortName}" as the Department Short Name
    And I select "CIRCLE" as the Department Prod Code
    And I submit the Add Department dialog
    Then a mandatory field validation message is displayed within 15 seconds
    And the Add Department dialog is still displayed

  @TC_N_0002
  Scenario: TC_N_0002: blocks creation when Short Name is left blank
    Given the following unique test data is generated:
      | alias          | template           |
      | departmentName | NDShort{timestamp} |
    Then the Add Department button is visible within 20 seconds
    When I click the Add Department button
    Then the Add Department dialog is displayed within 20 seconds
    When I enter "{departmentName}" as the Department Name
    And I leave the Department Short Name empty
    And I select "CIRCLE" as the Department Prod Code
    And I submit the Add Department dialog
    Then a mandatory field validation message is displayed within 15 seconds
    And the Add Department dialog is still displayed

  @TC_N_0004 @fixme
  Scenario: TC_N_0004: blocks duplicate Department Name regardless of case
    Product gap (from the original spec): the app saves the case-variant duplicate and closes the
    modal instead of showing a validation error. Kept as @fixme (skipped) until the product is fixed.

    Given the following unique test data is generated:
      | alias          | template                 | max length |
      | name           | DuplicateName{timestamp} |            |
      | shortName      | DU{timestamp:last8}      | 10         |
      | duplicateShort | DUP{timestamp:last7}     | 10         |
    And a department named "{name}" with short name "{shortName}" and Prod Code "CIRCLE" has been created successfully
    Then the Add Department button is visible within 20 seconds
    When I click the Add Department button
    Then the Add Department dialog is displayed within 20 seconds
    When I enter "{name:upper}" as the Department Name
    And I enter "{duplicateShort}" as the Department Short Name
    And I select "CIRCLE" as the Department Prod Code
    And I submit the Add Department dialog
    Then a duplicate name validation message is displayed in the dialog within 15 seconds
    And the Add Department dialog is still displayed

  @TC_N_0005 @fixme
  Scenario: TC_N_0005: blocks duplicate Short Name regardless of case
    The app behaves differently from the FRD here: duplicate short names are not consistently
    rejected by the UI, so this regression is intentionally skipped until the product issue is fixed.

    Given the following unique test data is generated:
      | alias      | template                      | max length |
      | name       | DuplicateShortName{timestamp} |            |
      | shortName  | DSN{timestamp:last7}          | 10         |
      | secondName | DuplicateShort{timestamp}     |            |
    And a department named "{name}" with short name "{shortName}" and Prod Code "CIRCLE" has been created successfully
    Then the Add Department button is visible within 20 seconds
    When I click the Add Department button
    Then the Add Department dialog is displayed within 20 seconds
    When I enter "{secondName}" as the Department Name
    And I enter "{shortName:lower}" as the Department Short Name
    And I select "CIRCLE" as the Department Prod Code
    And I submit the Add Department dialog
    Then a duplicate short name validation message is displayed within 15 seconds
    And the Add Department dialog is still displayed

  # The original test body is empty (test.fixme with a comment only) — no steps exist to convert.
  @TC_N_0010 @fixme
  Scenario: TC_N_0010: blocks selecting the Department itself as Nest Department Under
    The live MIDC app exposes the nesting form inconsistently across orgs and may not surface the
    self-parent validation in a stable way, so this FRD-only negative case is skipped instead of failing.

  # The original test body is empty (test.fixme with a comment only) — no steps exist to convert.
  @TC_N_0016 @fixme
  Scenario: TC_N_0016: blocks update that would duplicate another Department
    The live UI does not expose a deterministic edit flow for this negative path in the test environment.

  @TC_N_0024
  Scenario: TC_N_0024: Back on Add Department form discards unsaved entries
    Given the following unique test data is generated:
      | alias      | template               | max length |
      | uniqueName | DiscardDept{timestamp} |            |
      | shortName  | DD{timestamp:last8}    | 10         |
    Then the Add Department button is visible within 20 seconds
    When I click the Add Department button
    Then the Add Department dialog is displayed within 20 seconds
    When I enter "{uniqueName}" as the Department Name
    And I enter "{shortName}" as the Department Short Name
    And I select "CIRCLE" as the Department Prod Code
    # The app labels the discard action "Cancel" (with a "Close" icon button) instead of "Back".
    And I click Back or Cancel in the dialog
    Then the Add Department dialog is closed within 15 seconds
    And the Add Department button is visible
    When I filter the department grid by name "{uniqueName}"
    Then no department rows containing "{uniqueName}" are shown within 15 seconds
