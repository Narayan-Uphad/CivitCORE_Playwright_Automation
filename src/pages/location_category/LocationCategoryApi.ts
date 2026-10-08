/**
 * Location Category API: records the traffic of one browser page and replays authenticated requests.
 *
 * The tab loads the whole tree with POST /setup/api/locationCategory/3.0/getHierarchy and saves with
 * create / update/<id> / delete/<id>. Location Category IDs are never rendered in the UI, so this
 * is the only place they can be read.
 *
 * `send` re-uses the headers (bearer token) of the page's own requests, which is how scenarios
 * fix up test data quickly and submit the tampered requests the FRD asks for ("UI bypassed").
 * One monitor exists per page and is shared by every Location Category page object.
 */
import type { Page, Response } from '@playwright/test';
import { expect } from '../../utils/assertions';
import { API_ORG_ID, defaultProdCode, normalizeLocationCategoryText } from '../../test-data/location-category.data';

export interface LocationCategoryRecord {
  id: number;
  name: string;
  shortName: string;
  /** Name / short name exactly as stored (not trimmed), to prove the app trims what users type. */
  rawName: string;
  rawShortName: string;
  code: string;
  /** Id of the record this one is nested under, or null for a top-level (L1) record. */
  parentId: number | null;
  /** 0 for a top-level record. */
  depth: number;
}

export type LocationCategoryOperation = 'Create' | 'Update' | 'Delete';

export interface LocationCategoryApiCall {
  operation: LocationCategoryOperation;
  status: number;
  /** Created id (Create) or the id in the request URL (Update / Delete). */
  id?: number;
  message: string;
  method: string;
  url: string;
  /** Request body the page sent (JSON text), when there was one. */
  requestBody?: string;
}

export interface ApiResult {
  status: number;
  message: string;
  body: unknown;
}

export interface CreatePayload {
  catName: string;
  catShortName: string;
  catCode: string;
  objCatIdnCode?: string;
  parentID?: number | string | null;
  deptId?: number;
  orgID?: number;
  isJurisdictionOn?: boolean;
  [extra: string]: unknown;
}

export const MUTATION_URL = /\/locationCategory\/3\.0\/(create|update|delete)\b(?:\/(\d+))?/i;
const HIERARCHY_URL = /\/locationCategory\/3\.0\/getHierarchy/i;
const API_PATH = /\/setup\/api\//i;
const API_BASE = /^(.*\/setup\/api\/)/i;
export const SUBMIT_TIMEOUT = 20000;

interface HierarchyNode {
  id: number;
  displayName?: string;
  catShortName?: string | null;
  catCode?: string | null;
  locationCategory?: HierarchyNode[];
}

/** Request headers the replay must not copy (the browser sets them, or the cookie jar supplies them). */
const SKIPPED_HEADERS = /^(host|content-length|content-type|cookie|connection|accept-encoding|origin|referer|user-agent|sec-|priority|:)/i;

export function operationOf(value: string): LocationCategoryOperation {
  const lower = value.toLowerCase();
  return lower === 'create' ? 'Create' : lower === 'update' ? 'Update' : 'Delete';
}

export class LocationCategoryApi {
  /** Every create / update / delete response seen on this page, oldest first. */
  readonly apiCalls: LocationCategoryApiCall[] = [];
  /** Every delete request sent from this page (recorded synchronously, before any response). */
  readonly deleteRequests: number[] = [];
  /** Ids of records the test created / deleted with direct API calls (the page also sees those responses). */
  readonly directIds = new Set<number>();
  private master: LocationCategoryRecord[] = [];
  private version = 0;
  private headers: Record<string, string> = {};
  private apiBase?: string;

  constructor(private readonly page: Page) {
    page.on('request', (request) => {
      const url = request.url();
      const match = MUTATION_URL.exec(url);
      if (match && operationOf(match[1]) === 'Delete' && match[2]) this.deleteRequests.push(Number(match[2]));
      const base = API_BASE.exec(url);
      if (base) this.apiBase = base[1];
      if (API_PATH.test(url)) {
        request
          .allHeaders()
          .then((all) => {
            if (all.authorization) this.headers = Object.fromEntries(Object.entries(all).filter(([name]) => !SKIPPED_HEADERS.test(name)));
          })
          .catch(() => undefined);
      }
    });
    page.on('response', (response) => this.record(response));
  }

