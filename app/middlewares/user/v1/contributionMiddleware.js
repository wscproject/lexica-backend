/* eslint-disable import/prefer-default-export */
import Joi from 'joi';
import Constant from '../../../utils/constants';
import { joiFormErrors } from '../../../utils/function';
import { responseError } from '../../../utils/output';

/**
 * Middleware to validate start contribution request
 * Validates language code and activity type for starting a new contribution
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function validateStartContribution(req, res, next) {
  try {
    // Define validation schema for start contribution
    const schema = {
      languageCode: Joi.string().required(), // Language code is required
      activityType: Joi.string().valid( // Activity type must be one of the valid types
        Constant.ACTIVITY.CONNECT,
        Constant.ACTIVITY.SCRIPT,
        Constant.ACTIVITY.HYPHENATION
      ),
    };
    const payloadObject = joiFormErrors({
      joiSchema: schema,
      parameters: req.body,
    });
    
    if (payloadObject) {
      return responseError(res, payloadObject, 'validateStartContribution');
    }
    return next();
  } catch (err) {
    return responseError(res, 'joi error', 'validateStartContribution');
  }
}

/**
 * Middleware to validate get contribution connect detail request
 * Validates contribution ID and item ID from request parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function validateGetContributionConnectDetail(req, res, next) {
  try {
    const schema = {
      contributionId: Joi.string().required(), // Contribution ID is required
      id: Joi.string().required(), // Item ID is required
    };
    const payloadObject = joiFormErrors({
      joiSchema: schema,
      parameters: req.params,
    });
    
    if (payloadObject) {
      return responseError(res, payloadObject, 'validateGetContributionConnectDetail');
    }
    return next();
  } catch (err) {
    return responseError(res, 'joi error', 'validateGetContributionConnectDetail');
  }
}

/**
 * Middleware to validate get contribution script detail request
 * Validates contribution ID and item ID from request parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function validateGetContributionScriptDetail(req, res, next) {
  try {
    const schema = {
      contributionId: Joi.string().required(), // Contribution ID is required
      id: Joi.string().required(), // Item ID is required
    };
    const payloadObject = joiFormErrors({
      joiSchema: schema,
      parameters: req.params,
    });
    
    if (payloadObject) {
      return responseError(res, payloadObject, 'validateGetContributionScriptDetail');
    }
    return next();
  } catch (err) {
    return responseError(res, 'joi error', 'validateGetContributionScriptDetail');
  }
}

/**
 * Middleware to validate get contribution hyphenation detail request
 * Validates contribution ID and item ID from request parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function validateGetContributionHyphenationDetail(req, res, next) {
  try {
    const schema = {
      contributionId: Joi.string().required(), // Contribution ID is required
      id: Joi.string().required(), // Item ID is required
    };
    const payloadObject = joiFormErrors({
      joiSchema: schema,
      parameters: req.params,
    });
    
    if (payloadObject) {
      return responseError(res, payloadObject, 'validateGetContributionHyphenationDetail');
    }
    return next();
  } catch (err) {
    return responseError(res, 'joi error', 'validateGetContributionHyphenationDetail');
  }
}

/**
 * Middleware to validate update contribution connect detail request
 * Validates contribution ID, item ID, action type, and item ID based on action
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function validateUpdateContributionConnectDetail(req, res, next) {
  try {
    const schema = {
      contributionId: Joi.string().required(), // Contribution ID is required
      id: Joi.string().required(), // Item ID is required
      action: Joi.string().valid( // Action must be one of the valid actions
        Constant.CONTRIBUTION_DETAIL_ACTION.ADD,
        Constant.CONTRIBUTION_DETAIL_ACTION.NO_ITEM,
        Constant.CONTRIBUTION_DETAIL_ACTION.SKIP
      ),
      itemId: Joi.string().when('action', { // Item ID is required only for ADD action
        is: Constant.CONTRIBUTION_DETAIL_ACTION.ADD,
        then: Joi.required(),
        otherwise: Joi.string().allow(null, ''),
      })
    };
    const payloadObject = joiFormErrors({
      joiSchema: schema,
      parameters: { ...req.params, ...req.body},
    });
    
    if (payloadObject) {
      return responseError(res, payloadObject, 'validateUpdateContributionConnectDetail');
    }
    return next();
  } catch (err) {
    return responseError(res, 'joi error', 'validateUpdateContributionConnectDetail');
  }
}

/**
 * Middleware to validate update contribution script detail request
 * Validates contribution ID, item ID, action type, and lemma based on action
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function validateUpdateContributionScriptDetail(req, res, next) {
  try {
    const schema = {
      contributionId: Joi.string().required(), // Contribution ID is required
      id: Joi.string().required(), // Item ID is required
      action: Joi.string().valid( // Action must be one of the valid actions
        Constant.CONTRIBUTION_DETAIL_ACTION.ADD,
        Constant.CONTRIBUTION_DETAIL_ACTION.SKIP
      ),
      lemma: Joi.string().when('action', { // Lemma is required only for ADD action
        is: Constant.CONTRIBUTION_DETAIL_ACTION.ADD,
        then: Joi.required(),
        otherwise: Joi.string().allow(null, ''),
      })
    };
    const payloadObject = joiFormErrors({
      joiSchema: schema,
      parameters: { ...req.params, ...req.body},
    });
    
    if (payloadObject) {
      return responseError(res, payloadObject, 'validateUpdateContributionScriptDetail');
    }
    return next();
  } catch (err) {
    return responseError(res, 'joi error', 'validateUpdateContributionScriptDetail');
  }
}

/**
 * Middleware to validate update contribution hyphenation detail request
 * Validates contribution ID, item ID, action type, and hyphenation array based on action
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function validateUpdateContributionHyphenationDetail(req, res, next) {
  try {
    const schema = {
      contributionId: Joi.string().required(), // Contribution ID is required
      id: Joi.string().required(), // Item ID is required
      action: Joi.string().valid( // Action must be one of the valid actions
        Constant.CONTRIBUTION_DETAIL_ACTION.ADD,
        Constant.CONTRIBUTION_DETAIL_ACTION.SKIP
      ),
      hyphenation: Joi.when('action', { // Hyphenation array is required only for ADD action
        is: Constant.CONTRIBUTION_DETAIL_ACTION.ADD,
        then: Joi.array().items(Joi.string()).min(1).required(),
        otherwise: Joi.alternatives([
            Joi.array().items(Joi.string()).default([]),  // Allow empty array
            Joi.valid(null) // Allow null
        ]),
      }),
    };
    const payloadObject = joiFormErrors({
      joiSchema: schema,
      parameters: { ...req.params, ...req.body},
    });
    
    if (payloadObject) {
      return responseError(res, payloadObject, 'validateUpdateContributionHyphenationDetail');
    }
    return next();
  } catch (err) {
    console.log(err);
    return responseError(res, 'joi error', 'validateUpdateContributionHyphenationDetail');
  }
}
