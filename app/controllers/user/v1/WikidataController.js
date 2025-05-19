/* eslint-disable no-await-in-loop */
/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
import { Op } from 'sequelize';
import Constant from '../../../utils/constants';
import { responseError, responseSuccess } from '../../../utils/output';
import { getLanguageList } from '../../../utils/wikidata';

/**
 * Get a list of languages from Wikidata
 * This controller acts as a proxy to fetch language data from the Wikidata API
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response containing the list of languages from Wikidata
 */
export async function getLanguages(req, res) {
  try {
    // Fetch language list from Wikidata using the utility function
    const response = await getLanguageList();

    return responseSuccess(res, response);
  } catch (err) {
    return responseError(res, err);
  }
}
