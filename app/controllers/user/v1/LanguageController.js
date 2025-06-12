/* eslint-disable no-await-in-loop */
/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
import { Op } from 'sequelize';
import Constant from '../../../utils/constants';
import { responseError, responseSuccess } from '../../../utils/output';
import {
  Language, sequelize,
} from '../../../models';

/**
 * Get a list of languages with optional pagination and search
 * @param {Object} req - Express request object containing query parameters
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with languages and pagination metadata
 */
export async function getLanguages(req, res) {
  try {
    // Extract query parameters
    let { limit, page } = req.query;
    const { search } = req.query;

    // Initialize base query parameters
    const queryParams = {
      where: {},
      order: [[ 'title', 'ASC']], // Sort languages alphabetically by title
    };

    // Add pagination if both limit and page are provided
    if (limit && page) {
      limit = limit ? Number(limit) : Constant.PAGINATION.LIMIT;
      page = page ? Number(page) : Constant.PAGINATION.PAGE;

      const offset = (page - 1) * limit;
      queryParams.limit = limit;
      queryParams.offset = offset;
    }

    // Add search conditions if search parameter is provided
    if (search) {
      queryParams.where[Op.or] = [
        { title: { [Op.like]: `%${search.trim()}%` } }, // Search in language titles
        { code: { [Op.like]: `%${search.trim()}%` } }   // Search in language codes
      ];
    }

    // Execute the query
    const languages = await Language.findAndCountAll(queryParams);

    // Prepare response with languages and conditional pagination metadata
    const response = {
      languages: languages.rows,
      metadata: {
        totalItems: languages.count,
        currentPage: limit && page ? page : 1,
        totalPages: limit && page ? Math.ceil(languages.count / limit) : 1,
      },
    };

    return responseSuccess(res, response);
  } catch (err) {
    return responseError(res, err);
  }
}
