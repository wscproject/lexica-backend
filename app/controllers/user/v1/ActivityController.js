/* eslint-disable no-await-in-loop */
/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
import { Op } from 'sequelize';
import Constant from '../../../utils/constants';
import { responseError, responseSuccess } from '../../../utils/output';
import {
  Activity, Language, LanguageActivity, sequelize,
} from '../../../models';

/**
 * Get a paginated list of activities with optional filtering
 * @param {Object} req - Express request object containing query parameters
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with activities and pagination metadata
 */
export async function getActivities(req, res) {
  try {
    // Extract and parse pagination parameters from query
    let { limit, page } = req.query;
    const { search, languageId } = req.query;

    // Set default pagination values if not provided
    limit = limit ? Number(limit) : Constant.PAGINATION.LIMIT;
    page = page ? Number(page) : Constant.PAGINATION.PAGE;

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build the query parameters object for Sequelize
    const queryParams = {
      where: {}, // Base where clause
      limit,     // Number of records per page
      offset,    // Number of records to skip
      order: [[ 'order', 'ASC']], // Sort activities by order field
      distinct: true,
      include: { 
        attributes: [], // Don't include any attributes from the join table
        model: Language,
        as: 'languages',
        where: {},
        through: { attributes: [] }, // Don't include attributes from the junction table
        required: true, // Inner join - only return activities that have languages
      },
    };

    // Add search condition if search parameter is provided
    if (search) {
      queryParams.where[Op.or] = [
        { title: { [Op.like]: `%${search.trim()}%` } }, // Search in activity titles
      ];
    }

    // Filter by language if languageId is provided
    if (languageId) {
      queryParams.include.where.id = languageId
    }

    // Execute the query with pagination
    const activities = await Activity.findAndCountAll(queryParams);

    // Prepare the response object with activities and pagination metadata
    const response = {
      activities: activities.rows,
      metadata: {
        totalItems: activities.count,
        currentPage: page,
        totalPages: Math.ceil(activities.count / limit),
      },
    };

    return responseSuccess(res, response);
  } catch (err) {
    return responseError(res, err);
  }
}
