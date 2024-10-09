/* eslint-disable import/prefer-default-export */
import Joi from 'joi';
import { joiFormErrors } from '../../../utils/function';
import { responseError } from '../../../utils/output';

export async function validateGetAccessToken(req, res, next) {
  try {
    const schema = {
      code: Joi.string().required(),
      displayLanguageCode: Joi.string().required(),
    };
    const payloadObject = joiFormErrors({
      joiSchema: schema,
      parameters: req.body,
    });

    if (payloadObject) {
      return responseError(res, payloadObject, 'validateGetAccessToken');
    }
    return next();
  } catch (err) {
    return responseError(res, 'joi error', 'validateGetAccessToken');
  }
}

export async function validateRefreshAccessToken(req, res, next) {
  try {
    const schema = {
      refreshToken: Joi.string().required(),
    };
    const payloadObject = joiFormErrors({
      joiSchema: schema,
      parameters: req.body,
    });

    if (payloadObject) {
      return responseError(res, payloadObject, 'validateRefreshAccessToken');
    }
    return next();
  } catch (err) {
    return responseError(res, 'joi error', 'validateRefreshAccessToken');
  }
}
