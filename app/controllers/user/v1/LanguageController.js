/* eslint-disable no-await-in-loop */
/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
import { Op } from 'sequelize';
import Constant from '../../../utils/constants';
import Status from '../../../utils/status';
import { responseError, responseSuccess } from '../../../utils/output';
import {
  Language, Activity, LanguageActivity, LanguageVariant, sequelize,
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

/**
 * Create a new language with associated activities and optional language variant
 * @param {Object} req - Express request object containing language data
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with created language data
 */
export async function createLanguage(req, res) {
  const transaction = await sequelize.transaction();

  try {
    const {
      externalId,
      code,
      title,
      isRtl = false,
      activities = [],
      languageVariant = null,
    } = req.body;

    let language = await Language.findOne({
      where: {
        [Op.or]: [
          { externalId },
          { code },
        ],
      },
      transaction,
    });

    let isNewLanguage = false;

    if (!language) {
      // Create new language if it doesn't exist
      language = await Language.create({
        externalId,
        code,
        title,
        isRtl,
      }, { transaction });
      isNewLanguage = true;
    }

    if (activities.length > 0) {
      const activityRecords = await Activity.findAll({
        where: { type: { [Op.in]: activities } },
        attributes: ['id', 'type'],
        transaction,
      });

      if (activityRecords.length !== activities.length) {
        throw Status.ERROR.LANGUAGE_ACTIVITY_NOT_FOUND;
      }

      // Check for existing language activities
      const existingLanguageActivities = await LanguageActivity.findAll({
        where: {
          languageId: language.id,
          activityId: { [Op.in]: activityRecords.map(a => a.id) },
        },
        transaction,
      });

      if (existingLanguageActivities.length > 0 && !isNewLanguage) {
        throw Status.ERROR.LANGUAGE_ACTIVITY_ALREADY_EXIST;
      }

      // Get IDs of activities that don't exist yet
      const existingActivityIds = existingLanguageActivities.map(la => la.activityId);
      const newActivityRecords = activityRecords.filter(a => !existingActivityIds.includes(a.id));

      if (newActivityRecords.length > 0) {
        const languageActivities = newActivityRecords.map(activity => ({
          languageId: language.id,
          activityId: activity.id,
        }));

        await LanguageActivity.bulkCreate(languageActivities, { transaction });
      }

      const scriptActivity = activityRecords.find(activity => activity.type === 'script');

      if (scriptActivity && languageVariant) {
        const existingVariant = await LanguageVariant.findOne({
          where: { languageId: language.id },
          transaction,
        });

        if (!existingVariant) {
          const {
            code: variantCode,
            codePreview,
            title: variantTitle,
            isRtl: variantIsRtl = false,
          } = languageVariant;

          await LanguageVariant.create({
            languageId: language.id,
            code: variantCode,
            codePreview,
            title: variantTitle,
            isRtl: variantIsRtl,
          }, { transaction });
        }
      }
    }

    const createdLanguage = await Language.findByPk(language.id, {
      include: [
        {
          model: Activity,
          as: 'activities',
          through: { attributes: [] },
        },
        {
          model: LanguageVariant,
          as: 'languageVariant',
        },
      ],
      transaction,
    });

    await transaction.commit();

    return responseSuccess(res, { language: createdLanguage });
  } catch (err) {
    await transaction.rollback();
    return responseError(res, err);
  }
}
