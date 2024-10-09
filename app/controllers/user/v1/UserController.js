/* eslint-disable no-await-in-loop */
/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
import { UserPreference, Contribution, Language, sequelize } from '../../../models';
import Status from '../../../utils/status';
import Constant from '../../../utils/constants';
import { responseError, responseSuccess } from '../../../utils/output';

export async function getUserProfile(req, res) {
  try {
    const { loggedInUser } = req;

    // get ongoing contribution
    const ongoingContributionData = await Contribution.findOne({
      where: {
        externalUserId: loggedInUser.externalUserId,
        status: Constant.CONTRIBUTION_STATUS.PENDING,
      },
    });

    const language = await Language.findOne({
      attributes: ['id', 'externalId', 'title', 'code'],
      where: {
        id: loggedInUser.languageId,
      }
    });

    const ongoingContribution = ongoingContributionData ? true : false;

    return responseSuccess(res, { ...loggedInUser, ongoingContribution, language });
  } catch (err) {
    return responseError(res, err);
  }
}

export async function updateUserPreference(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { loggedInUser } = req;
    const { displayLanguageCode, displayTheme } = req.body;

    const updateUserPreference = {};

    if (displayLanguageCode) {
      updateUserPreference.displayLanguageCode = displayLanguageCode;
    }

    if (displayTheme) {
      updateUserPreference.displayTheme = displayTheme;
    }

    await UserPreference.update(updateUserPreference, {
      where: {
        externalUserId: loggedInUser.externalUserId
      },
      transaction
    });

    await transaction.commit();
    return responseSuccess(res, { ...loggedInUser, ...updateUserPreference});
  } catch (err) {
    await transaction.rollback();
    return responseError(res, err);
  }
}
