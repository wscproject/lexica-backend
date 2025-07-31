/* eslint-disable import/prefer-default-export */
import Joi from 'joi';
import Constant from '../../../utils/constants';
import { joiFormErrors } from '../../../utils/function';
import { responseError } from '../../../utils/output';

/**
 * Middleware to validate create language request
 * Validates language data, activities, and optional language variant
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object|void} Returns error response if validation fails, otherwise calls next()
 */
export async function validateCreateLanguage(req, res, next) {
  try {
    // Define validation schema for language creation
    const schema = {
      externalId: Joi.string().regex(/^Q\d+$/).required(), // Language QID must match Q\d+ format (e.g., Q188)
      code: Joi.string().regex(/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]+)*$/).required(), // ISO-style format (2-3 letters, optional hyphens)
      title: Joi.string().min(1).max(100).required(), // Title length 1-100 characters
      isRtl: Joi.boolean().default(false), // Right-to-left flag, defaults to false
      activities: Joi.array().items(Joi.string().valid(
        Constant.ACTIVITY.CONNECT,
        Constant.ACTIVITY.SCRIPT,
        Constant.ACTIVITY.HYPHENATION,
      )).min(1).required(), // Array of activity types (connect, script, hyphenation) - required with at least one item
      languageVariant: Joi.when('activities', {
        is: Joi.array().has(Joi.string().valid(Constant.ACTIVITY.SCRIPT)),
        then: Joi.object({
          code: Joi.string().required(),
          codePreview: Joi.string().min(1).max(100).required(),
          title: Joi.string().min(1).max(100).required(),
          isRtl: Joi.boolean().default(false),
        }).required(), // Language variant is required when script activity is present
        otherwise: Joi.object({
          code: Joi.string().required(),
          codePreview: Joi.string().min(1).max(100).required(),
          title: Joi.string().min(1).max(100).required(),
          isRtl: Joi.boolean().default(false),
        }).optional(), // Language variant is optional when script activity is not present
      }), // Language variant requirement depends on activities
    };

    // Validate request body against schema
    const payloadObject = joiFormErrors({
      joiSchema: schema,
      parameters: req.body,
    });

    // If validation fails, return error response
    if (payloadObject) {
      return responseError(res, payloadObject, 'validateCreateLanguage');
    }

    // If validation passes, proceed to next middleware
    return next();
  } catch (err) {
    // Handle any unexpected errors during validation
    return responseError(res, 'joi error', 'validateCreateLanguage');
  }
}
