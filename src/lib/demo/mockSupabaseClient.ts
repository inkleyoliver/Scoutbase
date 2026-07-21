// Minimal in-memory chainable mock of the Supabase JS client, covering only
// the subset of the query-builder / auth API this codebase actually calls
// (see the DEMO_MODE section of README/BUILD_PROGRESS for the audit this was
// built from). Used exclusively when process.env.DEMO_MODE === "true" — see
// src/lib/supabase/{server,client,admin}.ts. Not a general-purpose mock: it
// does not implement RLS, real Postgres error codes, or every PostgREST
// filter operator, only what's exercised by phases 1-12 of Scoutbase.

import { DEMO_OWNER_ID, demoStore, type DemoTable } from "./mockData";

type Row = Record<string, unknown>;

function clone<T>(row: T): T {
  return { ...(row as Row) } as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

// Per-table defaults applied on insert/upsert before the caller's payload is
// merged on top (payload always wins). Mirrors DB column defaults /
// triggers that the real Supabase schema provides but this mock has no
// migration to read from.
const TABLE_DEFAULTS: Partial<Record<DemoTable, () => Row>> = {
  actions: () => ({
    completed_at: null,
    snoozed_until: null,
    recurrence_id: null,
    notes: null,
    milestone_id: null,
    waiting_on: null,
    waiting_since: null,
    last_activity_at: nowIso(),
  }),
  subtasks: () => ({ done: false, sort_order: 0 }),
  inbox_items: () => ({ ai_proposal: null, status: "pending" }),
  decisions: () => ({ superseded_by: null, meeting_note_id: null, decided_on: null, decided_by: null, detail: null }),
  meeting_notes: () => ({ meeting_date: null, body: null, attendees: null }),
  contacts: () => ({ role_title: null, email: null, phone: null, notes: null }),
  resources: () => ({ url: null, notes: null }),
  milestones: () => ({ description: null, theme: null, target_date: null, status: "not_started", sort_order: 0 }),
  recurrences: () => ({
    notes: null,
    byweekday: null,
    bymonthday: null,
    month: null,
    day: null,
    active: true,
  }),
};

// owner_id is present on every table except none in this schema — all
// tables carry it, so always stamp it on insert/upsert.
const OWNS_OWNER_ID = new Set<DemoTable>([
  "roles",
  "milestones",
  "recurrences",
  "actions",
  "subtasks",
  "inbox_items",
  "contacts",
  "meeting_notes",
  "decisions",
  "resources",
  "push_subscriptions",
  "push_log",
  "user_settings",
]);

type FilterFn = (row: Row) => boolean;

type Op = "select" | "insert" | "update" | "upsert" | "delete";

interface OrderSpec {
  column: string;
  ascending: boolean;
  nullsFirst?: boolean;
}

interface SelectOpts {
  count?: "exact" | "planned" | "estimated";
  head?: boolean;
}

function toArray<T>(payload: T | T[]): T[] {
  return Array.isArray(payload) ? payload : [payload];
}

function likeToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const withWildcards = escaped.replace(/%/g, ".*").replace(/_/g, ".");
  return new RegExp(`^${withWildcards}$`, "i");
}

class MockQueryBuilder implements PromiseLike<{ data: unknown; error: { message: string } | null; count?: number | null }> {
  private table: DemoTable;
  private op: Op = "select";
  private filters: FilterFn[] = [];
  private payload: Row | Row[] | null = null;
  private upsertOnConflict: string | undefined;
  private selectRequested = false;
  private selectOpts: SelectOpts | undefined;
  private wantSingle: "single" | "maybeSingle" | null = null;
  private orderSpec: OrderSpec | null = null;
  private limitN: number | null = null;

  constructor(table: DemoTable) {
    this.table = table;
  }

  select(_columns?: string, opts?: SelectOpts) {
    this.selectRequested = true;
    this.selectOpts = opts;
    return this;
  }

  insert(payload: Row | Row[]) {
    this.op = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: Row) {
    this.op = "update";
    this.payload = payload;
    return this;
  }

  upsert(payload: Row | Row[], opts?: { onConflict?: string }) {
    this.op = "upsert";
    this.payload = payload;
    this.upsertOnConflict = opts?.onConflict;
    return this;
  }

