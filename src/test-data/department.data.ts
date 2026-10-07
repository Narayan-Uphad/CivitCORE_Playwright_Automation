/**
 * Department Management test data: patterns and expected messages copied
 * verbatim from the original Playwright specs. Feature files refer to these
 * by business-readable names; the exact matching rules live here.
 */

/** delete-added-department.spec.ts: only departments created by the delete spec (prefix + timestamp) may be deleted. */
export const TEST_DEPARTMENT_PATTERN = /^(DeleteDept|DelMulti)\d{10,}[A-Z]?$/i;

export const departmentMessages = {
  /** add-department / negative / verified specs (exact substring used with getByText). */
  added: 'Department added successfully!',
  /** edit-department.spec.ts */
  updated: /Department\s+Updated\s+Successfully!?/i,
  /** delete-added-department.spec.ts */
  deleted: /Department\s+Deleted\s+Successfully!?/i,
} as const;

export const validationMessages = {
  /** department-negative-test-cases.spec.ts TC_N_0001 / TC_N_0002 */
  mandatoryField: /required|Please|cannot be empty/i,
  /** department-negative-test-cases.spec.ts TC_N_0004 (asserted inside the dialog) */
  duplicateName: /already exists|duplicate|same name/i,
  /** department-negative-test-cases.spec.ts TC_N_0005 (asserted on the page) */
  duplicateShortName: /already exists|duplicate|same short name|short name/i,
  /** edit-department.spec.ts "Mandatory fields cannot be cleared..." */
  departmentNameRequired: /Department Name is required/i,
} as const;

/**
 * Used ONLY by the reconstructed DepartmentLoginPage.hasAuthenticationError().
 * The original page object was not supplied; replace with its real rule if it differs.
 */
export const authenticationErrorPattern =
  /invalid (user ?name|username|password|credentials)|incorrect (user ?name|username|password|credentials)|authentication failed|login failed/i;