  // ---------------------------------------------------------------------------
  // Master data as the grid loaded it
  // ---------------------------------------------------------------------------

  /** Incremented on every getHierarchy reload; the grid reloads the master after every save. */
  get masterVersion(): number {
    return this.version;
  }

  records(): LocationCategoryRecord[] {
    return [...this.master];
  }

  recordById(id: number): LocationCategoryRecord | undefined {
    return this.master.find((record) => record.id === id);
  }

  recordsNamed(name: string): LocationCategoryRecord[] {
    const expected = normalizeLocationCategoryText(name);
    return this.master.filter((record) => normalizeLocationCategoryText(record.name) === expected);
  }

  childrenOf(id: number): LocationCategoryRecord[] {
    return this.master.filter((record) => record.parentId === id);
  }

  async expectMasterLoaded(): Promise<void> {
    await expect.poll(() => this.master.length, { timeout: 30000, message: 'Location Category master was loaded' }).toBeGreaterThan(0);
  }

  /** Waits for the grid's next master reload that satisfies `predicate`. */
  async waitForMaster(predicate: (records: LocationCategoryRecord[]) => boolean, message: string): Promise<void> {
    await expect.poll(() => predicate(this.master), { timeout: SUBMIT_TIMEOUT, message }).toBe(true);
  }

  /** Waits until the master has been reloaded since `version` was read. */
  async waitForReloadAfter(version: number, message = 'the Location Category list reloaded'): Promise<void> {
    await expect.poll(() => this.version, { timeout: SUBMIT_TIMEOUT, message }).toBeGreaterThan(version);
  }

  /** The next create / update / delete response, or null when none arrives in time. */
  nextMutation(): Promise<Response | null> {
    return this.page
      .waitForResponse((candidate) => MUTATION_URL.test(candidate.url()) && candidate.request().method() !== 'GET', { timeout: SUBMIT_TIMEOUT })
      .catch(() => null);
  }

  /** The next delete response; rejects when none arrives in time. */
  nextDelete(): Promise<Response> {
    return this.page.waitForResponse((candidate) => /\/locationCategory\/3\.0\/delete\b/i.test(candidate.url()), { timeout: SUBMIT_TIMEOUT });
  }

  /** Created ids of every successful create this page has seen. */
  createdIds(): number[] {
    return [...new Set(this.apiCalls.filter((call) => call.operation === 'Create' && call.status < 300 && call.id).map((call) => call.id!))];
  }

  /** Most recent save (create / update) of the page. */
  lastCall(operation?: LocationCategoryOperation): LocationCategoryApiCall | undefined {
    return [...this.apiCalls].reverse().find((call) => !operation || call.operation === operation);
  }

  // ---------------------------------------------------------------------------
  // Authenticated requests made from the test (fixtures, "UI bypassed" scenarios)
  // ---------------------------------------------------------------------------

  /** True once the page has made an authenticated API request whose headers can be replayed. */
  hasSession(): boolean {
    return Boolean(this.headers.authorization) && Boolean(this.apiBase);
  }

