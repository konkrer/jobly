/** Tests for jobs API endpoints */

process.env.NODE_ENV = 'test';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');
const db = require('../../db');
const { SECRET_KEY } = require('../../config');

const client = request(app);

/** Setup/ Tear-down */
let newJobData;
let jobOneId;

beforeAll(async () => {
  await db.query('DELETE FROM companies');
  await db.query('DELETE FROM jobs');

  userToken = jwt.sign({ username: 'bob', is_admin: false }, SECRET_KEY);
  adminToken = jwt.sign({ username: 'susan', is_admin: true }, SECRET_KEY);

  newJobData = {
    title: 'project manager',
    salary: 1000,
    equity: 0.5,
    company_handle: 'apple',
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

  // create test data in jobs table
  const jobsCreate = await db.query(
    `INSERT INTO jobs (title, salary, equity, company_handle)
    VALUES ('Software Engineer', 10000, 0.1, 'ibm')
    RETURNING id`
  );
  jobOneId = jobsCreate.rows[0].id;

  // create test data in jobs table with later timestamp than first job
  await db.query(
    `INSERT INTO jobs (title, salary, equity, company_handle)
    VALUES ('Backend Developer', 8000, 0.05, 'apple')`
  );
});

afterEach(async () => {
  await db.query('DELETE FROM companies');
  await db.query('DELETE FROM jobs');
});

afterAll(async () => {
  await db.end();
});

/***********/
/** Tests */
//
// TODO: Write tests with non-admin token or missing token as appropriate.

/** GET all */
describe('GET /jobs', () => {
  test('returns all jobs', async () => {
    const resp = await client.get('/jobs').send({ token: userToken });

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      jobs: [
        {
          title: 'Backend Developer',
          company_handle: 'apple',
        },
        {
          title: 'Software Engineer',
          company_handle: 'ibm',
        },
      ],
    });
  });

  test('filters results by title when search term given', async () => {
    const resp = await client
      .get('/jobs?search=soft')
      .send({ token: userToken });

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      jobs: [
        {
          title: 'Software Engineer',
          company_handle: 'ibm',
        },
      ],
    });
  });

  test('filters results when min_salary given', async () => {
    const resp = await client
      .get('/jobs?min_salary=9000')
      .send({ token: userToken });

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      jobs: [
        {
          title: 'Software Engineer',
          company_handle: 'ibm',
        },
      ],
    });
  });

  test('filters results when min_equity given', async () => {
    const resp = await client
      .get('/jobs?min_equity=0.09')
      .send({ token: userToken });

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      jobs: [
        {
          company_handle: 'ibm',
          title: 'Software Engineer',
        },
      ],
    });
  });
});

/** POST */
describe('POST /jobs', () => {
  test('returns 201 with job data and data is seen at GET /jobs', async () => {
    const createResp = await client.post('/jobs').send(newJobData);

    expect(createResp.statusCode).toEqual(201);
    expect(createResp.body).toEqual({
      job: {
        id: expect.any(Number),
        title: 'project manager',
        salary: 1000,
        equity: 0.5,
        company_handle: 'apple',
        date_posted: expect.any(String),
      },
    });

    const allResp = await client.get('/jobs').send({ token: userToken });

    expect(allResp.body.jobs.length).toEqual(3);
    expect(allResp.body.jobs).toContainEqual({
      title: 'project manager',
      company_handle: 'apple',
    });
  });

  test('returns 400 with bad job data - missing data', async () => {
    const badData = { ...newJobData };
    delete badData.title;
    const resp = await client.post('/jobs').send(badData);

    expect(resp.statusCode).toEqual(400);
  });
});

/** GET job detail */
describe('GET /jobs/:id', () => {
  test('returns job details', async () => {
    const resp = await client
      .get(`/jobs/${jobOneId}`)
      .send({ token: userToken });

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      job: {
        id: expect.any(Number),
        title: 'Software Engineer',
        salary: 10000,
        equity: 0.1,
        company_handle: 'ibm',
        date_posted: expect.any(String),
      },
    });
  });

  test('returns 404 with bad id', async () => {
    const resp = await client.get('/jobs/0').send({ token: userToken });

    expect(resp.statusCode).toEqual(404);
  });
});

/** PATCH */
describe('PATCH /jobs:id', () => {
  test('returns 200 with updated data and change seen at detail endpoint', async () => {
    const patchResp = await client.patch(`/jobs/${jobOneId}`).send(newJobData);

    expect(patchResp.statusCode).toEqual(200);
    expect(patchResp.body).toEqual({
      job: {
        id: expect.any(Number),
        title: 'project manager',
        salary: 1000,
        equity: 0.5,
        company_handle: 'apple',
        date_posted: expect.any(String),
      },
    });

    const getAllResp = await client.get('/jobs').send({ token: userToken });

    expect(getAllResp.body.jobs.length).toEqual(2);
    expect(getAllResp.body.jobs).toContainEqual({
      title: 'project manager',
      company_handle: 'apple',
    });
  });

  test('returns 400 with bad job data - extra data', async () => {
    const badData = { ...newJobData };
    badData.extraData = true;
    const resp = await client.patch(`/jobs/${jobOneId}`).send(badData);

    expect(resp.statusCode).toEqual(400);
  });

  test('returns 404 with bad id', async () => {
    const resp = await client.patch('/jobs/0').send(newJobData);

    expect(resp.statusCode).toEqual(404);
  });
});

/** DELETE */
describe('DELETE /jobs:id', () => {
  test('returns 200 status with "Job deleted" message and then returns 404', async () => {
    const firstResp = await client
      .delete(`/jobs/${jobOneId}`)
      .send({ token: adminToken });

    expect(firstResp.statusCode).toEqual(200);
    expect(firstResp.body).toEqual({ message: 'Job deleted' });

    const secondResp = await client
      .delete(`/jobs/${jobOneId}`)
      .send({ token: adminToken });

    expect(secondResp.statusCode).toEqual(404);
  });

  test('returns 404 with bad id', async () => {
    const resp = await client.delete('/jobs/0').send({ token: adminToken });

    expect(resp.statusCode).toEqual(404);
  });
});
