/* eslint-disable import/prefer-default-export */
import Joi from 'joi';
import { joiFormErrors } from '../../../utils/function';
import { responseError } from '../../../utils/output';

export async function validateGetLexemeSenseDetail(req, res, next) {
  try {
    const schema = {
      senseId: Joi.string().required(),
    };
    const payloadObject = joiFormErrors({
      joiSchema: schema,
      parameters: req.params,
    });
    
    if (payloadObject) {
      return responseError(res, payloadObject, 'validateGetLexemeSenseDetail');
    }
    return next();
  } catch (err) {
    return responseError(res, 'joi error', 'validateGetLexemeSenseDetail');
  }
}
