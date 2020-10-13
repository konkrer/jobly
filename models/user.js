/** Class to hold user database methods. */

const bcrypt = require('bcrypt');

const db = require('../db');
const partialUpdate = require('../helpers/partialUpdate');
const { BCRYPT_WORK_FACTOR } = require('../config');

/**
 *  Class to hold company database methods.
 */

class User {
  constructor() {}

  /**
   * Get all users.
   *
   * Return the username, first_name, last_name and email of all users.
   */
  static async all() {
    const results = await db.query(
      `SELECT  username, first_name, last_name, email 
      FROM users`
    );

    return results.rows;
  }

  /**
   * Create a new user in database.
   *
   * @param {object literal} user
   *
   * Return username, first_name, last_name, email, photo_url, is_admin.
   */
  static async create(user) {
    const {
      username,
      password,
      first_name,
      last_name,
      email,
      photo_url,
      is_admin,
    } = user;

    const hashedPass = bcrypt.hashSync(password, BCRYPT_WORK_FACTOR);

    const result = await db.query(
      `INSERT INTO users (username, password, first_name, last_name, email, photo_url, is_admin)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING username, first_name, last_name, email, photo_url, is_admin`,
      [username, hashedPass, first_name, last_name, email, photo_url, is_admin]
    );
    return result.rows[0];
  }

  /**
   * GET user details.
   *
   * @param {string} username
   */
  static async get(username) {
    const result = await db.query(
      `SELECT username, first_name, last_name, email, photo_url, is_admin
      FROM users
      WHERE username=$1`,
      [username]
    );
    return result.rows[0];
  }

  /**
   * Update (PATCH) user
   *
   * @param {string} username
   * @param {object literal} items
   *
   * return user data object
   */
  static async update(username, items) {
    const { query, values } = partialUpdate(
      'users',
      items,
      'username',
      username
    );

    const result = await db.query(query, values);

    return result.rows[0];
  }

  /**
   * DELETE user
   *
   * @param {number} username
   */
  static async delete(username) {
    try {
      var result = await db.query(
        'DELETE FROM users WHERE username=$1 RETURNING *',
        [username]
      );
    } catch (error) {
      next(error);
    }
    return result.rows[0];
  }

  /**
   * Validate user by username and password
   *
   * @param {string} username
   * @param {string} password
   *
   * Return username and is_admin values.
   */
  static async validate(username, password) {
    // get user data
    const result = await db.query(
      `SELECT username, is_admin, password
      FROM users 
      WHERE username=$1`,
      [username]
    );
    const user = result.rows[0];
    // If username not found in db return false.
    if (user) {
      // validate password
      const valid = bcrypt.compareSync(password, user.password);
      // if valid return username and is_admin
      if (valid) {
        delete user.password;
        return user;
      }
    }
    return false;
  }
}

module.exports = User;
