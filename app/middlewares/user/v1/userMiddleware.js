/* eslint-disable import/prefer-default-export */
import Joi from 'joi';
import Constant from '../../../utils/constants';
import { joiFormErrors } from '../../../utils/function';
import { responseError } from '../../../utils/output';

export async function validateUpdateUserPreference(req, res, next) {
  try {
    const schema = {
      displayLanguageCode: Joi.string(),
      displayTheme: Joi.string().valid(Constant.DISPLAY_THEME.DEFAULT, Constant.DISPLAY_THEME.DARK, Constant.DISPLAY_THEME.LIGHT).allow(null, ''),
      isAlternateFont: Joi.boolean(),
      isBold: Joi.boolean(),
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
