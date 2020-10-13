/** User endpoints */

const express = require('express');
const jsonschema = require('jsonschema');
const jwt = require('jsonwebtoken');

const { SECRET_KEY } = require('../config');
const ExpressError = require('../helpers/expressError');
const User = require('../models/user');
const userSchema = require('../schemas/userSchema');
const patchUserSchema = require('../schemas/patchUserSchema');
const { loginRequired, userIsOwner } = require('../middleware/authMiddleware');

const router = new express.Router();

/**
 * All users endpoint.
 *
 * Returns json with array of all users.
 */
router.get('/', async (req, res, next) => {
  try {
    var users = await User.all();
  } catch (error) {
    next(error);
  }
  return res.json({ users });
});

/**
 * Create user endpoint. Requires json body to match userSchema.
 *
 * Returns the newly created user data.
 */
router.post('/', async (req, res, next) => {
  // check request body data
  const schemaResult = jsonschema.validate(req.body, userSchema);
  if (!schemaResult.valid) {
    let errors = schemaResult.errors.map(error => error.stack);
    let error = new ExpressError(errors, 400);
    return next(error);
  }
  // create user
  try {
    var user = await User.create(req.body);
  } catch (error) {
    // if duplicate value in unique column
    if (error.code === '23505')
      // show message and status 400
      return next(new ExpressError(error.message, 400));
    return next(error);
  }
  // Create and return token for user
  const token = jwt.sign(
    { username: user.username, is_admin: user.is_admin },
    SECRET_KEY
  );
  return res.status(201).json({ token });
});

/**
 * Get user detail by id endpoint.
 *
 * @param {string} id
 *
 * Returns user data.
 */
router.get('/:id', async (req, res, next) => {
  try {
    var user = await User.get(req.params.id);
    if (!user) throw new ExpressError('User not found', 404);
  } catch (error) {
    return next(error);
  }
  return res.json({ user });
});

/**
 * Patch user endpoint.
 *
 * @param {string} username
 *
 * Returns user data.
 */
router.patch(
  '/:username',
  loginRequired,
  userIsOwner,
  async (req, res, next) => {
    const schemaResult = jsonschema.validate(req.body, patchUserSchema);

    if (!schemaResult.valid) {
      const errors = schemaResult.errors.map(error => error.stack);
      const error = new ExpressError(errors, 400);
      return next(error);
    }

    try {
      var user = await User.update(req.params.username, req.body);
      if (!user) throw new ExpressError('User not found', 404);
    } catch (error) {
      if (error.code === '23505' || error.code === '23503')
        next(new ExpressError(error.message, 400));
      return next(error);
    }
    return res.json({ user });
  }
);

/**
 * Delete user by username endpoint.
 *
 * @param { string } username
 *
 * Returns message.
 */
router.delete(
  '/:username',
  loginRequired,
  userIsOwner,
  async (req, res, next) => {
    try {
      var deleted = await User.delete(req.params.username);
    } catch (error) {
      next(error);
    }
    if (deleted) return res.json({ message: 'User deleted' });
    return res.status(404).json({ message: 'User not found' });
  }
);

module.exports = router;
