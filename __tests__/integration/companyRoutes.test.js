/** Tests for companies API endpoints */

process.env.NODE_ENV = 'test';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');
const db = require('../../db');
const { SECRET_KEY } = require('../../config');

const client = request(app);

/** Setup/ Tear-down */
let newCompanyData;
let userToken;
let adminToken;

beforeAll(async () => {
  await db.query('DELETE FROM companies');

  userToken = jwt.sign({ username: 'bob', is_admin: false }, SECRET_KEY);
  adminToken = jwt.sign({ username: 'susan', is_admin: true }, SECRET_KEY);

  newCompanyData = {
    handle: 'xyz',
    name: 'XYZ Company',
    num_employees: 5,
    token: adminToken,
  };
});

beforeEach(async () => {
  // create test data in companies table
  await db.query(
    `INSERT INTO companies 
    VALUES ('ibm', 'International Business Machines', 10000, 'Big Blue', 'https://duckduckgo.com/i/f6542513.png'),
           ('apple', 'Apple Computers', 8000, 'Makers of iPhone', 'https://duckduckgo.com/i/b2e38b1b.png')`
  );
});

afterEach(async () => {
  await db.query('DELETE FROM companies');
});

afterAll(async () => {
  await db.end();
});

/***********/
/** Tests */
//
// TODO: Write tests with non-admin token or missing token as appropriate.

/** GET all */
describe('GET /companies', () => {
  test('returns all companies', async () => {
    const resp = await client.get('/companies').send({ token: userToken });

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      companies: [
        {
          handle: 'ibm',
          name: 'International Business Machines',
        },
        {
          handle: 'apple',
          name: 'Apple Computers',
        },
      ],
    });
  });

  test('filters results by name when search term given', async () => {
    const resp = await client
      .get('/companies?search=int')
      .send({ token: userToken });

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      companies: [
        {
          handle: 'ibm',
          name: 'International Business Machines',
        },
      ],
    });
  });

  test('filters results when min_employees given', async () => {
    const resp = await client
      .get('/companies?min_employees=9000')
      .send({ token: userToken });

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      companies: [
        {
          handle: 'ibm',
          name: 'International Business Machines',
        },
      ],
    });
  });

  test('filters results when max_employees given', async () => {
    const resp = await client
      .get('/companies?max_employees=9000')
      .send({ token: userToken });

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      companies: [
        {
          handle: 'apple',
          name: 'Apple Computers',
        },
      ],
    });
  });

  test('warns when min > max and returns 400 status', async () => {
    const resp = await client
      .get('/companies?min_employees=9500&max_employees=9000')
      .send({ token: userToken });

    expect(resp.statusCode).toEqual(400);
    expect(resp.body.message).toEqual(
      'min_employees cannot be larger than max_employees'
    );
  });
});

/** POST */
describe('POST /companies', () => {
  test('returns 201 with company data and data is seen at GET /companies', async () => {
    const body = { ...newCompanyData };
    const createResp = await client.post('/companies').send(body);

    expect(createResp.statusCode).toEqual(201);
    expect(createResp.body).toEqual({
      company: {
        handle: 'xyz',
        name: 'XYZ Company',
        num_employees: 5,
        description: null,
        logo_url: null,
      },
    });

    const allResp = await client.get('/companies').send({ token: adminToken });

    expect(allResp.body.companies.length).toEqual(3);
    expect(allResp.body.companies).toContainEqual({
      handle: 'xyz',
      name: 'XYZ Company',
    });
  });

  test('returns 400 with bad company data - missing data', async () => {
    const badData = { ...newCompanyData };
    delete badData.name;
    const resp = await client.post('/companies').send(badData);

    expect(resp.statusCode).toEqual(400);
  });
});

/** GET company detail */
describe('GET /companies/:handle', () => {
  test('returns company details', async () => {
    const resp = await client
      .get('/companies/apple')
      .send({ token: userToken });

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      company: {
        handle: 'apple',
        name: 'Apple Computers',
        num_employees: 8000,
        description: 'Makers of iPhone',
        logo_url: 'https://duckduckgo.com/i/b2e38b1b.png',
      },
      jobs: [],
    });
  });

  test('returns 404 with bad handle', async () => {
    const resp = await client
      .get('/companies/badhandle')
      .send({ token: userToken });

    expect(resp.statusCode).toEqual(404);
  });
});

/** PATCH */
describe('PATCH /companies:handle', () => {
  test('returns 200 with updated data and change seen at detail endpoint', async () => {
    const patchResp = await client
      .patch('/companies/apple')
      .send(newCompanyData);

    expect(patchResp.statusCode).toEqual(200);
    expect(patchResp.body).toEqual({
      company: {
        handle: 'xyz',
        name: 'XYZ Company',
        num_employees: 5,
        description: 'Makers of iPhone',
        logo_url: 'https://duckduckgo.com/i/b2e38b1b.png',
      },
    });

    const getAllResp = await client
      .get('/companies')
      .send({ token: adminToken });

    expect(getAllResp.body.companies.length).toEqual(2);
    expect(getAllResp.body.companies).toContainEqual({
      handle: 'xyz',
      name: 'XYZ Company',
    });
  });

  test('returns 400 with bad company data - extra data', async () => {
    const badData = { ...newCompanyData };
    badData.extraData = true;
    const resp = await client.patch('/companies/ibm').send(badData);

    expect(resp.statusCode).toEqual(400);
  });

  test('returns 404 with bad handle', async () => {
    const resp = await client
      .patch('/companies/badhandle')
      .send(newCompanyData);

    expect(resp.statusCode).toEqual(404);
  });
});

/** DELETE */
describe('DELETE /companies:handle', () => {
  test('returns 200 status with "Company deleted" message and then returns 404', async () => {
    const firstResp = await client
      .delete('/companies/ibm')
      .send({ token: adminToken });

    expect(firstResp.statusCode).toEqual(200);
    expect(firstResp.body).toEqual({ message: 'Company deleted' });

    const secondResp = await client
      .delete('/companies/ibm')
      .send({ token: adminToken });

    expect(secondResp.statusCode).toEqual(404);
  });

  test('returns 404 with bad handle', async () => {
    const resp = await client
      .delete('/companies/badhandle')
      .send({ token: adminToken });

    expect(resp.statusCode).toEqual(404);
  });
});
