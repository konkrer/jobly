/** Class to hold company database methods. */

const db = require('../db');
const partialUpdate = require('../helpers/partialUpdate');

/**
 *  Class to hold company database methods.
 */

class Company {
  constructor() {}

  /**
   * @param {object literal} queryParams
   *
   * Return handle and name of all companies.
   * Filter by seach term for name, min and/or max employees.
   */
  static async all(queryParams) {
    // get parameters from query parameters or use default.
    const search = queryParams.search || '';
    const min_employees = queryParams.min_employees || 0;
    const max_employees = queryParams.max_employees || 2147483647; // largest INT

    const results = await db.query(
      `
      SELECT handle, name 
      FROM companies
      WHERE name ILIKE '%${search}%'
        AND num_employees > $1
        AND num_employees < $2`,
      [min_employees, max_employees]
    );

    return results.rows;
  }

  /**
   * Create a new company in database.
   * @param {object literal} company
   *
   * Return all company data.
   */
  static async create(company) {
    const { handle, name, num_employees, description, logo_url } = company;
    const result = await db.query(
      `INSERT INTO companies (handle, name, num_employees, description, logo_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING handle, name, num_employees, description, logo_url`,
      [handle, name, num_employees, description, logo_url]
    );
    return result.rows[0];
  }

  /**
   * GET company details.
   *
   * @param {string} handle
   *
   * Return all data for company with matching handle.
   */
  static async get(handle) {
    const result = await db.query(
      `SELECT *
      FROM companies
      WHERE handle=$1`,
      [handle]
    );
    return result.rows[0];
  }

  /**
   * Update (PATCH) company.
   *
   * @param {string} handle
   * @param {object literal} items
   *
   * return company data object.
   */
  static async update(handle, items) {
    const { query, values } = partialUpdate(
      'companies',
      items,
      'handle',
      handle
    );

    const result = await db.query(query, values);

    return result.rows[0];
  }

  /**
   * DELETE company
   *
   * @param {string} handle
   */
  static async delete(handle) {
    try {
      var result = await db.query(
        'DELETE FROM companies WHERE handle=$1 RETURNING *',
        [handle]
      );
    } catch (error) {
      next(error);
    }
    return result.rows[0];
  }
}

module.exports = Company;
