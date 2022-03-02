export interface XataRecord {
  id: string;
  xata: {
    version: number;
  };
  read(): Promise<this>;
  update(data: Selectable<this>): Promise<this>;
  delete(): Promise<void>;
}

export type Queries<T> = {
  [key in keyof T as T[key] extends Query<infer A, infer B> ? key : never]: T[key];
};

export type OmitQueries<T> = {
  [key in keyof T as T[key] extends Query<infer A, infer B> ? never : key]: T[key];
};

export type OmitLinks<T> = {
  [key in keyof T as T[key] extends XataRecord ? never : key]: T[key];
};

export type OmitMethods<T> = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [key in keyof T as T[key] extends Function ? never : key]: T[key];
};

export type Selectable<T> = Omit<OmitQueries<OmitMethods<T>>, 'id' | 'xata'>;

export type Select<T, K extends keyof T> = Pick<T, K> & Queries<T> & XataRecord;

export type Include<T> = {
  [key in keyof T as T[key] extends XataRecord ? key : never]?: boolean | Array<keyof Selectable<T[key]>>;
};

type SortDirection = 'asc' | 'desc';

type Operator =
  | '$gt'
  | '$lt'
  | '$ge'
  | '$le'
  | '$exists'
  | '$notExists'
  | '$endsWith'
  | '$startsWith'
  | '$pattern'
  | '$is'
  | '$isNot'
  | '$contains'
  | '$includes'
  | '$includesSubstring'
  | '$includesPattern'
  | '$includesAll';

// TODO: restrict constraints depending on type?
// E.g. startsWith cannot be used with numbers
type Constraint<T> = { [key in Operator]?: T };

type DeepConstraint<T> = T extends Record<string, any>
  ? {
      [key in keyof T]?: T[key] | DeepConstraint<T[key]>;
    }
  : Constraint<T>;

type ComparableType = number | Date;

export const gt = <T extends ComparableType>(value: T): Constraint<T> => ({ $gt: value });
export const ge = <T extends ComparableType>(value: T): Constraint<T> => ({ $ge: value });
export const gte = <T extends ComparableType>(value: T): Constraint<T> => ({ $ge: value });
export const lt = <T extends ComparableType>(value: T): Constraint<T> => ({ $lt: value });
export const lte = <T extends ComparableType>(value: T): Constraint<T> => ({ $le: value });
export const le = <T extends ComparableType>(value: T): Constraint<T> => ({ $le: value });
export const exists = (column: string): Constraint<string> => ({ $exists: column });
export const notExists = (column: string): Constraint<string> => ({ $notExists: column });
export const startsWith = (value: string): Constraint<string> => ({ $startsWith: value });
export const endsWith = (value: string): Constraint<string> => ({ $endsWith: value });
export const pattern = (value: string): Constraint<string> => ({ $pattern: value });
export const is = <T>(value: T): Constraint<T> => ({ $is: value });
export const isNot = <T>(value: T): Constraint<T> => ({ $isNot: value });
export const contains = <T>(value: T): Constraint<T> => ({ $contains: value });

// TODO: these can only be applied to columns of type "multiple"
export const includes = (value: string): Constraint<string> => ({ $includes: value });
export const includesSubstring = (value: string): Constraint<string> => ({ $includesSubstring: value });
export const includesPattern = (value: string): Constraint<string> => ({ $includesPattern: value });
export const includesAll = (value: string): Constraint<string> => ({ $includesAll: value });

type FilterConstraints<T> = {
  [key in keyof T]?: T[key] extends Record<string, any> ? FilterConstraints<T[key]> : T[key] | DeepConstraint<T[key]>;
};

type CursorNavigationOptions = { first?: string } | { last?: string } | { after?: string; before?: string };
type OffsetNavigationOptions = { size?: number; offset?: number };
type PaginationOptions = CursorNavigationOptions & OffsetNavigationOptions;

type BulkQueryOptions<T> = {
  page?: PaginationOptions;
  filter?: FilterConstraints<T>;
  sort?:
    | {
        column: keyof T;
        direction?: SortDirection;
      }
    | keyof T;
};

