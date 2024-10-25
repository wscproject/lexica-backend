/* eslint-disable import/prefer-default-export */
import Joi from 'joi';
import Constant from '../../../utils/constants';
import { joiFormErrors } from '../../../utils/function';
import { responseError } from '../../../utils/output';

export async function validateStartContributionConnect(req, res, next) {
  try {
    const schema = {
      languageCode: Joi.string().required(),
    };
    const payloadObject = joiFormErrors({
      joiSchema: schema,
      parameters: req.body,
    });
    
    if (payloadObject) {
      return responseError(res, payloadObject, 'validateStartContributionConnect');
    }
    return next();
  } catch (err) {
    return responseError(res, 'joi error', 'validateStartContributionConnect');
  }
}

export async function validateStartContributionScript(req, res, next) {
  try {
    const schema = {
      languageCode: Joi.string().required(),
    };
    const payloadObject = joiFormErrors({
      joiSchema: schema,
      parameters: req.body,
    });
    
    if (payloadObject) {
      return responseError(res, payloadObject, 'validateStartContributionScript');
    }
    return next();
  } catch (err) {
    return responseError(res, 'joi error', 'validateStartContributionScript');
  }
}

export async function validateUpdateContributionConnectDetail(req, res, next) {
  try {
    const schema = {
      contributionDetailId: Joi.string().required(),
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
      contributionDetailId: Joi.string().required(),
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
      return responseError(res, payloadObject, 'validateUpdateContributionDetail');
    }
    return next();
  } catch (err) {
    return responseError(res, 'joi error', 'validateUpdateContributionDetail');
  }
}
