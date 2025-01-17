import fetch from 'cross-fetch';
import dotenv from 'dotenv';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { XataApiClient } from '../../packages/client/src';
import { XataClient } from '../../packages/codegen/example/xata';
import { mockUsers, teamColumns, userColumns } from '../mock_data';

// Get environment variables before reading them
dotenv.config({ path: join(process.cwd(), '.envrc') });

let client: XataClient;
let databaseName: string;

const workspace = process.env.XATA_WORKSPACE ?? '';
if (workspace === '') throw new Error('XATA_WORKSPACE environment variable is not set');

const api = new XataApiClient({
  apiKey: process.env.XATA_API_KEY || '',
  fetch
});

beforeAll(async () => {
  const id = Math.round(Math.random() * 100000);

  const database = await api.databases.createDatabase(workspace, `sdk-integration-test-search-${id}`);
  databaseName = database.databaseName;

  client = new XataClient({
    databaseURL: `https://${workspace}.xata.sh/db/${database.databaseName}`,
    branch: 'main',
    apiKey: process.env.XATA_API_KEY || '',
    fetch
  });

  await api.tables.createTable(workspace, databaseName, 'main', 'teams');
  await api.tables.createTable(workspace, databaseName, 'main', 'users');
  await api.tables.setTableSchema(workspace, databaseName, 'main', 'teams', { columns: teamColumns });
  await api.tables.setTableSchema(workspace, databaseName, 'main', 'users', { columns: userColumns });

  await client.db.users.create(mockUsers);

  const ownerAnimals = await client.db.users.filter('full_name', 'Owner of team animals').getFirst();
  const ownerFruits = await client.db.users.filter('full_name', 'Owner of team fruits').getFirst();
  if (!ownerAnimals || !ownerFruits) {
    throw new Error('Could not find owner of team animals or owner of team fruits');
  }

  await client.db.teams.create({
    name: 'Team fruits',
    labels: ['apple', 'banana', 'orange'],
    owner: ownerFruits
  });

  await client.db.teams.create({
    name: 'Team animals',
    labels: ['monkey', 'lion', 'eagle', 'dolphin'],
    owner: ownerAnimals
  });

  await client.db.teams.create({
    name: 'Mixed team fruits & animals',
    labels: ['monkey', 'banana', 'apple', 'dolphin']
  });

  await waitForSearchIndexing();
});

afterAll(async () => {
  await api.databases.deleteDatabase(workspace, databaseName);
});

describe('search', () => {
  test.skip('search in table', async () => {
    const owners = await client.db.users.search('Owner');
    expect(owners.length).toBeGreaterThan(0);

    expect(owners.length).toBe(2);
    expect(owners[0].id).toBeDefined();
    expect(owners[0].full_name?.includes('Owner')).toBeTruthy();
    expect(owners[0].read).toBeDefined();
  });

  test.skip('search in table with filtering', async () => {
    const owners = await client.db.users.search('Owner', {
      filter: { full_name: 'Owner of team animals' }
    });

    expect(owners.length).toBe(1);
    expect(owners[0].id).toBeDefined();
    expect(owners[0].full_name?.includes('Owner of team animals')).toBeTruthy();
    expect(owners[0].read).toBeDefined();
  });

  test.skip('search by tables with multiple tables', async () => {
    const { users = [], teams = [] } = await client.search.byTable('fruits', { tables: ['teams', 'users'] });

    expect(users.length).toBeGreaterThan(0);
    expect(teams.length).toBeGreaterThan(0);

    expect(users[0].id).toBeDefined();
    expect(users[0].read).toBeDefined();
    expect(users[0].full_name?.includes('fruits')).toBeTruthy();

    expect(teams[0].id).toBeDefined();
    expect(teams[0].read).toBeDefined();
    expect(teams[0].name?.includes('fruits')).toBeTruthy();
  });

  test.skip('search by table with all tables', async () => {
    const { users = [], teams = [] } = await client.search.byTable('fruits');

    expect(users.length).toBeGreaterThan(0);
    expect(teams.length).toBeGreaterThan(0);

    expect(users[0].id).toBeDefined();
    expect(users[0].read).toBeDefined();
    expect(users[0].full_name?.includes('fruits')).toBeTruthy();

    expect(teams[0].id).toBeDefined();
    expect(teams[0].read).toBeDefined();
    expect(teams[0].name?.includes('fruits')).toBeTruthy();
  });

  test.skip('search all with multiple tables', async () => {
    const results = await client.search.all('fruits', { tables: ['teams', 'users'] });

    for (const result of results) {
      if (result.table === 'teams') {
        expect(result.record.id).toBeDefined();
        expect(result.record.read).toBeDefined();
        expect(result.record.name?.includes('fruits')).toBeTruthy();
      } else {
        expect(result.record.id).toBeDefined();
        expect(result.record.read).toBeDefined();
        expect(result.record.full_name?.includes('fruits')).toBeTruthy();
      }
    }
  });

  test.skip('search all with one table', async () => {
    const results = await client.search.all('fruits', { tables: ['teams'] });

    for (const result of results) {
      expect(result.record.id).toBeDefined();
      expect(result.record.read).toBeDefined();
      expect(result.record.name?.includes('fruits')).toBeTruthy();

      //@ts-expect-error
      result.table === 'users';
    }
  });

  test.skip('search all with all tables', async () => {
    const results = await client.search.all('fruits');

    for (const result of results) {
      if (result.table === 'teams') {
        expect(result.record.id).toBeDefined();
        expect(result.record.read).toBeDefined();
        expect(result.record.name?.includes('fruits')).toBeTruthy();
      } else {
        expect(result.record.id).toBeDefined();
        expect(result.record.read).toBeDefined();
        expect(result.record.full_name?.includes('fruits')).toBeTruthy();
      }
    }
  });

  test.skip('search all with filters', async () => {
    const results = await client.search.all('fruits', {
      tables: [{ table: 'teams', filter: { name: 'Team fruits' } }, 'users']
    });

    expect(results.length).toBe(1);
    expect(results[0].table).toBe('teams');

    if (results[0].table === 'teams') {
      expect(results[0].record.id).toBeDefined();
      expect(results[0].record.read).toBeDefined();
      expect(results[0].record.name?.includes('fruits')).toBeTruthy();
    }
  });
});

async function waitForSearchIndexing(): Promise<void> {
  const { users = [], teams = [] } = await client.search.byTable('fruits');
  if (users.length === 0 || teams.length === 0) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return waitForSearchIndexing();
  }
}
