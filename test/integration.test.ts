import { execSync } from 'child_process';
import fetch from 'cross-fetch';
import dotenv from 'dotenv';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { BaseClient, contains, isXataRecord, lt, Repository, XataApiClient } from '../packages/client/src';
import {
  Paginable,
  PAGINATION_DEFAULT_SIZE,
  PAGINATION_MAX_OFFSET,
  PAGINATION_MAX_SIZE
} from '../packages/client/src/schema/pagination';
import { getCurrentBranchName } from '../packages/client/src/util/config';
import { User, UserRecord, XataClient } from '../packages/codegen/example/xata';
import { mockUsers, teamColumns, userColumns } from './mock_data';

// Get environment variables before reading them
dotenv.config({ path: join(process.cwd(), '.envrc') });

let client: XataClient;
let schemaLessclient: BaseClient;
let databaseName: string;

const apiKey = process.env.XATA_API_KEY ?? '';
const workspace = process.env.XATA_WORKSPACE ?? '';
if (workspace === '') throw new Error('XATA_WORKSPACE environment variable is not set');

const api = new XataApiClient({ apiKey, fetch });

beforeAll(async () => {
  const id = Math.round(Math.random() * 100000);

  const database = await api.databases.createDatabase(workspace, `sdk-integration-test-${id}`);
  databaseName = database.databaseName;

  client = new XataClient({
    databaseURL: `https://${workspace}.xata.sh/db/${database.databaseName}`,
    branch: 'main',
    apiKey: process.env.XATA_API_KEY || '',
    fetch
  });

  schemaLessclient = new BaseClient({
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
});

afterAll(async () => {
  await api.databases.deleteDatabase(workspace, databaseName);
});

describe('integration tests', () => {
  test('equal filter', async () => {
    const teams = await client.db.teams.filter('name', 'Team fruits').getMany();

    expect(teams).toHaveLength(1);
    expect(teams[0].name).toBe('Team fruits');
  });

  test('operator filter', async () => {
    const teams = await client.db.teams.filter('name', contains('fruits')).getMany({ sort: ['name'] });

    expect(teams).toHaveLength(2);
    expect(teams[0].name).toBe('Mixed team fruits & animals');
    expect(teams[1].name).toBe('Team fruits');
  });

  test.skip('operator filter on multiple column', async () => {
    const teams = await client.db.teams.filter('labels', ['banana']).getMany();

    expect(teams).toHaveLength(2);
    expect(teams[0].name).toBe('Mixed team fruits & animals');
    expect(teams[1].name).toBe('Team fruits');
  });

  test('multiple filter', async () => {
    const teams = await client.db.teams.filter('name', contains('fruits')).filter('name', contains('Mixed')).getMany();

    expect(teams).toHaveLength(1);
    expect(teams[0].name).toBe('Mixed team fruits & animals');
  });

  test('sort ascending', async () => {
    const teams = await client.db.teams.sort('name', 'asc').getMany();

    expect(teams).toHaveLength(3);
    expect(teams[0].name).toBe('Mixed team fruits & animals');
    expect(teams[1].name).toBe('Team animals');
    expect(teams[2].name).toBe('Team fruits');
  });

  test('sort descending', async () => {
    const teams = await client.db.teams.sort('name', 'desc').getMany();

    expect(teams).toHaveLength(3);
    expect(teams[0].name).toBe('Team fruits');
    expect(teams[1].name).toBe('Team animals');
    expect(teams[2].name).toBe('Mixed team fruits & animals');
  });

  test('single filter and sort ascending', async () => {
    const teams = await client.db.teams.filter('name', contains('fruits')).sort('name', 'asc').getMany();

    expect(teams).toHaveLength(2);
    expect(teams[0].name).toBe('Mixed team fruits & animals');
    expect(teams[1].name).toBe('Team fruits');
  });

  test('single filter and sort descending', async () => {
    const teams = await client.db.teams.filter('name', contains('fruits')).sort('name', 'desc').getMany();

    expect(teams).toHaveLength(2);
    expect(teams[0].name).toBe('Team fruits');
    expect(teams[1].name).toBe('Mixed team fruits & animals');
  });

  test('sort ascending in getMany', async () => {
    const teams = await client.db.teams.getMany({ sort: 'name' });

    expect(teams).toHaveLength(3);
    expect(teams[0].name).toBe('Mixed team fruits & animals');
    expect(teams[1].name).toBe('Team animals');
    expect(teams[2].name).toBe('Team fruits');
  });

  test('sort descending in getMany', async () => {
    const teams = await client.db.teams.getMany({ sort: { column: 'name', direction: 'desc' } });

    expect(teams).toHaveLength(3);
    expect(teams[0].name).toBe('Team fruits');
    expect(teams[1].name).toBe('Team animals');
    expect(teams[2].name).toBe('Mixed team fruits & animals');
  });

  test('negative filter', async () => {
    const repository = client.db.teams;
    const teams = await repository.not(repository.filter('name', 'Team fruits')).sort('name', 'asc').getMany();

    expect(teams).toHaveLength(2);
    expect(teams[0].name).toBe('Mixed team fruits & animals');
    expect(teams[1].name).toBe('Team animals');
  });

  test('filter on nullable property', async () => {
    const ownerAnimals = await client.db.users.filter('full_name', 'Owner of team animals').getFirst();
    if (!ownerAnimals) throw new Error('Could not find owner of team animals');

    // Regression test on filtering on nullable property
    const team = await client.db.teams.filter('owner.id', ownerAnimals.id).getFirst();

    expect(team?.owner?.id).toEqual(ownerAnimals.id);
  });

  test('filter on object', async () => {
    const users = await client.db.users
      .filter({
        address: {
          zipcode: 100
        }
      })
      .getMany();

    expect(users).toHaveLength(1);
    expect(users[0].full_name).toBe('Owner of team fruits');
  });

  test('filter on object with operator', async () => {
    const users = await client.db.users
      .filter({
        address: {
          zipcode: lt(150)
        }
      })
      .getMany();

    expect(users).toHaveLength(1);
    expect(users[0].full_name).toBe('Owner of team fruits');
  });

  test('filter on link', async () => {
    const teams = await client.db.teams
      .filter({
        owner: {
          full_name: 'Owner of team fruits'
        }
      })
      .getMany();

    expect(teams).toHaveLength(1);
    expect(teams[0].name).toBe('Team fruits');
  });

  test('returns single record', async () => {
    const user = await client.db.users.getFirst();
    expect(user).toBeDefined();
  });

  test('returns many records with offset/size', async () => {
    const page1 = await client.db.users.getMany({ pagination: { size: 10 } });
    const page2 = await client.db.users.getMany({ pagination: { size: 10, offset: 10 } });

    expect(page1).not.toEqual(page2);
    expect(page1).toHaveLength(10);
    expect(page2).toHaveLength(10);
  });

  test('returns many records with cursor', async () => {
    const size = Math.floor(mockUsers.length / 1.5);
    const lastPageSize = mockUsers.length - Math.floor(mockUsers.length / 1.5);

    const page1 = await client.db.users.getPaginated({ pagination: { size } });
    const page2 = await page1.nextPage();
    const page3 = await page2.nextPage();
    const firstPage = await page3.firstPage();
    const lastPage = await page2.lastPage();

    expect(page1.records).toHaveLength(size);
    expect(page2.records).toHaveLength(lastPageSize);
    expect(page3.records).toHaveLength(0);

    expect(page1.meta.page.more).toBe(true);
    expect(page2.meta.page.more).toBe(false);
    expect(page3.meta.page.more).toBe(false);

    expect(firstPage.records).toEqual(page1.records);

    // In cursor based pagination, the last page is the last N records
    expect(lastPage.records).toHaveLength(size);
  });

  test('returns many records with cursor passing a offset/size', async () => {
    const page1 = await client.db.users.getPaginated({ pagination: { size: 5 } });
    const page2 = await page1.nextPage(10);
    const page3 = await page2.nextPage(10);
    const page2And3 = await page1.nextPage(20);

    expect(page1.records).toHaveLength(5);
    expect(page2.records).toHaveLength(10);
    expect(page3.records).toHaveLength(10);
    expect(page2And3.records).toHaveLength(20);

    expect(page2And3.records).toEqual([...page2.records, ...page3.records]);
  });

  test('fails if sending cursor with sorting', async () => {
    const page1 = await client.db.users.getPaginated({ pagination: { size: 5 } });
    const { records: records1, meta } = page1;
    const page2 = await page1.nextPage();

    expect(meta.page.more).toBe(true);
    expect(meta.page.cursor).toBeDefined();
    expect(records1).toHaveLength(5);

    const { records: records2, meta: meta2 } = await client.db.users.getPaginated({
      pagination: { after: meta.page.cursor }
    });

    expect(meta2.page.more).toBe(true);
    expect(meta2.page.cursor).toBeDefined();
    expect(records2).toHaveLength(5);
    expect(records2).toEqual(page2.records);

    const { records: records3, meta: meta3 } = await client.db.users.getPaginated({
      pagination: { after: meta.page.cursor },
      columns: ['full_name']
    });

    expect(meta3.page.more).toBe(true);
    expect(meta3.page.cursor).toBeDefined();
    expect(records3).toHaveLength(5);
    expect(records3).not.toEqual(page2.records);

    expect(
      client.db.users.getPaginated({
        // @ts-expect-error
        pagination: { after: meta.page.cursor },
        sort: { column: 'full_name', direction: 'asc' }
      })
    ).rejects.toThrow();
  });

  test('repository implements pagination', async () => {
    const loadUsers = async (repository: Repository<User>) => {
      return repository.getPaginated({ pagination: { size: 10 } });
    };

    const users = await loadUsers(client.db.users);
    expect(users.records).toHaveLength(10);
  });

  test('repository implements paginable', async () => {
    async function foo(page: Paginable<UserRecord>): Promise<UserRecord[]> {
      const nextPage = page.hasNextPage() ? await foo(await page.nextPage()) : [];
      return [...page.records, ...nextPage];
    }

    const users = await foo(client.db.users);
    expect(users).toHaveLength(mockUsers.length);
  });

  test('get all users', async () => {
    const users = await client.db.users.getAll();
    expect(users).toHaveLength(mockUsers.length);
    expect(users[0].id).toBeDefined();
  });

  test('query implements iterator', async () => {
    const owners = [];

    for await (const user of client.db.users.filter('full_name', contains('Owner'))) {
      owners.push(user);
    }

    expect(owners).toHaveLength(2);
    expect(owners.map((user) => user.full_name).sort()).toEqual(['Owner of team animals', 'Owner of team fruits']);
  });

  test('query implements iterator with chunks', async () => {
    const owners = [];

    for await (const chunk of client.db.users.filter('full_name', contains('Owner')).getIterator({ batchSize: 10 })) {
      owners.push(...chunk);
    }

    expect(owners).toHaveLength(2);
    expect(owners.map((user) => user.full_name).sort()).toEqual(['Owner of team animals', 'Owner of team fruits']);
  });

  test('includes selected columns in query', async () => {
    const user = await client.db.users.select(['full_name']).getFirst();

    expect(user).toBeDefined();
    expect(user?.id).toBeDefined();
    expect(user?.full_name).toBeDefined();
    //@ts-expect-error
    expect(user?.email).toBeUndefined();
  });

  test('includes selected columns in getFirst', async () => {
    const user = await client.db.users.getFirst({
      columns: ['full_name', 'email']
    });

    expect(user).toBeDefined();
    expect(user?.id).toBeDefined();
    expect(user?.full_name).toBeDefined();
    expect(user?.email).toBeDefined();
    //@ts-expect-error
    expect(user?.address).toBeUndefined();
  });

  test('Partial update of a user', async () => {
    const user = await client.db.users.create({
      full_name: 'John Doe',
      email: 'john@doe.com',
      address: {
        street: '123 Main St'
      }
    });

    const updatedUserResponse = await client.db.users.update(user.id, {
      address: { street: 'New street', zipcode: 11 }
    });

    const updatedUser = await client.db.users.filter({ id: user.id }).getFirst();
    if (!updatedUser) throw new Error('No user found');

    await user.delete();

    expect(user.id).toBe(updatedUser.id);
    expect(user.address?.street).toBe('123 Main St');
    expect(user.address?.zipcode).toBeUndefined();

    expect(updatedUserResponse.address?.street).toBe('New street');
    expect(updatedUserResponse.address?.zipcode).toBe(11);
    expect(updatedUserResponse.full_name).toBe(user.full_name);

    expect(updatedUser.address?.street).toBe('New street');
    expect(updatedUser.address?.zipcode).toBe(11);
    expect(updatedUser.full_name).toBe(user.full_name);
  });

  test('Partial update from itself', async () => {
    const user = await client.db.users.create({
      full_name: 'John Doe 2',
      email: 'john2@doe.com',
      address: {
        street: '456 Main St'
      }
    });

    const updatedUserResponse = await user.update({
      address: { street: 'New street 2', zipcode: 22 }
    });

    const updatedUser = await client.db.users.filter({ id: user.id }).getFirst();
    if (!updatedUser) throw new Error('No user found');

    await user.delete();

    expect(user.address?.street).not.toBe('New street 2');

    expect(updatedUserResponse.address?.street).toBe('New street 2');
    expect(updatedUserResponse.address?.zipcode).toBe(22);
    expect(updatedUserResponse.full_name).toBe(user.full_name);

    expect(updatedUser.address?.street).toBe('New street 2');
    expect(updatedUser.address?.zipcode).toBe(22);
    expect(updatedUser.full_name).toBe(user.full_name);
  });

  test('Upsert of a user', async () => {
    const user = await client.db.users.createOrUpdate('my-good-old-john-6', {
      full_name: 'John Doe 6',
      email: 'john6@doe.com'
    });

    const apiUser = await client.db.users.filter({ id: user.id }).getFirst();
    if (!apiUser) throw new Error('No user found');

    await user.delete();

    expect(user.id).toBe('my-good-old-john-6');
    expect(user.full_name).toBe('John Doe 6');

    expect(user.id).toBe(apiUser.id);
    expect(user.full_name).toBe(apiUser.full_name);
    expect(user.email).toBe(apiUser.email);
  });

  test('Pagination size limit', async () => {
    expect(client.db.users.getPaginated({ pagination: { size: PAGINATION_MAX_SIZE + 1 } })).rejects.toHaveProperty(
      'message',
      'page size exceeds max limit of 200'
    );
  });

  test('Pagination offset limit', async () => {
    expect(client.db.users.getPaginated({ pagination: { offset: PAGINATION_MAX_OFFSET + 1 } })).rejects.toHaveProperty(
      'message',
      'page offset must not exceed 800'
    );
  });

  test('Pagination default value', async () => {
    await api.tables.createTable(workspace, databaseName, 'main', 'planes');
    await api.tables.setTableSchema(workspace, databaseName, 'main', 'planes', {
      columns: [{ name: 'name', type: 'string' }]
    });

    const planes = Array(250).map((_, index) => ({ name: `Plane ${index}` }));

    const createdPlanes = await schemaLessclient.db.planes.create(planes);
    const queriedPlanes = await schemaLessclient.db.planes.getPaginated();

    expect(createdPlanes).toHaveLength(250);
    expect(queriedPlanes.records).toHaveLength(PAGINATION_DEFAULT_SIZE);
  });

  test('multiple errors in one response', async () => {
    const invalidUsers = [{ full_name: 'a name' }, { full_name: 1 }, { full_name: 2 }] as User[];

    expect(client.db.users.create(invalidUsers)).rejects.toHaveProperty('status', 400);
  });

  test('Link is a record object', async () => {
    const user = await client.db.users.create({
      full_name: 'Base User'
    });

    const team = await client.db.teams.create({
      name: 'Base team',
      owner: user
    });

    await user.update({ team });

    const updatedUser = await user.read();
    expect(updatedUser?.team?.id).toEqual(team.id);

    const response = await client.db.teams.getFirst({ filter: { id: team.id }, columns: ['*', 'owner.*'] });
    const owner = await response?.owner?.read();

    expect(response?.owner?.id).toBeDefined();
    expect(response?.owner?.full_name).toBeDefined();

    expect(owner?.id).toBeDefined();
    expect(owner?.full_name).toBeDefined();

    expect(response?.owner?.id).toBe(owner?.id);
    expect(response?.owner?.full_name).toBe(owner?.full_name);

    const nestedObject = await client.db.teams.getFirst({
      filter: { id: team.id },
      columns: ['owner.team.owner.team.owner.team', 'owner.team.owner.team.owner.full_name']
    });

    const nestedProperty = nestedObject?.owner?.team?.owner?.team?.owner?.team;
    const nestedName = nestedObject?.owner?.team?.owner?.team?.owner?.full_name;

    expect(nestedName).toEqual(user.full_name);

    expect(isXataRecord(nestedProperty)).toBe(true);
    expect(nestedProperty?.name).toEqual(team.name);
    // @ts-expect-error
    expect(nestedProperty?.owner?.full_name).toBeUndefined();

    const nestedRead = await nestedProperty?.owner?.read();

    expect(nestedRead?.id).toBeDefined();
    expect(nestedRead?.full_name).toEqual(user.full_name);
  });

  test('Update link with linked object', async () => {
    const owner = await client.db.users.create({ full_name: 'Example User' });
    const owner2 = await client.db.users.create({ full_name: 'Example User 2' });

    const team = await client.db.teams.create({ name: 'Example Team', owner });
    const updated = await team.update({ owner: owner2 });

    expect(team.owner?.id).toEqual(owner.id);
    expect(updated.owner?.id).toEqual(owner2.id);
  });
});

describe('record creation', () => {
  test('create single team without id', async () => {
    const team = await client.db.teams.create({ name: 'Team ships' });

    expect(team.id).toBeDefined();
    expect(team.name).toBe('Team ships');
  });

  test('create multiple teams without ids', async () => {
    const teams = await client.db.teams.create([{ name: 'Team cars' }, { name: 'Team planes' }]);

    expect(teams).toHaveLength(2);
    expect(teams[0].id).toBeDefined();
    expect(teams[0].name).toBe('Team cars');
    expect(teams[0].read).toBeDefined();
    expect(teams[1].id).toBeDefined();
    expect(teams[1].name).toBe('Team planes');
    expect(teams[1].read).toBeDefined();
  });

  test('create user with id', async () => {
    const user = await client.db.users.create('a-unique-record-john-4', {
      full_name: 'John Doe 4',
      email: 'john4@doe.com'
    });

    const apiUser = await client.db.users.filter({ id: user.id }).getFirst();
    if (!apiUser) throw new Error('No user found');

    expect(user.id).toBe('a-unique-record-john-4');
    expect(user.read).toBeDefined();
    expect(user.full_name).toBe('John Doe 4');

    expect(user.id).toBe(apiUser.id);
    expect(user.full_name).toBe(apiUser.full_name);
    expect(user.email).toBe(apiUser.email);

    expect(
      client.db.users.create('a-unique-record-john-4', {
        full_name: 'John Doe 5',
        email: 'john5@doe.com'
      })
    ).rejects.toHaveProperty('status', 422);
  });

  test('create user with inlined id', async () => {
    const user = await client.db.users.create({
      id: 'a-unique-record-john-5',
      full_name: 'John Doe 5',
      email: 'john5@doe.com'
    });

    const apiUser = await client.db.users.filter({ id: user.id }).getFirst();
    if (!apiUser) throw new Error('No user found');

    expect(user.id).toBe('a-unique-record-john-5');
    expect(user.read).toBeDefined();
    expect(user.full_name).toBe('John Doe 5');

    expect(user.id).toBe(apiUser.id);
    expect(user.full_name).toBe(apiUser.full_name);
    expect(user.email).toBe(apiUser.email);
  });

  test('create user with empty id is not allowed', async () => {
    expect(
      client.db.users.create('', {
        full_name: 'John Doe 3',
        email: 'john3@doe.com'
      })
    ).rejects.toMatchInlineSnapshot(`[Error: The id can't be empty]`);
  });

  test('create user with empty inline id is not allowed', async () => {
    expect(
      client.db.users.create({
        id: '',
        full_name: 'John Doe 3',
        email: 'john3@doe.com'
      })
    ).rejects.toMatchInlineSnapshot(`[Error: The id can't be empty]`);
  });

  test('create user with falsy id is not allowed', async () => {
    expect(
      //@ts-expect-error
      client.db.users.create(null, {
        full_name: 'John Doe 3',
        email: 'john3@doe.com'
      })
    ).rejects.toMatchInlineSnapshot(`[Error: Invalid arguments for create method]`);
  });

  test("create multiple with empty array doesn't create anything", async () => {
    const teams = await client.db.teams.create([]);
    expect(teams).toHaveLength(0);
  });
});

describe('record update', () => {
  test('update single team', async () => {
    const team = await client.db.teams.create({ name: 'Team ships' });

    const updatedTeam = await client.db.teams.update(team.id, { name: 'Team boats' });

    expect(updatedTeam.id).toBe(team.id);

    const apiTeam = await client.db.teams.filter({ id: team.id }).getFirst();
    if (!apiTeam) throw new Error('No team found');

    expect(updatedTeam.name).toBe('Team boats');
    expect(apiTeam.name).toBe('Team boats');
  });

  test('update multiple teams', async () => {
    const teams = await client.db.teams.create([{ name: 'Team cars' }, { name: 'Team planes' }]);

    const updatedTeams = await client.db.teams.update(teams.map((team) => ({ ...team, name: 'Team boats' })));

    expect(updatedTeams).toHaveLength(2);

    const apiTeams = await client.db.teams.filter({ $any: teams.map((t) => ({ id: t.id })) }).getMany();

    expect(apiTeams).toHaveLength(2);
    expect(apiTeams[0].name).toBe('Team boats');
    expect(apiTeams[1].name).toBe('Team boats');
  });

  test('update team with inline id', async () => {
    const team = await client.db.teams.create({ name: 'Team ships' });

    const updatedTeam = await client.db.teams.update({ id: team.id, name: 'Team boats' });

    expect(updatedTeam.id).toBe(team.id);

    const apiTeam = await client.db.teams.filter({ id: team.id }).getFirst();

    expect(updatedTeam.name).toBe('Team boats');
    expect(apiTeam?.name).toBe('Team boats');
  });

  test("update many with empty array doesn't update anything", async () => {
    const updatedTeams = await client.db.teams.update([]);
    expect(updatedTeams).toHaveLength(0);
  });
});

describe('record deletion', () => {
  test('delete single team with id', async () => {
    const team = await client.db.teams.create({ name: 'Team ships' });

    await client.db.teams.delete(team.id);

    const copy = await team.read();

    expect(copy).toBeNull();

    const apiTeam = await client.db.teams.filter({ id: team.id }).getFirst();

    expect(apiTeam).toBeNull();
  });

  test('delete multiple teams with id list', async () => {
    const teams = await client.db.teams.create([{ name: 'Team cars' }, { name: 'Team planes' }]);

    await client.db.teams.delete(teams.map((team) => team.id));

    const apiTeams = await client.db.teams.filter({ $any: teams.map((t) => ({ id: t.id })) }).getMany();

    expect(apiTeams).toHaveLength(0);
  });

  test('delete single team with id in object', async () => {
    const team = await client.db.teams.create({ name: 'Team ships' });

    await client.db.teams.delete(team);

    const copy = await team.read();

    expect(copy).toBeNull();

    const apiTeam = await client.db.teams.filter({ id: team.id }).getFirst();

    expect(apiTeam).toBeNull();
  });

  test('delete multiple teams with id in object', async () => {
    const teams = await client.db.teams.create([{ name: 'Team cars' }, { name: 'Team planes' }]);

    await client.db.teams.delete(teams);

    const apiTeams = await client.db.teams.filter({ $any: teams.map((t) => ({ id: t.id })) }).getMany();

    expect(apiTeams).toHaveLength(0);
  });

  test('delete team with own operation', async () => {
    const team = await client.db.teams.create({ name: 'Team ships' });

    await team.delete();

    const copy = await team.read();

    expect(copy).toBeNull();

    const apiTeam = await client.db.teams.filter({ id: team.id }).getFirst();

    expect(apiTeam).toBeNull();
  });
});

describe('record create or update', () => {
  test('create or update single team with id', async () => {
    const team = await client.db.teams.create({ name: 'Team ships' });

    const updatedTeam = await client.db.teams.createOrUpdate(team.id, { name: 'Team boats' });

    expect(updatedTeam.id).toBe(team.id);
    expect(updatedTeam.read).toBeDefined();

    const apiTeam = await client.db.teams.filter({ id: team.id }).getFirst();

    expect(updatedTeam.name).toBe('Team boats');
    expect(apiTeam?.name).toBe('Team boats');
  });

  test('create or update team with inline id', async () => {
    const team = await client.db.teams.create({ name: 'Team ships' });

    const updatedTeam = await client.db.teams.createOrUpdate({ id: team.id, name: 'Team boats' });

    expect(updatedTeam.id).toBe(team.id);
    expect(updatedTeam.read).toBeDefined();

    const apiTeam = await client.db.teams.filter({ id: team.id }).getFirst();

    expect(updatedTeam.name).toBe('Team boats');
    expect(apiTeam?.name).toBe('Team boats');
  });

  test('create or update multiple teams', async () => {
    const teams = await client.db.teams.create([{ name: 'Team cars' }, { name: 'Team planes' }]);

    const updatedTeams = await client.db.teams.createOrUpdate(
      teams.map((team) => ({ id: team.id, name: 'Team boats' }))
    );

    expect(updatedTeams).toHaveLength(2);
    expect(updatedTeams[0].read).toBeDefined();

    const apiTeams = await client.db.teams.filter({ $any: teams.map((t) => ({ id: t.id })) }).getMany();

    expect(apiTeams).toHaveLength(2);

    expect(apiTeams[0].name).toBe('Team boats');
    expect(apiTeams[1].name).toBe('Team boats');
  });

  test("create or update many with empty array doesn't create or update anything", async () => {
    const updatedTeams = await client.db.teams.createOrUpdate([]);
    expect(updatedTeams).toHaveLength(0);
  });
});

describe('record read', () => {
  test('read single team with id', async () => {
    const team = await client.db.teams.create({ name: 'Team ships' });

    const copy = await client.db.teams.read(team.id);
    expect(copy).toBeDefined();
    expect(copy?.id).toBe(team.id);
  });

  test('read multiple teams with id list', async () => {
    const teams = await client.db.teams.create([{ name: 'Team cars' }, { name: 'Team planes' }]);

    const copies = await client.db.teams.read(teams.map((team) => team.id));
    expect(copies).toHaveLength(2);
    expect(copies[0]?.id).toBe(teams[0].id);
    expect(copies[1]?.id).toBe(teams[1].id);
  });

  test("read single and return null if team doesn't exist", async () => {
    const copy = await client.db.teams.read('does-not-exist');
    expect(copy).toBeNull();
  });

  test("read multiple teams with id list and ignores a team if doesn't exist", async () => {
    const teams = await client.db.teams.create([{ name: 'Team cars' }, { name: 'Team planes' }]);

    const copies = await client.db.teams.read(teams.map((team) => team.id).concat(['does-not-exist']));
    expect(copies).toHaveLength(2);
    expect(copies[0]?.id).toBe(teams[0].id);
    expect(copies[1]?.id).toBe(teams[1].id);
  });

  test('read multiple with empty array', async () => {
    const copies = await client.db.teams.read([]);
    expect(copies).toHaveLength(0);
  });

  test('read multiple with falsy values, throws', async () => {
    // @ts-ignore
    expect(client.db.teams.read([null, undefined, false, 0, ''])).rejects.toThrow();
  });
});

describe('getBranch', () => {
  const envValues = { ...process.env };
  const gitBranch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();

  afterAll(() => {
    // Reset env variable values
    process.env = envValues;
  });

  test('uses an env variable if it is set', async () => {
    const branchName = 'using-env-variable';

    await api.branches.createBranch(workspace, databaseName, branchName);

    const getBranchOptions = {
      apiKey,
      databaseURL: `https://${workspace}.xata.sh/db/${databaseName}`,
      fetchImpl: fetch
    };

    process.env = { NODE_ENV: 'development', XATA_BRANCH: branchName };
    expect(await getCurrentBranchName(getBranchOptions)).toEqual(branchName);

    process.env = { NODE_ENV: 'development', VERCEL_GIT_COMMIT_REF: branchName };
    expect(await getCurrentBranchName(getBranchOptions)).toEqual(branchName);

    process.env = { NODE_ENV: 'development', CF_PAGES_BRANCH: branchName };
    expect(await getCurrentBranchName(getBranchOptions)).toEqual(branchName);

    process.env = { NODE_ENV: 'development', BRANCH: branchName };
    expect(await getCurrentBranchName(getBranchOptions)).toEqual(branchName);
  });

  test('uses `main` if no env variable is set is not set and there is not associated git branch', async () => {
    process.env = { NODE_ENV: 'development' };
    const branch = await getCurrentBranchName({
      apiKey,
      databaseURL: `https://${workspace}.xata.sh/db/${databaseName}`,
      fetchImpl: fetch
    });

    expect(branch).toEqual('main');
  });

  test('uses the git branch name if branch exists', async () => {
    process.env = { NODE_ENV: 'development' };

    await api.branches.createBranch(workspace, databaseName, gitBranch);

    const branch = await getCurrentBranchName({
      apiKey,
      databaseURL: `https://${workspace}.xata.sh/db/${databaseName}`,
      fetchImpl: fetch
    });

    expect(branch).toEqual(gitBranch);
  });
});
