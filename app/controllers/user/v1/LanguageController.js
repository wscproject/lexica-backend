/* eslint-disable no-await-in-loop */
/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
import { Op } from 'sequelize';
import Constant from '../../../utils/constants';
import { responseError, responseSuccess } from '../../../utils/output';
import {
  Language, sequelize,
} from '../../../models';

// LIST
export async function getLanguages(req, res) {
  try {
    let { limit, page } = req.query;
    const { search } = req.query;

    limit = limit ? Number(limit) : Constant.PAGINATION.LIMIT;
    page = page ? Number(page) : Constant.PAGINATION.PAGE;

    const offset = (page - 1) * limit;

    const queryParams = {
      where: {},
      limit,
      offset,
      order: [[ 'title', 'ASC']],
    };

    if (search) {
      queryParams.where[Op.or] = [
        { title: { [Op.like]: `%${search.trim()}%` } },
      ];
    }

    const languages = await Language.findAndCountAll(queryParams);

    const response = {
      languages: languages.rows,
      metadata: {
        totalItems: languages.count,
        currentPage: page,
        totalPages: Math.ceil(languages.count / limit),
      },
    };

    return responseSuccess(res, response);
  } catch (err) {
    return responseError(res, err);
  }
}
