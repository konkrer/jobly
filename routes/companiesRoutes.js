/** Company routes */

const express = require('express');
const jsonschema = require('jsonschema');

const ExpressError = require('../helpers/expressError');
const Company = require('../models/company');
const Job = require('../models/job');
const companySchema = require('../schemas/companySchema');
const patchCompSchema = require('../schemas/patchCompSchema');
const { loginRequired, isAdmin } = require('../middleware/authMiddleware');
const { minMaxOk } = require('../middleware/companyMiddleware');

const router = new express.Router();

/**
 * All companies endpoint.
 *
 * Returns json with array of all companies.
 */
router.get('/', loginRequired, minMaxOk, async (req, res, next) => {
  try {
    var companies = await Company.all(req.query);
  } catch (error) {
    return next(error);
  }
  return res.json({ companies });
});

/**
 * Create company endpoint. Requires json body to match companySchema.
 *
 * Returns the newly created company data.
 */
router.post('/', loginRequired, isAdmin, async (req, res, next) => {
  // check request body data
  const schemaResult = jsonschema.validate(req.body, companySchema);
  if (!schemaResult.valid) {
    let errors = schemaResult.errors.map(error => error.stack);
    let error = new ExpressError(errors, 400);
    return next(error);
  }
  // create company
  try {
    var company = await Company.create(req.body);
  } catch (error) {
    // if duplicate value in unique column
    if (error.code === '23505')
      // show message and status 400
      return next(new ExpressError(error.message, 400));
    return next(error);
  }
  return res.status(201).json({ company });
});

/**
 * Get company detail by handle endpoint.
 *
 * @param {string} handle
 *
 * Returns company data.
 */
router.get('/:handle', loginRequired, async (req, res, next) => {
  try {
    const handle = req.params.handle;
    var company = await Company.get(handle);
    if (!company) throw new ExpressError('Company not found', 404);
    var jobs = await Job.getByCompanyHandle(handle);
  } catch (error) {
    return next(error);
  }
  return res.json({ company, jobs });
});

/**
 * Patch company endpoint.
 *
 * @param {string} handle
 *
 * Returns company data.
 */
router.patch('/:handle', loginRequired, isAdmin, async (req, res, next) => {
  const schemaResult = jsonschema.validate(req.body, patchCompSchema);

  if (!schemaResult.valid) {
    const errors = schemaResult.errors.map(error => error.stack);
    const error = new ExpressError(errors, 400);
    return next(error);
  }

  try {
    var company = await Company.update(req.params.handle, req.body);
    if (!company) throw new ExpressError('Company not found', 404);
  } catch (error) {
    if (error.code === '23505') next(new ExpressError(error.message, 400));
    return next(error);
  }
  return res.json({ company });
});

/**
 * Delete company by handle endpoint.
 *
 * @param { string } handle
 *
 * Returns message.
 */
router.delete('/:handle', loginRequired, isAdmin, async (req, res, next) => {
  try {
    var deleted = await Company.delete(req.params.handle);
  } catch (error) {
    next(error);
  }
  if (deleted) return res.json({ message: 'Company deleted' });
  return res.status(404).json({ message: 'Company not found' });
});

module.exports = router;
