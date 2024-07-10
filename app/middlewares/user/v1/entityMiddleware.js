/* eslint-disable import/prefer-default-export */
import Joi from 'joi';
import { joiFormErrors } from '../../../utils/function';
import { responseError } from '../../../utils/output';

export async function validateGetEntityDetail(req, res, next) {
  try {
    const schema = {
      entityId: Joi.string().required(),
    };
    const payloadObject = joiFormErrors({
      joiSchema: schema,
      parameters: req.params,
    });
    
    if (payloadObject) {
      return responseError(res, payloadObject, 'validateGetEntityDetail');
    }
    return next();
  } catch (err) {
    return responseError(res, 'joi error', 'validateGetEntityDetail');
  }
}
