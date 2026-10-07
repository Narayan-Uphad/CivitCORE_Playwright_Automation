@Designation @ActivityLog
Feature: Designation Activity / Audit Log
  As a CivitCORE Auditor
  I want every Designation creation, update, deletion, deletion-blocked, and
  Employee/Post association event recorded in a read-only Activity Log
  So that I have complete traceability of Designation Master changes
  (FRD Ref: Section 7 - Activity / Audit Log)

  Background:
    Given the user is logged in as an "Admin" user
    And the user has navigated to the "Designation Management" screen

  @TC_CivitCORE_F_0057 @Functional @Medium @Automation
  Scenario: Activity Log is displayed in chronological order with the most recent entry first
    Given a Designation has multiple Activity Log entries recorded at different times
    When the user opens the Activity Log for that Designation
    Then the entries are displayed with the most recently occurring activity listed first
    And the entries are in strict chronological (descending) order

  @TC_CivitCORE_F_0058 @Functional @Medium @Automation
  Scenario: Activity Log is read-only and cannot be edited or deleted by any user
    Given the Activity Log has at least one entry for a Designation
    When the user opens the Activity Log screen
    And the user attempts to edit or delete an existing log entry
    Then no edit or delete controls are available on the Activity Log entries
    And the log entries remain unchanged after the attempt
