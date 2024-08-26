/* eslint-disable import/prefer-default-export */
import Joi from 'joi';
import { joiFormErrors } from '../../../utils/function';
import { responseError } from '../../../utils/output';
import Constant from '../../../utils/constants';

export async function validateUpdateUserPreference(req, res, next) {
  try {
    const schema = {
      displayLanguage: Joi.string().valid(Constant.DISPLAY_LANGUAGE.ID.ISO, Constant.DISPLAY_LANGUAGE.EN.ISO).required(),
    };
    
    const payloadObject = joiFormErrors({
      joiSchema: schema,
      parameters: req.body,
    });

    if (payloadObject) {
      return responseError(res, payloadObject, 'validateUpdateUserPreference');
    }
    return next();
  } catch (err) {
    return responseError(res, 'joi error', 'validateUpdateUserPreference');
  }
}