  delete() {
    this.op = "delete";
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push((r) => r[column] === value);
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push((r) => r[column] !== value);
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push((r) => values.includes(r[column]));
    return this;
  }

  gte(column: string, value: string | number) {
    this.filters.push((r) => {
      const v = r[column] as string | number | null | undefined;
      return v !== null && v !== undefined && v >= value;
    });
    return this;
  }

  lte(column: string, value: string | number) {
    this.filters.push((r) => {
      const v = r[column] as string | number | null | undefined;
      return v !== null && v !== undefined && v <= value;
    });
    return this;
  }

  lt(column: string, value: string | number) {
    this.filters.push((r) => {
      const v = r[column] as string | number | null | undefined;
      return v !== null && v !== undefined && v < value;
    });
    return this;
  }

  gt(column: string, value: string | number) {
    this.filters.push((r) => {
      const v = r[column] as string | number | null | undefined;
      return v !== null && v !== undefined && v > value;
    });
    return this;
  }

  is(column: string, value: null | boolean) {
    this.filters.push((r) => r[column] === value);
    return this;
  }

  not(column: string, operator: string, value: unknown) {
    if (operator === "is") {
      this.filters.push((r) => r[column] !== value);
    } else if (operator === "eq") {
      this.filters.push((r) => r[column] !== value);
    } else if (operator === "in" && Array.isArray(value)) {
      this.filters.push((r) => !value.includes(r[column]));
    } else {
      // Unsupported operator combination — no-op filter (fail open) rather
      // than silently dropping all rows.
      this.filters.push(() => true);
    }
    return this;
  }

  ilike(column: string, pattern: string) {
    const re = likeToRegex(pattern);
    this.filters.push((r) => {
      const v = r[column];
      return typeof v === "string" && re.test(v);
    });
    return this;
  }

  order(column: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.orderSpec = { column, ascending: opts?.ascending !== false, nullsFirst: opts?.nullsFirst };
    return this;
  }

  limit(n: number) {
    this.limitN = n;
    return this;
  }

  single() {
    this.wantSingle = "single";
    return this;
  }

  maybeSingle() {
    this.wantSingle = "maybeSingle";
    return this;
  }

  private rows(): Row[] {
    return demoStore[this.table] as unknown as Row[];
  }

  private applyFilters(rows: Row[]): Row[] {
    return rows.filter((r) => this.filters.every((f) => f(r)));
  }

  private applyOrderAndLimit(rows: Row[]): Row[] {
    let out = rows;
    if (this.orderSpec) {
      const { column, ascending, nullsFirst } = this.orderSpec;
      out = [...out].sort((a, b) => {
        const av = a[column] as string | number | null | undefined;
        const bv = b[column] as string | number | null | undefined;
        const aNull = av === null || av === undefined;
        const bNull = bv === null || bv === undefined;
        if (aNull && bNull) return 0;
        if (aNull) return nullsFirst ? -1 : 1;
        if (bNull) return nullsFirst ? 1 : -1;
        if (av! < bv!) return ascending ? -1 : 1;
        if (av! > bv!) return ascending ? 1 : -1;
        return 0;
      });
    }
    if (this.limitN !== null) {
      out = out.slice(0, this.limitN);
    }
    return out;
  }

  private shapeRows(rows: Row[]): { data: unknown; error: { message: string } | null } {
    if (this.wantSingle === "single") {
      if (rows.length !== 1) {
        return { data: null, error: { message: "No rows found (or more than one) for .single()" } };
      }
      return { data: clone(rows[0]), error: null };
    }
    if (this.wantSingle === "maybeSingle") {
      if (rows.length > 1) {
        return { data: null, error: { message: "More than one row found for .maybeSingle()" } };
      }
      return { data: rows[0] ? clone(rows[0]) : null, error: null };
    }
    return { data: rows.map(clone), error: null };
  }

  private execSelect() {
    let rows = this.applyFilters(this.rows());
    if (this.selectOpts?.head) {
      // count-only query (e.g. { count: "exact", head: true }) — rows are
      // not returned, only the count of matching rows.
      return { data: null, error: null, count: rows.length };
    }
    rows = this.applyOrderAndLimit(rows);
    const shaped = this.shapeRows(rows);
    return { ...shaped, count: this.selectOpts?.count ? rows.length : null };
  }

