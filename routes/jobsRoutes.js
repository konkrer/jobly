/** Jobs endpoints. All responses are JSON. */

const express = require('express');
const jsonschema = require('jsonschema');

const ExpressError = require('../helpers/expressError');
const Job = require('../models/job');
const jobSchema = require('../schemas/jobSchema');
const patchJobSchema = require('../schemas/patchJobSchema');
const { loginRequired, isAdmin } = require('../middleware/authMiddleware');

const router = new express.Router();

/**
 * All jobs endpoint.
 *
 * Returns json with array of all jobs.
 */
router.get('/', loginRequired, async (req, res, next) => {
  try {
    var jobs = await Job.all(req.query);
  } catch (error) {
    next(error);
  }
  return res.json({ jobs });
});

/**
 * Create job endpoint. Requires json body to match jobSchema.
 *
 * Returns the newly created job data.
 */
router.post('/', loginRequired, isAdmin, async (req, res, next) => {
  // check request body data
  const schemaResult = jsonschema.validate(req.body, jobSchema);
  if (!schemaResult.valid) {
    let errors = schemaResult.errors.map(error => error.stack);
    let error = new ExpressError(errors, 400);
    return next(error);
  }
  // create job
  try {
    var job = await Job.create(req.body);
  } catch (error) {
    // if duplicate value in unique column
    if (error.code === '23505')
      // show message and status 400
      return next(new ExpressError(error.message, 400));
    return next(error);
  }
  return res.status(201).json({ job });
});

/**
 * Get job detail by id endpoint.
 *
 * @param {string} id
 *
 * Returns job data.
 */
router.get('/:id', loginRequired, async (req, res, next) => {
  try {
    var job = await Job.get(req.params.id);
    if (!job) throw new ExpressError('Job not found', 404);
  } catch (error) {
    return next(error);
  }
  return res.json({ job });
});

/**
 * Patch job endpoint.
 *
 * @param {string} id
 *
 * Returns job data.
 */
router.patch('/:id', loginRequired, isAdmin, async (req, res, next) => {
  const schemaResult = jsonschema.validate(req.body, patchJobSchema);

  if (!schemaResult.valid) {
    const errors = schemaResult.errors.map(error => error.stack);
    const error = new ExpressError(errors, 400);
    return next(error);
  }

  try {
    var job = await Job.update(req.params.id, req.body);
    if (!job) throw new ExpressError('Job not found', 404);
  } catch (error) {
    if (error.code === '23505' || error.code === '23503')
      next(new ExpressError(error.message, 400));
    return next(error);
  }
  return res.json({ job });
});

/**
 * Delete job by id endpoint.
 *
 * @param { string } id
 *
 * Returns message.
 */
router.delete('/:id', loginRequired, isAdmin, async (req, res, next) => {
  try {
    var deleted = await Job.delete(req.params.id);
  } catch (error) {
    next(error);
  }
  if (deleted) return res.json({ message: 'Job deleted' });
  return res.status(404).json({ message: 'Job not found' });
});

module.exports = router;
