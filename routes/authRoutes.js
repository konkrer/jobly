/** Auth endpoints */

const express = require('express');
const jsonschema = require('jsonschema');
const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../config');

const ExpressError = require('../helpers/expressError');
const User = require('../models/user');
const loginSchema = require('../schemas/loginSchema');

const router = new express.Router();

/**
 * Login route.
 *
 * Requires json body with username and password.
 *
 */
router.post('/login', async (req, res, next) => {
  // Check req.body for proper credentials provided.
  const schemaResult = jsonschema.validate(req.body, loginSchema);
  if (!schemaResult.valid) {
    let errors = schemaResult.errors.map(error => error.stack);
    let error = new ExpressError(errors, 400);
    return next(error);
  }
  // Validate credentials.
  const { username, password } = req.body;
  const user = await User.validate(username, password);
  // If credentials invalid
  if (!user) {
    return next(new ExpressError('Invalid username/password', 400));
  }
  // Create token
  const token = jwt.sign(user, SECRET_KEY);
  // Return token
  return res.json({ token });
});

module.exports = router;