  private execInsert() {
    const store = this.rows();
    const items = toArray(this.payload ?? {});
    const defaults = TABLE_DEFAULTS[this.table];
    const ts = nowIso();
    const inserted = items.map((item) => {
      const row: Row = {
        id: crypto.randomUUID(),
        ...(OWNS_OWNER_ID.has(this.table) ? { owner_id: DEMO_OWNER_ID } : {}),
        created_at: ts,
        updated_at: ts,
        ...(defaults ? defaults() : {}),
        ...item,
      };
      store.push(row);
      return row;
    });
    if (!this.selectRequested) return { data: null, error: null };
    return this.shapeRows(inserted);
  }

  private execUpdate() {
    const store = this.rows();
    const matches = this.applyFilters(store);
    const ts = nowIso();
    matches.forEach((r) => Object.assign(r, this.payload, { updated_at: ts }));
    if (!this.selectRequested) return { data: null, error: null };
    return this.shapeRows(matches);
  }

  private execUpsert() {
    const store = this.rows();
    const items = toArray(this.payload ?? {});
    const conflictCols = (this.upsertOnConflict ?? "id").split(",").map((c) => c.trim());
    const defaults = TABLE_DEFAULTS[this.table];
    const ts = nowIso();
    const results = items.map((item) => {
      const existing = store.find((r) => conflictCols.every((c) => r[c] === item[c]));
      if (existing) {
        Object.assign(existing, item, { updated_at: ts });
        return existing;
      }
      const row: Row = {
        id: crypto.randomUUID(),
        ...(OWNS_OWNER_ID.has(this.table) ? { owner_id: DEMO_OWNER_ID } : {}),
        created_at: ts,
        updated_at: ts,
        ...(defaults ? defaults() : {}),
        ...item,
      };
      store.push(row);
      return row;
    });
    if (!this.selectRequested) return { data: null, error: null };
    return this.shapeRows(results);
  }

  private execDelete() {
    const store = this.rows();
    const matches = new Set(this.applyFilters(store));
    for (let i = store.length - 1; i >= 0; i--) {
      if (matches.has(store[i])) store.splice(i, 1);
    }
    if (!this.selectRequested) return { data: null, error: null };
    return this.shapeRows([...matches]);
  }

  private execute(): { data: unknown; error: { message: string } | null; count?: number | null } {
    switch (this.op) {
      case "select":
        return this.execSelect();
      case "insert":
        return this.execInsert();
      case "update":
        return this.execUpdate();
      case "upsert":
        return this.execUpsert();
      case "delete":
        return this.execDelete();
    }
  }

  then<TResult1 = { data: unknown; error: { message: string } | null; count?: number | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: { message: string } | null; count?: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    let result: { data: unknown; error: { message: string } | null; count?: number | null };
    try {
      result = this.execute();
    } catch (err) {
      return Promise.resolve(
        onrejected ? onrejected(err) : (Promise.reject(err) as unknown as TResult2)
      ) as PromiseLike<TResult1 | TResult2>;
    }
    return Promise.resolve(onfulfilled ? onfulfilled(result) : (result as unknown as TResult1));
  }
}

// ---------------------------------------------------------------------------
// Auth mock — single seeded "owner" user, always signed in.
// ---------------------------------------------------------------------------
function demoUser() {
  const email = process.env.ALLOWED_USER_EMAIL || "demo@scoutbase.local";
  return {
    id: DEMO_OWNER_ID,
    email,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: nowIso(),
  };
}

const demoAuth = {
  async getUser() {
    return { data: { user: demoUser() }, error: null };
  },
  async signInWithPassword(_creds: { email: string; password: string }) {
    return { data: { user: demoUser(), session: null }, error: null };
  },
  async signOut() {
    return { error: null };
  },
  admin: {
    async listUsers(_opts?: { page?: number; perPage?: number }) {
      return { data: { users: [demoUser()] }, error: null };
    },
    async getUserById(_id: string) {
      return { data: { user: demoUser() }, error: null };
    },
  },
};

export interface MockSupabaseClient {
  from(table: string): MockQueryBuilder;
  auth: typeof demoAuth;
}

export function createMockSupabaseClient(): MockSupabaseClient {
  return {
    from(table: string) {
      return new MockQueryBuilder(table as DemoTable);
    },
    auth: demoAuth,
  };
}