type QueryOrConstraint<T, R> = Query<T, R> | Constraint<T>;

type QueryMeta = { page: { cursor: string; more: boolean } };

class Page<T, R> {
  readonly query: Query<T, R>;
  readonly meta: QueryMeta;
  readonly records: R[];

  constructor(query: Query<T, R>, meta: QueryMeta, records: R[] = []) {
    this.query = query;
    this.meta = meta;
    this.records = records;
  }

  async nextPage(options: OffsetNavigationOptions = {}): Promise<Page<T, R>> {
    const { size, offset } = options;
    return this.query.getPaginated({ page: { size, offset, after: this.meta.page.cursor } });
  }

  async prevPage(options: OffsetNavigationOptions = {}): Promise<Page<T, R>> {
    const { size, offset } = options;
    return this.query.getPaginated({ page: { size, offset, before: this.meta.page.cursor } });
  }

  async firstPage(options: OffsetNavigationOptions = {}): Promise<Page<T, R>> {
    const { size, offset } = options;
    return this.query.getPaginated({ page: { size, offset, first: this.meta.page.cursor } });
  }

  async lastPage(options: OffsetNavigationOptions = {}): Promise<Page<T, R>> {
    const { size, offset } = options;
    return this.query.getPaginated({ page: { size, offset, last: this.meta.page.cursor } });
  }
}

export class Query<T, R = T> {
  table: string;
  repository: Repository<T>;

  readonly $any?: QueryOrConstraint<T, R>[];
  readonly $all?: QueryOrConstraint<T, R>[];
  readonly $not?: QueryOrConstraint<T, R>[];
  readonly $none?: QueryOrConstraint<T, R>[];
  readonly $sort?: Record<string, SortDirection>;

  constructor(repository: Repository<T> | null, table: string, data: Partial<Query<T, R>>, parent?: Query<T, R>) {
    if (repository) {
      this.repository = repository;
    } else {
      this.repository = this as any;
    }
    this.table = table;

    // For some reason Object.assign(this, parent) didn't work in this case
    // so doing all this manually:
    this.$any = parent?.$any;
    this.$all = parent?.$all;
    this.$not = parent?.$not;
    this.$none = parent?.$none;
    this.$sort = parent?.$sort;

    Object.assign(this, data);
    // These bindings are used to support deconstructing
    // const { any, not, filter, sort } = xata.users.query()
    this.any = this.any.bind(this);
    this.all = this.all.bind(this);
    this.not = this.not.bind(this);
    this.filter = this.filter.bind(this);
    this.sort = this.sort.bind(this);
    this.none = this.none.bind(this);

    Object.defineProperty(this, 'table', { enumerable: false });
    Object.defineProperty(this, 'repository', { enumerable: false });
  }

  any(...queries: Query<T, R>[]): Query<T, R> {
    return new Query<T, R>(
      this.repository,
      this.table,
      {
        $any: (this.$any || []).concat(queries)
      },
      this
    );
  }

  all(...queries: Query<T, R>[]): Query<T, R> {
    return new Query<T, R>(
      this.repository,
      this.table,
      {
        $all: (this.$all || []).concat(queries)
      },
      this
    );
  }

  not(...queries: Query<T, R>[]): Query<T, R> {
    return new Query<T, R>(
      this.repository,
      this.table,
      {
        $not: (this.$not || []).concat(queries)
      },
      this
    );
  }

  none(...queries: Query<T, R>[]): Query<T, R> {
    return new Query<T, R>(
      this.repository,
      this.table,
      {
        $none: (this.$none || []).concat(queries)
      },
      this
    );
  }

