import { SchemaPluginResult } from '.';
import {
  bulkInsertTableRecords,
  deleteRecord,
  getBranchDetails,
  getRecord,
  insertRecord,
  insertRecordWithID,
  queryTable,
  Schemas,
  searchTable,
  updateRecordWithID,
  upsertRecordWithID
} from '../api';
import { FetcherExtraProps } from '../api/fetcher';
import { FuzzinessExpression, HighlightExpression, RecordsMetadata, Schema } from '../api/schemas';
import { XataPluginOptions } from '../plugins';
import { isObject, isString } from '../util/lang';
import { Dictionary } from '../util/types';
import { CacheImpl } from './cache';
import { Filter } from './filters';
import { Page } from './pagination';
import { Query } from './query';
import { BaseData, EditableData, Identifiable, isIdentifiable, XataRecord } from './record';
import { SelectedPick } from './selection';
import { buildSortFilter } from './sorting';

/**
 * Common interface for performing operations on a table.
 */
export abstract class Repository<Data extends BaseData, Record extends XataRecord = Data & XataRecord> extends Query<
  Record,
  Readonly<SelectedPick<Record, ['*']>>
> {
  /*
   * Creates a single record in the table.
   * @param object Object containing the column names with their values to be stored in the table.
   * @returns The full persisted record.
   */
  abstract create(object: EditableData<Data> & Partial<Identifiable>): Promise<Readonly<SelectedPick<Record, ['*']>>>;

  /**
   * Creates a single record in the table with a unique id.
   * @param id The unique id.
   * @param object Object containing the column names with their values to be stored in the table.
   * @returns The full persisted record.
   */
  abstract create(id: string, object: EditableData<Data>): Promise<Readonly<SelectedPick<Record, ['*']>>>;

  /**
   * Creates multiple records in the table.
   * @param objects Array of objects with the column names and the values to be stored in the table.
   * @returns Array of the persisted records.
   */
  abstract create(
    objects: Array<EditableData<Data> & Partial<Identifiable>>
  ): Promise<Readonly<SelectedPick<Record, ['*']>>[]>;

  /**
   * Queries a single record from the table given its unique id.
   * @param id The unique id.
   * @returns The persisted record for the given id or null if the record could not be found.
   */
  abstract read(id: string): Promise<Readonly<SelectedPick<Record, ['*']> | null>>;

  /**
   * Queries multiple records from the table given their unique id.
   * @param ids The unique ids array.
   * @returns The persisted records for the given ids (if a record could not be found it is not returned).
   */
  abstract read(ids: string[]): Promise<Array<Readonly<SelectedPick<Record, ['*']>>>>;

  /**
   * Partially update a single record.
   * @param object An object with its id and the columns to be updated.
   * @returns The full persisted record.
   */
  abstract update(object: Partial<EditableData<Data>> & Identifiable): Promise<Readonly<SelectedPick<Record, ['*']>>>;

  /**
   * Partially update a single record given its unique id.
   * @param id The unique id.
   * @param object The column names and their values that have to be updated.
   * @returns The full persisted record.
   */
  abstract update(id: string, object: Partial<EditableData<Data>>): Promise<Readonly<SelectedPick<Record, ['*']>>>;

  /**
   * Partially updates multiple records.
   * @param objects An array of objects with their ids and columns to be updated.
   * @returns Array of the persisted records.
   */
  abstract update(
    objects: Array<Partial<EditableData<Data>> & Identifiable>
  ): Promise<Readonly<SelectedPick<Record, ['*']>>[]>;

  /**
   * Creates or updates a single record. If a record exists with the given id,
   * it will be update, otherwise a new record will be created.
   * @param object Object containing the column names with their values to be persisted in the table.
   * @returns The full persisted record.
   */
  abstract createOrUpdate(object: EditableData<Data> & Identifiable): Promise<Readonly<SelectedPick<Record, ['*']>>>;

  /**
   * Creates or updates a single record. If a record exists with the given id,
   * it will be update, otherwise a new record will be created.
   * @param id A unique id.
   * @param object The column names and the values to be persisted.
   * @returns The full persisted record.
   */
  abstract createOrUpdate(id: string, object: EditableData<Data>): Promise<Readonly<SelectedPick<Record, ['*']>>>;

  /**
   * Creates or updates a single record. If a record exists with the given id,
   * it will be update, otherwise a new record will be created.
   * @param objects Array of objects with the column names and the values to be stored in the table.
   * @returns Array of the persisted records.
   */
  abstract createOrUpdate(
    objects: Array<EditableData<Data> & Identifiable>
  ): Promise<Readonly<SelectedPick<Record, ['*']>>[]>;

  /**
   * Deletes a record given its unique id.
   * @param id The unique id.
   * @throws If the record could not be found or there was an error while performing the deletion.
   */
  abstract delete(id: string): Promise<void>;

  /**
   * Deletes a record given its unique id.
   * @param id An object with a unique id.
   * @throws If the record could not be found or there was an error while performing the deletion.
   */
  abstract delete(id: Identifiable): Promise<void>;

  /**
   * Deletes a record given a list of unique ids.
   * @param ids The array of unique ids.
   * @throws If the record could not be found or there was an error while performing the deletion.
   */
  abstract delete(ids: string[]): Promise<void>;

  /**
   * Deletes a record given a list of unique ids.
   * @param ids An array of objects with unique ids.
   * @throws If the record could not be found or there was an error while performing the deletion.
   */
  abstract delete(ids: Identifiable[]): Promise<void>;

  /**
   * Search for records in the table.
   * @param query The query to search for.
   * @param options The options to search with (like: fuzziness)
   * @returns The found records.
   */
  abstract search(
    query: string,
    options?: { fuzziness?: FuzzinessExpression; highlight?: HighlightExpression; filter?: Filter<Record> }
  ): Promise<SelectedPick<Record, ['*']>[]>;

  abstract query<Result extends XataRecord>(query: Query<Record, Result>): Promise<Page<Record, Result>>;
}

