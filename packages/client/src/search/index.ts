import { getBranchDetails, searchBranch } from '../api';
import { Schema } from '../api/schemas';
import { XataPlugin, XataPluginOptions } from '../plugins';
import { SchemaPluginResult } from '../schema';
import { Filter } from '../schema/filters';
import { BaseData, XataRecord } from '../schema/record';
import { initObject } from '../schema/repository';
import { SelectedPick } from '../schema/selection';
import { GetArrayInnerType, StringKeys, Values } from '../util/types';

export type SearchOptions<Schemas extends Record<string, BaseData>, Tables extends StringKeys<Schemas>> = {
  fuzziness?: number;
  tables?: Array<
    | Tables
    | Values<{
        [Model in GetArrayInnerType<NonNullable<Tables[]>>]: {
          table: Model;
          filter?: Filter<SelectedPick<Schemas[Model] & SearchXataRecord, ['*']>>;
        };
      }>
  >;
};

export type SearchPluginResult<Schemas extends Record<string, BaseData>> = {
  all: <Tables extends StringKeys<Schemas>>(
    query: string,
    options?: SearchOptions<Schemas, Tables>
  ) => Promise<
    Values<{
      [Model in ExtractTables<
        Schemas,
        Tables,
        GetArrayInnerType<NonNullable<NonNullable<typeof options>['tables']>>
      >]: {
        table: Model;
        record: Awaited<SelectedPick<Schemas[Model] & SearchXataRecord, ['*']>>;
      };
    }>[]
  >;
  byTable: <Tables extends StringKeys<Schemas>>(
    query: string,
    options?: SearchOptions<Schemas, Tables>
  ) => Promise<{
    [Model in ExtractTables<
      Schemas,
      Tables,
      GetArrayInnerType<NonNullable<NonNullable<typeof options>['tables']>>
    >]?: Awaited<SelectedPick<Schemas[Model] & SearchXataRecord, ['*']>[]>;
  }>;
};

export class SearchPlugin<Schemas extends Record<string, BaseData>> extends XataPlugin {
  #schema?: Schema;

  constructor(private db: SchemaPluginResult<Schemas>) {
    super();
  }

  build({ getFetchProps }: XataPluginOptions): SearchPluginResult<Schemas> {
    return {
      all: async <Tables extends StringKeys<Schemas>>(query: string, options: SearchOptions<Schemas, Tables> = {}) => {
        const records = await this.#search(query, options, getFetchProps);
        const schema = await this.#getSchema(getFetchProps);

        return records.map((record) => {
          const { table = 'orphan' } = record.xata;

          return { table, record: initObject(this.db, schema, table, record) } as any;
        });
      },
      byTable: async <Tables extends StringKeys<Schemas>>(
        query: string,
        options: SearchOptions<Schemas, Tables> = {}
      ) => {
        const records = await this.#search(query, options, getFetchProps);
        const schema = await this.#getSchema(getFetchProps);

        return records.reduce((acc, record) => {
          const { table = 'orphan' } = record.xata;

          const items = acc[table] ?? [];
          const item = initObject(this.db, schema, table, record);

          return { ...acc, [table]: [...items, item] };
        }, {} as any);
      }
    };
  }

  async #search<Tables extends StringKeys<Schemas>>(
    query: string,
    options: SearchOptions<Schemas, Tables>,
    getFetchProps: XataPluginOptions['getFetchProps']
  ) {
    const fetchProps = await getFetchProps();
    const { tables, fuzziness } = options ?? {};

    const { records } = await searchBranch({
      pathParams: { workspace: '{workspaceId}', dbBranchName: '{dbBranch}' },
      // @ts-ignore Backend support not there yet
      body: { tables, query, fuzziness },
      ...fetchProps
    });

    return records;
  }

  async #getSchema(getFetchProps: XataPluginOptions['getFetchProps']): Promise<Schema> {
    if (this.#schema) return this.#schema;
    const fetchProps = await getFetchProps();

    const { schema } = await getBranchDetails({
      pathParams: { workspace: '{workspaceId}', dbBranchName: '{dbBranch}' },
      ...fetchProps
    });

    this.#schema = schema;
    return schema;
  }
}

type SearchXataRecord = XataRecord & { xata: { table: string } };

type ExtractTables<
  Schemas extends Record<string, BaseData>,
  Tables extends StringKeys<Schemas>,
  TableOptions extends GetArrayInnerType<NonNullable<NonNullable<SearchOptions<Schemas, Tables>>['tables']>>
> = TableOptions extends `${infer Table extends Tables}`
  ? Table
  : TableOptions extends { table: infer Table extends Tables }
  ? Table
  : never;
