import { Flags } from '@oclif/core';
import { CompareSchemaResult, createProcessor, parseCSVFile, parseCSVStream, TableInfo } from '@xata.io/importer';
import chalk from 'chalk';
import prompts from 'prompts';
import { BaseCommand } from '../../base.js';

export default class ImportCSV extends BaseCommand {
  static description = 'Import a CSV file';

  static examples = [
    'Import a CSV file using the column names of the CSV header',
    '$ xata import csv users.csv --table=users',
    'Specify the column names and types. They must follow the order they appear in the CSV file',
    '$ xata import csv users.csv --table=users --columns=name,email --types=string,email',
    'Create the table or any missing column if needed without asking',
    '$ xata import csv users.csv --table=users --columns=name,email --types=string,email --create',
    'Specify "-" as file name to use the stdin to read the data from',
    chalk.dim('$ command-that-outputs-csv | xata import csv - --table=users --create')
  ];

  static flags = {
    'no-input': this.noInputFlag,
    ...this.databaseURLFlag,
    branch: this.branchFlag,
    table: Flags.string({
      description: 'The table where the CSV file will be imported to',
      required: true
    }),
    types: Flags.string({
      description: 'Column types separated by commas'
    }),
    columns: Flags.string({
      description: 'Column names separated by commas'
    }),
    'no-header': Flags.boolean({
      description: 'Specify that the CSV file has no header'
    }),
    create: Flags.boolean({
      description: "Whether the table or columns should be created if they don't exist without asking"
    }),
    'no-column-name-normalization': Flags.boolean({
      description: 'Avoid changing column names in a normalized way'
    })
  };

  static args = [{ name: 'file', description: 'The file to be imported' }];

  async run(): Promise<void> {
    const { flags, args } = await this.parse(ImportCSV);
    const { file } = args;
    const {
      table,
      types,
      columns,
      'no-header': noHeader,
      create,
      'no-column-name-normalization': ignoreColumnNormalization
    } = flags;

    const { workspace, database, branch } = await this.getParsedDatabaseURLWithBranch(flags.db, flags.branch);

    const xata = await this.getXataClient();

    const tableInfo: TableInfo = {
      workspaceID: workspace,
      database: database,
      branch,
      tableName: table
    };

    const options = createProcessor(xata, tableInfo, {
      types: splitCommas(types),
      columns: splitCommas(columns),
      noheader: Boolean(noHeader),
      ignoreColumnNormalization,
      shouldContinue: async (compare) => {
        return Boolean(await this.shouldContinue(compare, table, create));
      },
      onBatchProcessed: async (rows) => {
        this.log(`${rows} rows processed`);
      }
    });

    if (file === '-') {
      await parseCSVStream(process.stdin, options);
    } else {
      await parseCSVFile(file, options);
    }
    this.log('Finished');
  }

  async shouldContinue(compare: CompareSchemaResult, table: string, create: boolean): Promise<boolean | void> {
    let error = false;
    compare.columnTypes.forEach((type) => {
      if (type.error) {
        error = true;
        this.warn(
          `Column ${type.columnName} exists with type ${type.schemaType} but a type of ${type.castedType} would be needed.`
        );
      }
    });
    if (error) {
      return process.exit(1);
    }

    if (compare.missingTable) {
      if (!create) {
        const response = await prompts({
          type: 'confirm',
          name: 'confirm',
          message: `Table ${table} does not exist. Do you want to create it?`,
          initial: false
        });
        if (!response.confirm) return false;
      }
    } else if (compare.missingColumns.length > 0) {
      if (!create) {
        const response = await prompts({
          type: 'confirm',
          name: 'confirm',
          message: `These columns are missing: ${missingColumnsList(compare)}. Do you want to create them?`,
          initial: false
        });
        if (!response.confirm) return false;
      }
    }

    return true;
  }
}

function missingColumnsList(compare: CompareSchemaResult) {
  const missing = compare.missingColumns.map((col) => `${col.column} (${col.type})`);
  return missing.join(', ');
}

export function splitCommas(value: unknown): string[] | undefined {
  if (!value) return;
  return String(value)
    .split(',')
    .map((s) => s.trim());
}
