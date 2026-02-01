// Mock database for local development/testing
// Uses in-memory storage

interface Agent {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  owner_twitter: string | null;
  verified: boolean;
  a2a_endpoint: string | null;
  api_key_hash: string;
  created_at: string;
}

interface AgentSkill {
  id: string;
  agent_id: string;
  skill: string;
  platform_verified: boolean;
  created_at: string;
}

interface Endorsement {
  id: string;
  from_agent_id: string;
  to_agent_id: string;
  skill: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface Connection {
  id: string;
  agent_a: string;
  agent_b: string;
  created_at: string;
}

interface VerificationCode {
  id: string;
  agent_id: string;
  code: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

interface ProfileView {
  id: string;
  viewed_agent_id: string;
  viewer_agent_id: string | null;
  viewer_ip: string | null;
  viewed_at: string;
}

// In-memory storage
const store = {
  agents: new Map<string, Agent>(),
  agent_skills: new Map<string, AgentSkill>(),
  endorsements: new Map<string, Endorsement>(),
  connections: new Map<string, Connection>(),
  verification_codes: new Map<string, VerificationCode>(),
  profile_views: new Map<string, ProfileView>(),
};

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Mock Supabase-like query builder
class MockQueryBuilder {
  private table: string;
  private filters: Array<(row: any) => boolean> = [];
  private selectedColumns: string[] | null = null;
  private limitCount: number | null = null;
  private offsetCount: number = 0;
  private orderColumn: string | null = null;
  private orderAsc: boolean = true;
  private countMode: 'exact' | null = null;
  private headMode: boolean = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns: string = '*', options?: { count?: 'exact'; head?: boolean }) {
    this.selectedColumns = columns === '*' ? null : columns.split(',').map(c => c.trim());
    if (options?.count) this.countMode = options.count;
    if (options?.head) this.headMode = options.head;
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push((row) => row[column] !== value);
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }

  or(filter: string) {
    // Parse simple or filters like "agent_a.eq.xxx,agent_b.eq.xxx"
    const conditions = filter.split(',').map(c => {
      const match = c.match(/(\w+)\.eq\.(.+)/);
      if (match) {
        return { column: match[1], value: match[2] };
      }
      return null;
    }).filter(Boolean);

    this.filters.push((row) =>
      conditions.some(c => c && row[c.column] === c.value)
    );
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push((row) => row[column] >= value);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderColumn = column;
    this.orderAsc = options?.ascending ?? true;
    return this;
  }

  range(from: number, to: number) {
    this.offsetCount = from;
    this.limitCount = to - from + 1;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    return this.execute().then(result => {
      if (result.data && Array.isArray(result.data)) {
        return { data: result.data[0] || null, error: result.error };
      }
      return result;
    });
  }

  insert(data: any) {
    const id = generateId();
    const now = new Date().toISOString();
    const row = { id, ...data, created_at: now };

    const storeMap = (store as any)[this.table];
    if (storeMap) {
      storeMap.set(id, row);
    }

    // Return a chainable object for insert
    const self = this;
    return {
      select() {
        return {
          single() {
            return Promise.resolve({ data: row, error: null });
          },
          then(resolve: (value: any) => void) {
            return Promise.resolve({ data: [row], error: null }).then(resolve);
          }
        };
      },
      then(resolve: (value: any) => void) {
        return Promise.resolve({ data: row, error: null }).then(resolve);
      }
    };
  }

  update(data: any) {
    const storeMap = (store as any)[this.table] as Map<string, any>;

    let updatedRow: any = null;
    if (storeMap) {
      for (const [key, row] of storeMap) {
        if (this.filters.every(f => f(row))) {
          const updated = { ...row, ...data };
          storeMap.set(key, updated);
          updatedRow = updated;
          break;
        }
      }
    }

    // Return a chainable object for update
    return {
      select() {
        return {
          single() {
            return Promise.resolve({ data: updatedRow, error: null });
          },
          then(resolve: (value: any) => void) {
            return Promise.resolve({ data: updatedRow ? [updatedRow] : [], error: null }).then(resolve);
          }
        };
      },
      then(resolve: (value: any) => void) {
        return Promise.resolve({ data: updatedRow, error: null }).then(resolve);
      }
    };
  }

  async delete() {
    const storeMap = (store as any)[this.table] as Map<string, any>;
    if (!storeMap) return { error: null };

    for (const [key, row] of storeMap) {
      if (this.filters.every(f => f(row))) {
        storeMap.delete(key);
      }
    }

    return { error: null };
  }

  private async execute() {
    const storeMap = (store as any)[this.table] as Map<string, any>;
    if (!storeMap) {
      return { data: [], error: null, count: 0 };
    }

    let results = Array.from(storeMap.values());

    // Apply filters
    for (const filter of this.filters) {
      results = results.filter(filter);
    }

    const count = results.length;

    // Apply ordering
    if (this.orderColumn) {
      results.sort((a, b) => {
        const aVal = a[this.orderColumn!];
        const bVal = b[this.orderColumn!];
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return this.orderAsc ? cmp : -cmp;
      });
    }

    // Apply offset and limit
    if (this.offsetCount > 0) {
      results = results.slice(this.offsetCount);
    }
    if (this.limitCount !== null) {
      results = results.slice(0, this.limitCount);
    }

    if (this.headMode) {
      return { data: null, error: null, count };
    }

    return { data: results, error: null, count };
  }

  then(resolve: (value: any) => void) {
    return this.execute().then(resolve);
  }
}

export const mockSupabase = {
  from(table: string) {
    return new MockQueryBuilder(table);
  }
};

// Export for testing
export function clearMockData() {
  store.agents.clear();
  store.agent_skills.clear();
  store.endorsements.clear();
  store.connections.clear();
  store.verification_codes.clear();
  store.profile_views.clear();
}

export function getMockStore() {
  return store;
}
