@Designation @DeleteDesignation
Feature: Designation Deletion
  As a CivitCORE Administrator
  I want to delete a Designation that is no longer required
  While protecting data integrity by preventing deletion of any Designation that is still
  associated with one or more Employees, Posts, or has one or more child Designations
  (FRD Ref: Section 6.7 - Designation Deletion)

  Background:
    Given the user is logged in as an "Admin" user
    And the user has navigated to the "Designation Management" screen

  @TC_CivitCORE_F_0030 @Functional @High @Automation @Smoke
  Scenario: Designation with no Employee, Post or child Designation can be deleted after confirmation
    Given a Designation "Trainee Engineer" exists with no Employee association, no Post association and no child Designations
    When the user clicks "Delete" on the Designation "Trainee Engineer"
    And the user confirms the delete action in the confirmation dialog
    Then the Designation is permanently removed from the Designation Master
    And a toaster message "Designation deleted successfully." is displayed

  @TC_CivitCORE_F_0031 @Functional @Medium @Automation
  Scenario: Delete confirmation dialog is displayed when no dependency exists
    Given a Designation "Trainee Engineer" exists with no dependencies
    When the user clicks "Delete" on the Designation "Trainee Engineer"
    Then a confirmation prompt is displayed before deletion proceeds

  @TC_CivitCORE_F_0032 @Functional @Medium @Automation
  Scenario: Cancelling the delete confirmation dialog retains the Designation unchanged
    Given a Designation "Trainee Engineer" exists with no dependencies
    And the delete confirmation dialog is displayed for "Trainee Engineer"
    When the user clicks "Cancel" on the confirmation dialog
    And the user returns to the Designation List
    Then the Designation "Trainee Engineer" is retained in the Designation Master without any changes
    And no Activity Log deletion entry is recorded

  @TC_CivitCORE_F_0033 @Functional @High @Automation
  Scenario: Designation deletion is blocked when the Designation is associated with one or more Employees
    Given a Designation is associated with at least one Employee record
    When the user clicks "Delete" on that Designation
    Then the deletion is blocked
    And a message is displayed indicating the Designation is assigned to one or more Employees
    And no delete confirmation dialog is shown

  @TC_CivitCORE_F_0034 @Functional @High @Automation
  Scenario: Designation deletion is blocked when the Designation is associated with one or more Posts
    Given a Designation is associated with at least one Post record
    When the user clicks "Delete" on that Designation
    Then the deletion is blocked
    And a message is displayed indicating the Designation is assigned to one or more Posts
    And no delete confirmation dialog is shown

  @TC_CivitCORE_F_0035 @Functional @High @Automation
  Scenario: Designation deletion is blocked when the Designation has one or more child Designations
    Given a parent Designation has at least one child Designation reporting to it via "Reporting To"
    When the user clicks "Delete" on the parent Designation
    Then the deletion is blocked
    And a message is displayed indicating the Designation has one or more child Designations
    And no delete confirmation dialog is shown

  @TC_CivitCORE_F_0036 @Functional @High @Automation
  Scenario: Deletion is blocked when Employee, Post and hierarchy dependencies all exist simultaneously
    Given a Designation has an Employee association, a Post association and a nested child Designation
    When the user clicks "Delete" on that Designation
    Then the deletion is blocked
    And an appropriate dependency message is displayed
    And no confirmation dialog is displayed

  @TC_CivitCORE_F_0038 @Functional @High @Automation
  Scenario: A successfully deleted Designation is no longer available for new Employee association
    Given a dependency-free Designation has just been deleted
    When the user navigates to the Employee creation screen
    And the user opens the Designation lookup
    Then the deleted Designation no longer appears in the Employee Designation lookup

  @TC_CivitCORE_F_0039 @Functional @High @Automation
  Scenario: A successfully deleted Designation is no longer available for new Post association
    Given a dependency-free Designation has just been deleted
    When the user navigates to the Post creation screen
    And the user opens the Designation lookup
    Then the deleted Designation no longer appears in the Post Designation lookup
