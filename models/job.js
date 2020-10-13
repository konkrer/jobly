/** Class to hold jobs database methods. */

const db = require('../db');
const partialUpdate = require('../helpers/partialUpdate');

/**
 *  Class to hold company database methods.
 */

class Job {
  constructor() {}

  /**
   * Get all jobs.
   *
   * @param {object literal} queryParams
   *
   * Return title and company_handle of all jobs.
   * Filter by seach term for name, min salary, or min equity.
   */
  static async all(queryParams) {
    // get parameters from query parameters or use default.
    const search = queryParams.search || '';
    const min_salary = +queryParams.min_salary || 0;
    const min_equity = +queryParams.min_equity || 0;

    const results = await db.query(
      `
      SELECT title, company_handle 
      FROM jobs
      WHERE title ILIKE '%${search}%'
        AND salary > $1
        AND equity > $2
      ORDER BY date_posted DESC`,
      [min_salary, min_equity]
    );

    return results.rows;
  }

  /**
   * Create a new job in database.
   *
   * @param {object literal} company
   *
   * Return all job data.
   */
  static async create(company) {
    const { title, salary, equity, company_handle } = company;
    const result = await db.query(
      `INSERT INTO jobs (title, salary, equity, company_handle)
      VALUES ($1, $2, $3, $4)
      RETURNING id, title, salary, equity, company_handle, date_posted`,
      [title, salary, equity, company_handle]
    );
    return result.rows[0];
  }

  /**
   * GET job details.
   *
   * @param {string} id
   */
  static async get(id) {
    const result = await db.query(
      `SELECT *
      FROM jobs
      WHERE id=$1`,
      [id]
    );
    return result.rows[0];
  }

  /**
   * Update (PATCH) Job
   *
   * @param {number} id
   * @param {object literal} items
   *
   * return job data object
   */
  static async update(id, items) {
    const { query, values } = partialUpdate('jobs', items, 'id', id);

    const result = await db.query(query, values);

    return result.rows[0];
  }

  /**
   * DELETE job
   *
   * @param {number} id
   */
  static async delete(id) {
    try {
      var result = await db.query('DELETE FROM jobs WHERE id=$1 RETURNING *', [
        id,
      ]);
    } catch (error) {
      next(error);
    }
    return result.rows[0];
  }

  /**
   * Get all jobs offered by a company. Find company by company_handle.
   *
   * @param {string} handle
   *
   * returns all job data for selected jobs.
   */
  static async getByCompanyHandle(handle) {
    const resp = await db.query(`SELECT * FROM jobs WHERE company_handle=$1`, [
      handle,
    ]);

    return resp.rows;
  }
}

module.exports = Job;
