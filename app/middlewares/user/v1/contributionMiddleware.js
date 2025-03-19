/* eslint-disable import/prefer-default-export */
import Joi from 'joi';
import Constant from '../../../utils/constants';
import { joiFormErrors } from '../../../utils/function';
import { responseError } from '../../../utils/output';

export async function validateStartContribution(req, res, next) {
  try {
    const schema = {
      languageCode: Joi.string().required(),
      activityType: Joi.string().valid(Constant.ACTIVITY.CONNECT, Constant.ACTIVITY.SCRIPT, Constant.ACTIVITY.HYPHENATION),
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

export async function validateGetContributionConnectDetail(req, res, next) {
  try {
    const schema = {
      contributionId: Joi.string().required(),
      id: Joi.string().required(),
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

export async function validateGetContributionScriptDetail(req, res, next) {
  try {
    const schema = {
      contributionId: Joi.string().required(),
      id: Joi.string().required(),
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

export async function validateGetContributionHyphenationDetail(req, res, next) {
  try {
    const schema = {
      contributionId: Joi.string().required(),
      id: Joi.string().required(),
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

export async function validateUpdateContributionConnectDetail(req, res, next) {
  try {
    const schema = {
      contributionId: Joi.string().required(),
      id: Joi.string().required(),
      action: Joi.string().valid(Constant.CONTRIBUTION_DETAIL_ACTION.ADD, Constant.CONTRIBUTION_DETAIL_ACTION.NO_ITEM, Constant.CONTRIBUTION_DETAIL_ACTION.SKIP),
      itemId: Joi.string().when('action', {
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

export async function validateUpdateContributionScriptDetail(req, res, next) {
  try {
    const schema = {
      contributionId: Joi.string().required(),
      id: Joi.string().required(),
      action: Joi.string().valid(Constant.CONTRIBUTION_DETAIL_ACTION.ADD, Constant.CONTRIBUTION_DETAIL_ACTION.SKIP),
      lemma: Joi.string().when('action', {
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

export async function validateUpdateContributionHyphenationDetail(req, res, next) {
  try {
    const schema = {
      contributionId: Joi.string().required(),
      id: Joi.string().required(),
      action: Joi.string().valid(Constant.CONTRIBUTION_DETAIL_ACTION.ADD, Constant.CONTRIBUTION_DETAIL_ACTION.SKIP),
      hyphenation: Joi.when('action', {
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
