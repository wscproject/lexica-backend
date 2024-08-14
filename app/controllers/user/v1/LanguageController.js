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
    let { loggedInUser } = req;
    let { limit, page } = req.query;
    const { search, lang } = req.query;

    limit = limit ? Number(limit) : Constant.PAGINATION.LIMIT;
    page = page ? Number(page) : Constant.PAGINATION.PAGE;

    const offset = (page - 1) * limit;

    const queryParams = {
      where: {},
      limit,
      offset,
      order: loggedInUser.displayLanguage && loggedInUser.displayLanguage === Constant.DISPLAY_LANGUAGE.ID.ISO ? [[ 'titleId', 'ASC']] : [[ 'titleEn', 'ASC']]
    };

    if (search) {
      if (loggedInUser.displayLanguage && loggedInUser.displayLanguage === Constant.DISPLAY_LANGUAGE.ID.ISO) {
        queryParams.where[Op.or] = [
          { titleId: { [Op.iLike]: `%${search.trim()}%` } },
        ];
      } else {
        queryParams.where[Op.or] = [
          { titleEn: { [Op.iLike]: `%${search.trim()}%` } },
        ];
      }
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
