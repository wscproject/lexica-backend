/* eslint-disable no-await-in-loop */
/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
import { Op } from 'sequelize';
import Constant from '../../../utils/constants';
import { responseError, responseSuccess } from '../../../utils/output';
import { getLanguageList } from '../../../utils/wikidata';

// LIST
export async function getLanguages(req, res) {
  try {
    const response = await getLanguageList();

    return responseSuccess(res, response);
  } catch (err) {
    return responseError(res, err);
  }
}