  /** `path` is relative to the setup API ("locationCategory/3.0/create") or an absolute URL. */
  async send(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, data?: unknown): Promise<ApiResult> {
    await expect.poll(() => this.hasSession(), { timeout: 30000, message: 'an authenticated Location Category API request was observed' }).toBe(true);
    // Sent from inside the page: the browser (unlike Node) trusts the portal's certificate chain, the portal's CORS
    // rules already allow these headers, and a failure never echoes the bearer token into the test log.
    const url = /^https?:/i.test(path) ? path : `${this.apiBase}${path}`;
    const response = await this.page.evaluate(
      async ({ url, method, headers, body }) => {
        const reply = await fetch(url, {
          method,
          headers: { ...headers, 'content-type': 'application/json' },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        return { status: reply.status, text: await reply.text() };
      },
      { url, method, headers: this.headers, body: data },
    );
    const text = response.text;
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      // Non-JSON body (e.g. an empty 403): the text itself is the body.
    }
    return { status: response.status, message: messageOf(body), body };
  }

  /** Reads the whole master straight from the API (independent of what the grid has loaded). */
  async fetchMaster(): Promise<LocationCategoryRecord[]> {
    const result = await this.send('POST', 'locationCategory/3.0/getHierarchy', { specifiedOrgOnly: false, orgID: API_ORG_ID });
    if (result.status >= 300 || !Array.isArray(result.body)) {
      throw new Error(`getHierarchy failed: ${result.status} ${result.message}`);
    }
    return LocationCategoryApi.flatten(result.body as HierarchyNode[]);
  }

  async create(payload: CreatePayload): Promise<ApiResult & { id?: number }> {
    const result = await this.send('POST', 'locationCategory/3.0/create', {
      objCatIdnCode: defaultProdCode.code,
      parentID: null,
      deptId: 0,
      orgID: API_ORG_ID,
      isJurisdictionOn: false,
      ...payload,
    });
    const id = typeof (result.body as { data?: unknown })?.data === 'number' ? ((result.body as { data: number }).data) : undefined;
    if (id !== undefined) this.directIds.add(id);
    return { ...result, id };
  }

  async remove(id: number): Promise<ApiResult> {
    return this.send('DELETE', `locationCategory/3.0/delete/${id}`);
  }

  // ---------------------------------------------------------------------------

  static async parseCall(response: Response): Promise<LocationCategoryApiCall> {
    const match = MUTATION_URL.exec(response.url());
    const operation = operationOf(match?.[1] ?? 'Delete');
    const urlId = match?.[2];
    const body: unknown = await response.json().catch(() => ({}));
    const data = (body as { data?: unknown }).data;
    return {
      operation,
      status: response.status(),
      id: operation === 'Create' ? (typeof data === 'number' ? data : undefined) : urlId ? Number(urlId) : undefined,
      message: messageOf(body),
      method: response.request().method(),
      url: response.url(),
      requestBody: response.request().postData() ?? undefined,
    };
  }

  private record(response: Response): void {
    const url = response.url();
    if (HIERARCHY_URL.test(url)) {
      const base = /^(.*\/setup\/api\/)locationCategory\//i.exec(url);
      if (base) this.apiBase = base[1];
      response
        .json()
        .then((body: unknown) => {
          if (!Array.isArray(body)) return;
          const request = response.request().postData() ?? '';
          // The grid first asks for "specifiedOrgOnly" (usually empty); only the loaded organization is the master.
          if (body.length === 0 && /specifiedOrgOnly":\s*true/i.test(request)) return;
          this.master = LocationCategoryApi.flatten(body as HierarchyNode[]);
          this.version += 1;
        })
        .catch(() => undefined);
      return;
    }
    if (!MUTATION_URL.test(url) || response.request().method() === 'GET') return;
    LocationCategoryApi.parseCall(response)
      .then((call) => this.apiCalls.push(call))
      .catch(() => undefined);
  }

  static flatten(nodes: HierarchyNode[], parentId: number | null = null, depth = 0): LocationCategoryRecord[] {
    return nodes.flatMap((node) => [
      {
        id: node.id,
        name: (node.displayName ?? '').trim(),
        shortName: (node.catShortName ?? '').trim(),
        rawName: node.displayName ?? '',
        rawShortName: node.catShortName ?? '',
        code: (node.catCode ?? '').trim(),
        parentId,
        depth,
      },
      ...LocationCategoryApi.flatten(node.locationCategory ?? [], node.id, depth + 1),
    ]);
  }
}

function messageOf(body: unknown): string {
  if (typeof body === 'string') return body.slice(0, 500);
  const value = body as { message?: string; error?: { message?: string }; errors?: Record<string, string[]> } | null;
  const validation = value?.errors ? Object.values(value.errors).flat().join(' ') : '';
  return value?.message ?? value?.error?.message ?? validation;
}