export class RestRepository<Data extends BaseData, Record extends XataRecord = Data & XataRecord>
  extends Query<Record, SelectedPick<Record, ['*']>>
  implements Repository<Data, Record>
{
  #table: string;
  #getFetchProps: () => Promise<FetcherExtraProps>;
  db: SchemaPluginResult<any>;
  #cache: CacheImpl;
  #schema?: Schema;

  constructor(options: { table: string; db: SchemaPluginResult<any>; pluginOptions: XataPluginOptions }) {
    super(null, options.table, {});

    this.#table = options.table;
    this.#getFetchProps = options.pluginOptions.getFetchProps;
    this.db = options.db;
    this.#cache = options.pluginOptions.cache;
  }

  async create(object: EditableData<Data>): Promise<SelectedPick<Record, ['*']>>;
  async create(recordId: string, object: EditableData<Data>): Promise<SelectedPick<Record, ['*']>>;
  async create(objects: EditableData<Data>[]): Promise<SelectedPick<Record, ['*']>[]>;
  async create(
    a: string | EditableData<Data> | EditableData<Data>[],
    b?: EditableData<Data>
  ): Promise<SelectedPick<Record, ['*']> | SelectedPick<Record, ['*']>[]> {
    // Create many records
    if (Array.isArray(a)) {
      if (a.length === 0) return [];

      const records = await this.#bulkInsertTableRecords(a);
      await Promise.all(records.map((record) => this.#setCacheRecord(record)));

      return records;
    }

    // Create one record with id as param
    if (isString(a) && isObject(b)) {
      if (a === '') throw new Error("The id can't be empty");
      const record = await this.#insertRecordWithId(a, b);
      await this.#setCacheRecord(record);

      return record;
    }

    // Create one record with id as property
    if (isObject(a) && isString(a.id)) {
      if (a.id === '') throw new Error("The id can't be empty");
      const record = await this.#insertRecordWithId(a.id, { ...a, id: undefined });
      await this.#setCacheRecord(record);

      return record;
    }

    // Create one record without id
    if (isObject(a)) {
      const record = await this.#insertRecordWithoutId(a);
      await this.#setCacheRecord(record);

      return record;
    }

    throw new Error('Invalid arguments for create method');
  }

  async #insertRecordWithoutId(object: EditableData<Data>): Promise<SelectedPick<Record, ['*']>> {
    const fetchProps = await this.#getFetchProps();

    const record = transformObjectLinks(object);

    const response = await insertRecord({
      pathParams: {
        workspace: '{workspaceId}',
        dbBranchName: '{dbBranch}',
        tableName: this.#table
      },
      body: record,
      ...fetchProps
    });

    const finalObject = await this.read(response.id);
    if (!finalObject) {
      throw new Error('The server failed to save the record');
    }

    return finalObject;
  }

  async #insertRecordWithId(recordId: string, object: EditableData<Data>): Promise<SelectedPick<Record, ['*']>> {
    const fetchProps = await this.#getFetchProps();

    const record = transformObjectLinks(object);

    const response = await insertRecordWithID({
      pathParams: {
        workspace: '{workspaceId}',
        dbBranchName: '{dbBranch}',
        tableName: this.#table,
        recordId
      },
      body: record,
      queryParams: { createOnly: true },
      ...fetchProps
    });

    const finalObject = await this.read(response.id);
    if (!finalObject) {
      throw new Error('The server failed to save the record');
    }

    return finalObject;
  }

  async #bulkInsertTableRecords(objects: EditableData<Data>[]): Promise<SelectedPick<Record, ['*']>[]> {
    const fetchProps = await this.#getFetchProps();

    const records = objects.map((object) => transformObjectLinks(object));

    const response = await bulkInsertTableRecords({
      pathParams: { workspace: '{workspaceId}', dbBranchName: '{dbBranch}', tableName: this.#table },
      body: { records },
      ...fetchProps
    });

    const finalObjects = await this.any(...response.recordIDs.map((id) => this.filter('id', id))).getAll();
    if (finalObjects.length !== objects.length) {
      throw new Error('The server failed to save some records');
    }

    return finalObjects;
  }

  // TODO: Add column support: https://github.com/xataio/openapi/issues/139
  async read(recordId: string): Promise<SelectedPick<Record, ['*']> | null>;
  async read(recordIds: string[]): Promise<Array<Readonly<SelectedPick<Record, ['*']>>>>;
  async read(a: string | string[]) {
    // Read many records
    if (Array.isArray(a)) {
      if (a.length === 0) return [];

      return this.getAll({ filter: { id: { $any: a } } });
    }

    // Read one record
    if (isString(a)) {
      const cacheRecord = await this.#getCacheRecord(a);
      if (cacheRecord) return cacheRecord;

      const fetchProps = await this.#getFetchProps();

      try {
        const response = await getRecord({
          pathParams: { workspace: '{workspaceId}', dbBranchName: '{dbBranch}', tableName: this.#table, recordId: a },
          ...fetchProps
        });

        const schema = await this.#getSchema();
        return initObject(this.db, schema, this.#table, response);
      } catch (e) {
        if (isObject(e) && e.status === 404) {
          return null;
        }

        throw e;
      }
    }
  }

  async update(object: Partial<EditableData<Data>> & Identifiable): Promise<SelectedPick<Record, ['*']>>;
  async update(recordId: string, object: Partial<EditableData<Data>>): Promise<SelectedPick<Record, ['*']>>;
  async update(objects: Array<Partial<EditableData<Data>> & Identifiable>): Promise<SelectedPick<Record, ['*']>[]>;
  async update(
    a: string | (Partial<EditableData<Data>> & Identifiable) | Array<Partial<EditableData<Data>> & Identifiable>,
    b?: Partial<EditableData<Data>>
  ): Promise<SelectedPick<Record, ['*']> | SelectedPick<Record, ['*']>[]> {
    // Update many records
    if (Array.isArray(a)) {
      if (a.length === 0) return [];

      if (a.length > 100) {
        // TODO: Implement bulk update when API has support for it
        console.warn('Bulk update operation is not optimized in the Xata API yet, this request might be slow');
      }
      return Promise.all(a.map((object) => this.update(object)));
    }

    // Update one record with id as param
    if (isString(a) && isObject(b)) {
      await this.#invalidateCache(a);
      const record = await this.#updateRecordWithID(a, b);
      await this.#setCacheRecord(record);

      return record;
    }

    // Update one record with id as property
    if (isObject(a) && isString(a.id)) {
      await this.#invalidateCache(a.id);
      const record = await this.#updateRecordWithID(a.id, { ...a, id: undefined });
      await this.#setCacheRecord(record);

      return record;
    }

    throw new Error('Invalid arguments for update method');
  }

  async #updateRecordWithID(
    recordId: string,
    object: Partial<EditableData<Data>>
  ): Promise<SelectedPick<Record, ['*']>> {
    const fetchProps = await this.#getFetchProps();

    const record = transformObjectLinks(object);

    const response = await updateRecordWithID({
      pathParams: { workspace: '{workspaceId}', dbBranchName: '{dbBranch}', tableName: this.#table, recordId },
      body: record,
      ...fetchProps
    });

    const item = await this.read(response.id);
    if (!item) throw new Error('The server failed to save the record');

    return item;
  }

  async createOrUpdate(object: EditableData<Data>): Promise<SelectedPick<Record, ['*']>>;
  async createOrUpdate(recordId: string, object: EditableData<Data>): Promise<SelectedPick<Record, ['*']>>;
  async createOrUpdate(objects: EditableData<Data>[]): Promise<SelectedPick<Record, ['*']>[]>;
  async createOrUpdate(
    a: string | EditableData<Data> | EditableData<Data>[],
    b?: EditableData<Data>
  ): Promise<SelectedPick<Record, ['*']> | SelectedPick<Record, ['*']>[]> {
    // Create or update many records
    if (Array.isArray(a)) {
      if (a.length === 0) return [];

      if (a.length > 100) {
        // TODO: Implement bulk update when API has support for it
        console.warn('Bulk update operation is not optimized in the Xata API yet, this request might be slow');
      }

      return Promise.all(a.map((object) => this.createOrUpdate(object)));
    }

    // Create or update one record with id as param
    if (isString(a) && isObject(b)) {
      await this.#invalidateCache(a);
      const record = await this.#upsertRecordWithID(a, b);
      await this.#setCacheRecord(record);

      return record;
    }

    // Create or update one record with id as property
    if (isObject(a) && isString(a.id)) {
      await this.#invalidateCache(a.id);
      const record = await this.#upsertRecordWithID(a.id, { ...a, id: undefined });
      await this.#setCacheRecord(record);

      return record;
    }

    throw new Error('Invalid arguments for createOrUpdate method');
  }

  async #upsertRecordWithID(recordId: string, object: EditableData<Data>): Promise<SelectedPick<Record, ['*']>> {
    const fetchProps = await this.#getFetchProps();

    const response = await upsertRecordWithID({
      pathParams: { workspace: '{workspaceId}', dbBranchName: '{dbBranch}', tableName: this.#table, recordId },
      body: object,
      ...fetchProps
    });

    const item = await this.read(response.id);
    if (!item) throw new Error('The server failed to save the record');

    return item;
  }

  async delete(a: string | Identifiable | Array<string | Identifiable>): Promise<void> {
    // Delete many records
    if (Array.isArray(a)) {
      if (a.length === 0) return;

      if (a.length > 100) {
        // TODO: Implement bulk delete when API has support for it
        console.warn('Bulk delete operation is not optimized in the Xata API yet, this request might be slow');
      }

      await Promise.all(a.map((id) => this.delete(id)));
      return;
    }

    // Delete one record with id as param
    if (isString(a)) {
      await this.#deleteRecord(a);
      await this.#invalidateCache(a);
      return;
    }

    // Delete one record with id as property
    if (isObject(a) && isString(a.id)) {
      await this.#deleteRecord(a.id);
      await this.#invalidateCache(a.id);
      return;
    }

    throw new Error('Invalid arguments for delete method');
  }

  async #deleteRecord(recordId: string): Promise<void> {
    const fetchProps = await this.#getFetchProps();

    await deleteRecord({
      pathParams: { workspace: '{workspaceId}', dbBranchName: '{dbBranch}', tableName: this.#table, recordId },
      ...fetchProps
    });
  }

  async search(
    query: string,
    options: { fuzziness?: FuzzinessExpression; highlight?: HighlightExpression; filter?: Filter<Record> } = {}
  ): Promise<SelectedPick<Record, ['*']>[]> {
    const fetchProps = await this.#getFetchProps();

    const { records } = await searchTable({
      pathParams: { workspace: '{workspaceId}', dbBranchName: '{dbBranch}', tableName: this.#table },
      body: {
        query,
        fuzziness: options.fuzziness,
        highlight: options.highlight,
        filter: options.filter as Schemas.FilterExpression
      },
      ...fetchProps
    });

    const schema = await this.#getSchema();
    return records.map((item) => initObject(this.db, schema, this.#table, item));
  }

  async query<Result extends XataRecord>(query: Query<Record, Result>): Promise<Page<Record, Result>> {
    const cacheQuery = await this.#getCacheQuery<Result>(query);
    if (cacheQuery) return new Page<Record, Result>(query, cacheQuery.meta, cacheQuery.records);

    const data = query.getQueryOptions();

    const body = {
      filter: Object.values(data.filter ?? {}).some(Boolean) ? data.filter : undefined,
      sort: data.sort !== undefined ? buildSortFilter(data.sort) : undefined,
      page: data.pagination,
      columns: data.columns
    };

    const fetchProps = await this.#getFetchProps();
    const { meta, records: objects } = await queryTable({
      pathParams: { workspace: '{workspaceId}', dbBranchName: '{dbBranch}', tableName: this.#table },
      body,
      ...fetchProps
    });

    const schema = await this.#getSchema();
    const records = objects.map((record) => initObject<Result>(this.db, schema, this.#table, record));
    await this.#setCacheQuery(query, meta, records);

    return new Page<Record, Result>(query, meta, records);
  }

  async #invalidateCache(recordId: string): Promise<void> {
    await this.#cache.delete(`rec_${this.#table}:${recordId}`);

    const cacheItems = await this.#cache.getAll();
    const queries = Object.entries(cacheItems).filter(([key]) => key.startsWith('query_'));

    for (const [key, value] of queries) {
      const ids = getIds(value);
      if (ids.includes(recordId)) await this.#cache.delete(key);
    }
  }

  async #setCacheRecord(record: SelectedPick<Record, ['*']>): Promise<void> {
    if (!this.#cache.cacheRecords) return;
    await this.#cache.set(`rec_${this.#table}:${record.id}`, record);
  }

  async #getCacheRecord(recordId: string): Promise<SelectedPick<Record, ['*']> | null> {
    if (!this.#cache.cacheRecords) return null;
    return this.#cache.get<SelectedPick<Record, ['*']>>(`rec_${this.#table}:${recordId}`);
  }

  async #setCacheQuery(query: Query<Record, XataRecord>, meta: RecordsMetadata, records: XataRecord[]): Promise<void> {
    await this.#cache.set(`query_${this.#table}:${query.key()}`, { date: new Date(), meta, records });
  }

  async #getCacheQuery<T extends XataRecord>(
    query: Query<Record, XataRecord>
  ): Promise<{ meta: RecordsMetadata; records: T[] } | null> {
    const key = `query_${this.#table}:${query.key()}`;
    const result = await this.#cache.get<{ date: Date; meta: RecordsMetadata; records: T[] }>(key);
    if (!result) return null;

    const { cache: ttl = this.#cache.defaultQueryTTL } = query.getQueryOptions();
    if (ttl < 0) return null;

    const hasExpired = result.date.getTime() + ttl < Date.now();
    return hasExpired ? null : result;
  }

  async #getSchema(): Promise<Schema> {
    if (this.#schema) return this.#schema;
    const fetchProps = await this.#getFetchProps();

    const { schema } = await getBranchDetails({
      pathParams: { workspace: '{workspaceId}', dbBranchName: '{dbBranch}' },
      ...fetchProps
    });

    this.#schema = schema;
    return schema;
  }
}

const transformObjectLinks = (object: any) => {
  return Object.entries(object).reduce((acc, [key, value]) => {
    // Ignore internal properties
    if (key === 'xata') return acc;

    // Transform links to identifier
    return { ...acc, [key]: isIdentifiable(value) ? value.id : value };
  }, {});
};

export const initObject = <T>(
  db: Record<string, Repository<any>>,
  schema: Schema,
  table: string,
  object: Record<string, unknown>
) => {
  const result: Dictionary<unknown> = {};
  const { xata, ...rest } = object ?? {};
  Object.assign(result, rest);

  const { columns } = schema.tables.find(({ name }) => name === table) ?? {};
  if (!columns) console.error(`Table ${table} not found in schema`);

  for (const column of columns ?? []) {
    const value = result[column.name];

    switch (column.type) {
      case 'datetime': {
        const date = value !== undefined ? new Date(value as string) : undefined;

        if (date && isNaN(date.getTime())) {
          console.error(`Failed to parse date ${value} for field ${column.name}`);
        } else if (date) {
          result[column.name] = date;
        }

        break;
      }
      case 'link': {
        const linkTable = column.link?.table;

        if (!linkTable) {
          console.error(`Failed to parse link for field ${column.name}`);
        } else if (isObject(value)) {
          result[column.name] = initObject(db, schema, linkTable, value);
        }

        break;
      }
      default:
        break;
    }
  }

  result.read = function () {
    return db[table].read(result['id'] as string);
  };

  result.update = function (data: any) {
    return db[table].update(result['id'] as string, data);
  };

  result.delete = function () {
    return db[table].delete(result['id'] as string);
  };

  result.getMetadata = function () {
    return xata;
  };

  for (const prop of ['read', 'update', 'delete', 'getMetadata']) {
    Object.defineProperty(result, prop, { enumerable: false });
  }

  Object.freeze(result);
  return result as T;
};

function getIds(value: any): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => getIds(item)).flat();
  }

  if (!isObject(value)) return [];

  const nestedIds = Object.values(value)
    .map((item) => getIds(item))
    .flat();

  return isString(value.id) ? [value.id, ...nestedIds] : nestedIds;
}
