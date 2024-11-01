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

    const queryParams = {
      where: {},
      order: [[ 'title', 'ASC']],
    };

    if (limit && page) {
      limit = limit ? Number(limit) : Constant.PAGINATION.LIMIT;
      page = page ? Number(page) : Constant.PAGINATION.PAGE;

      const offset = (page - 1) * limit;
      queryParams.limit = limit;
      queryParams.offset = offset;
    }

    if (search) {
      queryParams.where[Op.or] = [
        { title: { [Op.like]: `%${search.trim()}%` } },
        { code: { [Op.like]: `%${search.trim()}%` } }
      ];
    }

    const languages = await Language.findAndCountAll(queryParams);

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