  filter(constraints: FilterConstraints<T>): Query<T, R>;
  filter<F extends keyof T>(column: F, value: FilterConstraints<T[F]> | DeepConstraint<T[F]>): Query<T, R>;
  filter(a: any, b?: any): Query<T, R> {
    if (arguments.length === 1) {
      const constraints = a as FilterConstraints<T>;
      const queries: QueryOrConstraint<T, R>[] = [];
      for (const [column, constraint] of Object.entries(constraints)) {
        queries.push({ [column]: constraint });
      }
      return new Query<T, R>(
        this.repository,
        this.table,
        {
          $all: (this.$all || []).concat(queries)
        },
        this
      );
    } else {
      const column = a as keyof T;
      const value = b as Partial<T[keyof T]> | Constraint<T[keyof T]>;
      return new Query<T, R>(
        this.repository,
        this.table,
        {
          $all: (this.$all || []).concat({ [column]: value })
        },
        this
      );
    }
  }

  sort<F extends keyof T>(column: F, direction: SortDirection): Query<T, R> {
    const sort = { ...this.$sort, [column]: direction };
    const q = new Query<T, R>(
      this.repository,
      this.table,
      {
        $sort: sort
      },
      this
    );

    return q;
  }

  async getPaginated(options?: BulkQueryOptions<T>): Promise<Page<T, R>> {
    return this.repository.query(this, options);
  }

  async getMany(options?: BulkQueryOptions<T>): Promise<R[]> {
    const { records } = await this.getPaginated(options);
    return records;
  }

  async getOne(options: Omit<BulkQueryOptions<T>, 'page'> = {}): Promise<R | null> {
    const records = await this.getMany({ ...options, page: { size: 1 } });
    return records[0] || null;
  }

  async deleteAll(): Promise<number> {
    // TODO: Return number of affected rows
    return 0;
  }

  include(columns: Include<T>) {
    // TODO
    return this;
  }

  async firstPage(size?: number): Promise<Page<T, R>> {
    return this.getPaginated({ page: { size, offset: 0 } });
  }

  async lastPage(size?: number): Promise<Page<T, R>> {
    return this.getPaginated({ page: { size, before: 'end' } });
  }
}

export abstract class Repository<T> extends Query<T, Selectable<T>> {
  select<K extends keyof Selectable<T>>(...columns: K[]) {
    return new Query<T, Select<T, K>>(this.repository, this.table, {});
  }

  abstract create(object: Selectable<T>): Promise<T>;

  abstract read(id: string): Promise<T | null>;

  abstract update(id: string, object: Partial<T>): Promise<T>;

  abstract delete(id: string): void;

  // Used by the Query object internally
  abstract query<R>(query: Query<T, R>, options?: BulkQueryOptions<T>): Promise<Page<T, R>>;
}

export class RestRepository<T> extends Repository<T> {
  client: BaseClient<any>;
  fetch: any;

