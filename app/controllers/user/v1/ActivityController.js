/* eslint-disable no-await-in-loop */
/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
import { Op } from 'sequelize';
import Constant from '../../../utils/constants';
import { responseError, responseSuccess } from '../../../utils/output';
import {
  Activity, Language, LanguageActivity, sequelize,
} from '../../../models';

// LIST
export async function getActivities(req, res) {
  try {
    let { limit, page } = req.query;
    const { search, languageId } = req.query;

    limit = limit ? Number(limit) : Constant.PAGINATION.LIMIT;
    page = page ? Number(page) : Constant.PAGINATION.PAGE;

    const offset = (page - 1) * limit;

    const queryParams = {
      where: {},
      limit,
      offset,
      order: [[ 'order', 'ASC']],
      include:{ 
        attributes: [],
        model: Language,
        as: 'languages',
        where: {},
        through: { attributes: [] },
        required: true,
      },
    };

    if (search) {
      queryParams.where[Op.or] = [
        { title: { [Op.like]: `%${search.trim()}%` } },
      ];
    }

    if (languageId) {
      queryParams.include.where.id = languageId
    }

    const activities = await Activity.findAndCountAll(queryParams);

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
