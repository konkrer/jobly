/** Tests for auth API endpoints */

process.env.NODE_ENV = 'test';

const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../../app');
const db = require('../../db');

const client = request(app);

/**********************/
/** Setup/ Tear-down */

let passOneHash;
let loginBody;

beforeAll(async () => {
  await db.query('DELETE FROM users');

  passOneHash = bcrypt.hashSync('password', 4);

  loginBody = {
    username: 'BINGO1',
    password: 'password',
  };
});

beforeEach(async () => {
  // create test data in users table
  await db.query(
    `INSERT INTO users 
    VALUES ('BINGO1', '${passOneHash}', 'Bill', 'Smith', 'a@b.c', 'https://duckduckgo.com/i/b2e38b1b.png', true),
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

describe('POST /login', () => {
  test('with good credentials returns token', async () => {
    const resp = await client.post('/login').send(loginBody);

    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({ token: expect.any(String) });
  });

  test('with bad password returns 400', async () => {
    const badLogin = { ...loginBody };
    loginBody.password = 'nope';
    const resp = await client.post('/login').send(loginBody);

    expect(resp.statusCode).toEqual(400);
  });

  test('with bad username returns 400', async () => {
    const badLogin = { ...loginBody };
    loginBody.username = 'nope';
    const resp = await client.post('/login').send(loginBody);

    expect(resp.statusCode).toEqual(400);
  });

  test('with no data returns 400', async () => {
    const resp = await client.post('/login').send({});

    expect(resp.statusCode).toEqual(400);
  });
});