  constructor(client: BaseClient<any>, table: string) {
    super(null, table, {});
    this.client = client;

    const { fetch } = client.options;

    if (fetch) {
      this.fetch = fetch;
    } else if (typeof window === 'object') {
      this.fetch = window.fetch;
    } else if (typeof require === 'function') {
      try {
        this.fetch = require('node-fetch');
      } catch (err) {
        try {
          this.fetch = require('cross-fetch');
        } catch (err) {
          throw new Error('No fetch implementation found. Please provide one in the constructor');
        }
      }
    }

    Object.defineProperty(this, 'client', { enumerable: false });
    Object.defineProperty(this, 'fetch', { enumerable: false });
    Object.defineProperty(this, 'hostname', { enumerable: false });
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T | undefined> {
    const { databaseURL } = this.client.options;

    const resp: Response = await this.fetch(`${databaseURL}${path}`, {
      method,
      headers: {
        Accept: '*/*',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.client.options.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      try {
        const json = await resp.json();
        const message = json.message;
        if (typeof message === 'string') {
          throw new XataError(message, resp.status);
        }
      } catch (err) {
        if (err instanceof XataError) throw err;
        // Ignore errors for other reasons.
        // For example if the response's body cannot be parsed as JSON
      }
      throw new XataError(resp.statusText, resp.status);
    }

    if (resp.status === 204) return undefined;
    return resp.json();
  }

  select<K extends keyof T>(...columns: K[]) {
    return new Query<T, Select<T, K>>(this.repository, this.table, {});
  }

  async create(object: T): Promise<T> {
    const body = { ...object } as Record<string, unknown>;
    for (const key of Object.keys(body)) {
      const value = body[key];
      if (value && typeof value === 'object' && typeof (value as Record<string, unknown>).id === 'string') {
        body[key] = (value as XataRecord).id;
      }
    }

    const response = await this.request<{
      id: string;
      xata: { version: number };
    }>('POST', `/tables/${this.table}/data`, body);
    if (!response) {
      throw new Error("The server didn't return any data for the query");
    }

    // TODO: Review this, not sure we are properly initializing the object
    return this.client.initObject(this.table, response);
  }

  async read(id: string): Promise<T | null> {
    try {
      const response = await this.request<
        T & { id: string; xata: { version: number; table?: string; warnings?: string[] } }
      >('GET', `/tables/${this.table}/data/${id}`);
      if (!response) return null;

      return this.client.initObject(this.table, response);
    } catch (err) {
      if ((err as XataError).status === 404) return null;
      throw err;
    }
  }

  async update(id: string, object: Partial<T>): Promise<T> {
    const response = await this.request<{
      id: string;
      xata: { version: number };
    }>('PUT', `/tables/${this.table}/data/${id}`, object);
    if (!response) {
      throw new Error("The server didn't return any data for the query");
    }

    // TODO: Review this, not sure we are properly initializing the object
    return this.client.initObject(this.table, response);
  }

  async delete(id: string) {
    // TODO: Return boolean?
    await this.request('DELETE', `/tables/${this.table}/data/${id}`);
  }

  // TODO: Use options
  async query<R>(query: Query<T, R>, options?: BulkQueryOptions<T>): Promise<Page<T, R>> {
    const filter = {
      $any: query.$any,
      $all: query.$all,
      $not: query.$not,
      $none: query.$none
    };

    const body = {
      filter: Object.values(filter).some(Boolean) ? filter : undefined,
      sort: query.$sort
    };

    const response = await this.request<{
      records: object[];
      meta: { page: { cursor: string; more: boolean } };
    }>('POST', `/tables/${this.table}/query`, body);
    if (!response) {
      throw new Error("The server didn't return any data for the query");
    }

    const { meta, records: objects } = response;
    const records = objects.map((record) => this.client.initObject<R>(this.table, record));

    return new Page(query, meta, records);
  }
}

interface RepositoryFactory {
  createRepository<T>(client: BaseClient<any>, table: string): Repository<T>;
}

export class RestRespositoryFactory implements RepositoryFactory {
  createRepository<T>(client: BaseClient<any>, table: string): Repository<T> {
    return new RestRepository<T>(client, table);
  }
}

export type XataClientOptions = {
  fetch?: unknown;
  databaseURL: string;
  apiKey: string;
  repositoryFactory?: RepositoryFactory;
};

export class BaseClient<D extends Record<string, Repository<any>>> {
  options: XataClientOptions;
  private links: Links;
  db!: D;

  constructor(options: XataClientOptions, links: Links) {
    this.options = options;
    this.links = links;
  }

  public initObject<T>(table: string, object: object) {
    const o: Record<string, unknown> = {};
    Object.assign(o, object);

    const tableLinks = this.links[table] || [];
    for (const link of tableLinks) {
      const [field, linkTable] = link;
      const value = o[field];

      if (value && typeof value === 'object') {
        const { id } = value as any;
        if (Object.keys(value).find((col) => col === 'id')) {
          o[field] = this.initObject(linkTable, value);
        } else if (id) {
          o[field] = {
            id,
            get: () => {
              this.db[linkTable].read(id);
            }
          };
        }
      }
    }

    const db = this.db;
    o.read = function () {
      return db[table].read(o['id'] as string);
    };
    o.update = function (data: any) {
      return db[table].update(o['id'] as string, data);
    };
    o.delete = function () {
      return db[table].delete(o['id'] as string);
    };

    for (const prop of ['read', 'update', 'delete']) {
      Object.defineProperty(o, prop, { enumerable: false });
    }

    // TODO: links and rev links

    Object.freeze(o);
    return o as T;
  }
}

export class XataError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export type Links = Record<string, Array<string[]>>;
