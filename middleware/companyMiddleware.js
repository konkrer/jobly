/** Middleware for company routes */

const ExpressError = require('../helpers/expressError');

/**
 * Ensure min_employees parameter is not greater than max_employees parameter.
 */
function minMaxOk(req, res, next) {
  const { min_employees, max_employees } = req.query;
  if (min_employees && max_employees && +min_employees > +max_employees)
    return next(
      new ExpressError('min_employees cannot be larger than max_employees', 400)
    );
  next();
}

module.exports = { minMaxOk };
