/* eslint-disable import/prefer-default-export */
import Joi from 'joi';
import { joiFormErrors } from '../../../utils/function';
import { responseError } from '../../../utils/output';

/**
 * Middleware to validate get entity detail request
 * Validates that the entity ID is provided in the request parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object|void} Returns error response if validation fails, otherwise calls next()
 */
export async function validateGetEntityDetail(req, res, next) {
  try {
    // Define validation schema for entity detail request
    const schema = {
      entityId: Joi.string().required(), // Entity ID is required
    };

    // Validate request parameters against schema
    const payloadObject = joiFormErrors({
      joiSchema: schema,
      parameters: req.params,
    });
    
    // If validation fails, return error response
    if (payloadObject) {
      return responseError(res, payloadObject, 'validateGetEntityDetail');
    }

    // If validation passes, proceed to next middleware
    return next();
  } catch (err) {
    // Handle any unexpected errors during validation
    return responseError(res, 'joi error', 'validateGetEntityDetail');
  }
}
