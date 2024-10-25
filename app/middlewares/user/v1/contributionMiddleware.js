/* eslint-disable import/prefer-default-export */
import Joi from 'joi';
import Constant from '../../../utils/constants';
import { joiFormErrors } from '../../../utils/function';
import { responseError } from '../../../utils/output';

export async function validateUpdateContributionDetail(req, res, next) {
  try {
    const schema = {
      senseId: Joi.string().required(),
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
      return responseError(res, payloadObject, 'validateUpdateContributionDetail');
    }
    return next();
  } catch (err) {
    return responseError(res, 'joi error', 'validateUpdateContributionDetail');
  }
}

export async function validateStartContribution(req, res, next) {
  try {
    const schema = {
      languageCode: Joi.string().required(),
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
