/** Tests for user API endpoints */

process.env.NODE_ENV = 'test';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');
const db = require('../../db');
const { SECRET_KEY } = require('../../config');

const client = request(app);

/** Setup/ Tear-down */
let userOneToken;
let userTwoToken;
let newUserData;

beforeAll(async () => {
  await db.query('DELETE FROM users');

  userOneToken = jwt.sign({ username: 'BINGO1', is_admin: true }, SECRET_KEY);
  userTwoToken = jwt.sign({ username: 'hamlet', is_admin: false }, SECRET_KEY);

  newUserData = {
    username: 'moleman',
    first_name: 'Bill',
    last_name: 'Apple',
    email: 'holymoly@b.c',
    is_admin: false,
  };
});

beforeEach(async () => {
  // create test data in users table
  await db.query(
    `INSERT INTO users 
    VALUES ('BINGO1', 'password', 'Bill', 'Smith', 'a@b.c', 'https://duckduckgo.com/i/b2e38b1b.png', true),
           ('hamlet', 'okeydokey', 'William', 'Hunt', 'c@b.a', null, false)`
  );
});

afterEach(async () => {
  await db.query('DELETE FROM users');
});

afterAll(async () => {
  await db.end();
});

/***********/
/** Tests */
//
// TODO: Write tests with missing token as appropriate.

/** GET all */
describe('GET /users', () => {
  test('returns all users', async () => {
    const resp = await client.get('/users');

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      users: [
        {
          username: 'BINGO1',
          first_name: 'Bill',
          last_name: 'Smith',
          email: 'a@b.c',
        },
        {
          username: 'hamlet',
          first_name: 'William',
          last_name: 'Hunt',
          email: 'c@b.a',
        },
      ],
    });
  });
});

/** POST */
describe('POST /users', () => {
  test('returns 201 with user data and data is seen at GET /users', async () => {
    const body = { ...newUserData };
    body.password = 'password1';
    const createResp = await client.post('/users').send(body);

    expect(createResp.statusCode).toEqual(201);
    expect(createResp.body).toEqual({
      token: expect.any(String),
    });

    const allResp = await client.get('/users');

    expect(allResp.body.users.length).toEqual(3);
    expect(allResp.body.users).toContainEqual({
      username: 'moleman',
      first_name: 'Bill',
      last_name: 'Apple',
      email: 'holymoly@b.c',
    });
  });

  test('returns 400 with bad user data - missing data', async () => {
    const badData = { ...newUserData };
    delete badData.password;
    const resp = await client.post('/users').send(badData);

    expect(resp.statusCode).toEqual(400);
  });
});

/** GET user detail */
describe('GET /user/:username', () => {
  test('returns user details', async () => {
    const resp = await client.get(`/users/hamlet`);

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({
      user: {
        username: 'hamlet',
        first_name: 'William',
        last_name: 'Hunt',
        email: 'c@b.a',
        photo_url: null,
        is_admin: false,
      },
    });
  });

  test('returns 404 with bad username', async () => {
    const resp = await client.get('/user/badname');

    expect(resp.statusCode).toEqual(404);
  });
});

/** PATCH */
describe('PATCH /user:username', () => {
  test('returns 200 with updated data and change seen at detail endpoint', async () => {
    const body = { ...newUserData };
    body.token = userTwoToken;
    const patchResp = await client.patch(`/users/hamlet`).send(body);

    expect(patchResp.statusCode).toEqual(200);
    expect(patchResp.body).toEqual({
      user: {
        username: 'moleman',
        password: 'okeydokey',
        first_name: 'Bill',
        last_name: 'Apple',
        email: 'holymoly@b.c',
        photo_url: null,
        is_admin: false,
      },
    });

    const getAllResp = await client.get('/users');

    expect(getAllResp.body.users.length).toEqual(2);
    expect(getAllResp.body.users).toContainEqual({
      username: 'moleman',
      first_name: 'Bill',
      last_name: 'Apple',
      email: 'holymoly@b.c',
    });
  });

  test('returns 400 with bad user data - extra data', async () => {
    const badData = { ...newUserData };
    badData.extraData = true;
    badData.token = userTwoToken;
    const resp = await client.patch(`/users/hamlet`).send(badData);

    expect(resp.statusCode).toEqual(400);
  });

  test('returns 401 with bad id', async () => {
    const body = { ...newUserData };
    body.token = userTwoToken;
    const resp = await client.patch('/users/badusername').send(body);

    expect(resp.statusCode).toEqual(401);
  });
});

/** DELETE */
describe('DELETE /users:username', () => {
  test('returns 200 status with "User deleted" message and then returns 404', async () => {
    const firstResp = await client
      .delete(`/users/hamlet`)
      .send({ token: userTwoToken });

    expect(firstResp.statusCode).toEqual(200);
    expect(firstResp.body).toEqual({ message: 'User deleted' });

    const secondResp = await client
      .delete(`/users/hamlet`)
      .send({ token: userTwoToken });

    expect(secondResp.statusCode).toEqual(404);
  });

  test('returns 401 with bad username', async () => {
    const resp = await client
      .delete('/users/badusername')
      .send({ token: userTwoToken });

    expect(resp.statusCode).toEqual(401);
  });
});
