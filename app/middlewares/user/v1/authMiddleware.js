/* eslint-disable import/prefer-default-export */
import Joi from 'joi';
import { joiFormErrors } from '../../../utils/function';
import { responseError } from '../../../utils/output';

/**
 * Middleware to validate login request parameters
 * Validates that the required fields are present and properly formatted
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object|void} Returns error response if validation fails, otherwise calls next()
 */
export async function validateLogin(req, res, next) {
  try {
    // Define validation schema for login request
    const schema = {
      code: Joi.string().required(), // Authentication code is required
      displayLanguageCode: Joi.string().required(), // Language code for display is required
    };

    // Validate request body against schema
    const payloadObject = joiFormErrors({
      joiSchema: schema,
      parameters: req.body,
    });

    // If validation fails, return error response
    if (payloadObject) {
      return responseError(res, payloadObject, 'validateLogin');
    }

    // If validation passes, proceed to next middleware
    return next();
  } catch (err) {
    // Handle any unexpected errors during validation
    return responseError(res, 'joi error', 'validateGetAccessToken');
  }
}
