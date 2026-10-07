/**
 * Records the Designation API traffic of one browser page (getHierarchy / Create / Update / Delete).
 *
 * Designation IDs are never rendered in the UI, so the API is the only place they can be read.
 * One monitor exists per page and is shared by every Designation page object, so all of them see
 * the same master data and the same history of saves and deletes.
 */
import type { Page, Response } from '@playwright/test';
import { expect } from '../../utils/assertions';
import { normalizeDesignationText } from '../../test-data/designation.data';

export interface DesignationRecord {
  id: number;
  name: string;
  shortName: string;
  /** Id of the record this one is nested under ("Reporting To"), or null for a top-level record. */
  parentId: number | null;
  /** 0 for a top-level record. */
  depth: number;
}

export type DesignationOperation = 'Create' | 'Update' | 'Delete';

export interface DesignationApiCall {
  operation: DesignationOperation;
  status: number;
  /** Created id (Create) or the id in the request URL (Update / Delete). */
  id?: number;
  message: string;
}

export const MUTATION_URL = /\/orgDesignation\/3\.0\/(Create|Update|Delete)\b(?:\/(\d+))?/i;
export const DELETE_URL = /\/orgDesignation\/3\.0\/Delete\b/i;
const HIERARCHY_URL = /\/orgDesignation\/3\.0\/getHierarchy/i;
export const SUBMIT_TIMEOUT = 20000;

interface HierarchyNode {
  id: number;
  displayName?: string;
  desigShortName?: string | null;
  desigIdnCode?: string | null;
  orgDesignation?: HierarchyNode[];
}

export function operationOf(value: string): DesignationOperation {
  const lower = value.toLowerCase();
  return lower === 'create' ? 'Create' : lower === 'update' ? 'Update' : 'Delete';
}

export class DesignationApiMonitor {
  /** Every Create / Update / Delete response seen on this page, oldest first. */
  readonly apiCalls: DesignationApiCall[] = [];
  /** Every Delete request sent from this page (recorded synchronously, before any response). */
  readonly deleteRequests: number[] = [];
  private master: DesignationRecord[] = [];
  private version = 0;

  constructor(private readonly page: Page) {
    page.on('request', (request) => {
      const match = MUTATION_URL.exec(request.url());
      if (match && operationOf(match[1]) === 'Delete' && match[2]) this.deleteRequests.push(Number(match[2]));
    });
    page.on('response', (response) => this.record(response));
  }

  /** Incremented on every getHierarchy reload; the grid reloads the master after every save. */
  get masterVersion(): number {
    return this.version;
  }

  records(): DesignationRecord[] {
    return [...this.master];
  }

  recordById(id: number): DesignationRecord | undefined {
    return this.master.find((record) => record.id === id);
  }

  recordsNamed(name: string): DesignationRecord[] {
    const expected = normalizeDesignationText(name);
    return this.master.filter((record) => normalizeDesignationText(record.name) === expected);
  }

  async expectMasterLoaded(): Promise<void> {
    await expect.poll(() => this.master.length, { timeout: 30000, message: 'Designation master was loaded' }).toBeGreaterThan(0);
  }

  /** Waits for the grid's next master reload that satisfies `predicate`. */
  async waitForMaster(predicate: (records: DesignationRecord[]) => boolean, message: string): Promise<void> {
    await expect.poll(() => predicate(this.master), { timeout: SUBMIT_TIMEOUT, message }).toBe(true);
  }

  /** Waits until the master has been reloaded since `version` was read. */
  async waitForReloadAfter(version: number, message = 'the Designation list reloaded'): Promise<void> {
    await expect.poll(() => this.version, { timeout: SUBMIT_TIMEOUT, message }).toBeGreaterThan(version);
  }

  /** The next Create / Update / Delete response, or null when none arrives in time. */
  nextMutation(): Promise<Response | null> {
    return this.page
      .waitForResponse(
        (candidate) => MUTATION_URL.test(candidate.url()) && candidate.request().method() !== 'GET',
        { timeout: SUBMIT_TIMEOUT },
      )
      .catch(() => null);
  }

  /** The next Delete response; rejects when none arrives in time. */
  nextDelete(): Promise<Response> {
    return this.page.waitForResponse((candidate) => DELETE_URL.test(candidate.url()), { timeout: SUBMIT_TIMEOUT });
  }

  /** Created ids of every successful Create this page has seen. */
  createdIds(): number[] {
    return [...new Set(this.apiCalls.filter((call) => call.operation === 'Create' && call.status < 300).map((call) => call.id!))];
  }

  static async parseCall(response: Response): Promise<DesignationApiCall> {
    const match = MUTATION_URL.exec(response.url());
    const operation = operationOf(match?.[1] ?? 'Delete');
    const urlId = match?.[2];
    const body = (await response.json().catch(() => ({}))) as {
      data?: unknown;
      message?: string;
      error?: { message?: string };
      errors?: Record<string, string[]>;
    };
    const validation = body.errors ? Object.values(body.errors).flat().join(' ') : '';
    const message = body.message ?? body.error?.message ?? validation;
    const createdId = typeof body.data === 'number' ? body.data : undefined;
    return {
      operation,
      status: response.status(),
      id: operation === 'Create' ? createdId : urlId ? Number(urlId) : undefined,
      message,
    };
  }

  private record(response: Response): void {
    const url = response.url();
    if (HIERARCHY_URL.test(url)) {
      response
        .json()
        .then((body: unknown) => {
          if (!Array.isArray(body)) return;
          this.master = DesignationApiMonitor.flatten(body as HierarchyNode[]);
          this.version += 1;
        })
        .catch(() => undefined);
      return;
    }
    if (!MUTATION_URL.test(url) || response.request().method() === 'GET') return;
    DesignationApiMonitor.parseCall(response)
      .then((call) => this.apiCalls.push(call))
      .catch(() => undefined);
  }

  private static flatten(nodes: HierarchyNode[], parentId: number | null = null, depth = 0): DesignationRecord[] {
    return nodes.flatMap((node) => [
      {
        id: node.id,
        name: (node.displayName ?? '').trim(),
        shortName: (node.desigShortName ?? node.desigIdnCode ?? '').trim(),
        parentId,
        depth,
      },
      ...DesignationApiMonitor.flatten(node.orgDesignation ?? [], node.id, depth + 1),
    ]);
  }
}
