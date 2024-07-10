/* eslint-disable import/named */
/* eslint-disable no-plusplus */
/* eslint-disable max-len */
import Status from './status';
import Constant from './constants';
import { sequelize } from '../models';

const joiToForms = require('joi-errors-for-forms').form;
const Joi = require('joi');

const convertToForms = joiToForms();

export function joiFormErrors({ joiSchema, parameters }) {
  const joiResult = Joi.validate(parameters, joiSchema, {
    convert: true,
    abortEarly: false,
    allowUnknown: true,
  });
  if (!joiResult.error) {
    return null;
  }
  const errors = convertToForms(joiResult.error);
  return {
    ...Status.ERROR.MISSING_PARAMETERS,
    PAYLOAD: errors,
  };
}

export function getPagination(req) {
  let { limit, page } = req.query;
  limit = limit ? Number.parseInt(limit, 10) : Constant.PAGINATION.LIMIT;
  page = page ? Number.parseInt(page, 10) : Constant.PAGINATION.PAGE;
  const offset = (page - 1) * limit;
  return { limit, page, offset };
}

export function findObjectByKeyValue(array, key, value) {
  return array.find(item => item[key] === value);
}


export function generateShortCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';

  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }

  return result;
}

export async function generateDatabaseRunningNumber(model, prefix, transaction = null, padstart = 4) {
  const query = {
    attributes: [
      [sequelize.fn('MAX', sequelize.literal(`CAST(REPLACE(code,'${prefix}','') AS INTEGER)`)), 'runningNumber'],
    ],
  };

  if (transaction) {
    query.transaction = transaction;
  }

  const latestData = await model.findOne(query);

  return prefix + (latestData.dataValues.runningNumber ? latestData.dataValues.runningNumber + 1 : 1).toString().padStart(padstart, '0');
}

export function generateRandomUppercaseString(length) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  const charsetLength = charset.length;

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charsetLength);
    result += charset.charAt(randomIndex);
  }

  return result;
}

export function generateRandomString(length) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  let result = '';
  const charsetLength = charset.length;

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charsetLength);
    result += charset.charAt(randomIndex);
  }

  return result;
}
