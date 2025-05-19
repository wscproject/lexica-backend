/* eslint-disable import/prefer-default-export */
import Joi from 'joi';
import Constant from '../../../utils/constants';
import { joiFormErrors } from '../../../utils/function';
import { responseError } from '../../../utils/output';

/**
 * Middleware to validate user preference update request
 * Validates the format and values of user preference fields
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object|void} Returns error response if validation fails, otherwise calls next()
 */
export async function validateUpdateUserPreference(req, res, next) {
  try {
    // Define validation schema for user preferences
    const schema = {
      displayLanguageCode: Joi.string(), // Optional language code for display
      displayTheme: Joi.string()
        .valid( // Theme must be one of the valid themes
          Constant.DISPLAY_THEME.DEFAULT,
          Constant.DISPLAY_THEME.DARK,
          Constant.DISPLAY_THEME.LIGHT
        )
        .allow(null, ''), // Allow null or empty string
      isAlternateFont: Joi.boolean(), // Optional boolean for alternate font
      isBold: Joi.boolean(), // Optional boolean for bold text
      isUnderline: Joi.boolean(), // Optional boolean for underlined text
    };
    
    // Validate request body against schema
    const payloadObject = joiFormErrors({
      joiSchema: schema,
      parameters: req.body,
    });

    // If validation fails, return error response
    if (payloadObject) {
      return responseError(res, payloadObject, 'validateUpdateUserPreference');
    }

    // If validation passes, proceed to next middleware
    return next();
  } catch (err) {
    // Handle any unexpected errors during validation
    return responseError(res, 'joi error', 'validateUpdateUserPreference');
  }
}
