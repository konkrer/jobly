const { request } = require('express');

const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../config');
const ExpressError = require('../helpers/expressError');

/**
 * Login required.
 *
 * Verifiy valid token or raise error.
 */
function loginRequired(req, res, next) {
  try {
    const token = req.body.token;
    const payload = jwt.verify(token, SECRET_KEY);
    req.user = payload;
    delete req.body.token;
    return next();
  } catch (error) {
    next(new ExpressError('Valid token required', 401));
  }
}

/**
 * User must be owner of user profile.
 *
 * The request parameter "username"  must match req.user.username
 */
function userIsOwner(req, res, next) {
  if (req.user && req.params.username === req.user.username) return next();

  next(new ExpressError('Unauthorized', 401));
}

/**
 * User must be admin.
 */
function isAdmin(req, res, next) {
  if (req.user && req.user.is_admin) return next();

  next(new ExpressError('Unauthorized', 401));
}

module.exports = { loginRequired, userIsOwner, isAdmin };
