/* eslint-disable no-await-in-loop */
/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
import { User, Contribution, Language, sequelize } from '../../../models';
import Status from '../../../utils/status';
import Constant from '../../../utils/constants';
import { responseError, responseSuccess } from '../../../utils/output';

export async function getUserProfile(req, res) {
  try {
    const { loggedInUser } = req;

    // get ongoing contribution
    const ongoingContributionData = await Contribution.findOne({
      where: {
        userId: loggedInUser.id,
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

    const response = {
      id: loggedInUser.id,
      username: loggedInUser.username,
      languageId: loggedInUser.languageId,
      languageCode: loggedInUser.languageCode,
      displayLanguageCode: loggedInUser.displayLanguageCode,
      displayTheme: loggedInUser.displayTheme,
      activityType: loggedInUser.activityType,
      isAlternateFont: loggedInUser.isAlternateFont,
      isBold: loggedInUser.isBold,
      ongoingContribution,
      language
    }

    return responseSuccess(res, response);
  } catch (err) {
    return responseError(res, err);
  }
}

export async function updateUserPreference(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { loggedInUser } = req;
    const { displayLanguageCode, displayTheme, isAlternateFont, isBold, isUnderline } = req.body;

    const updateUserPreference = {};

    if (displayLanguageCode) {
      updateUserPreference.displayLanguageCode = displayLanguageCode;
    }

    if (displayTheme) {
      updateUserPreference.displayTheme = displayTheme;
    }

    if (isAlternateFont !== undefined) {
      updateUserPreference.isAlternateFont = isAlternateFont;
    }

    if (isBold !== undefined) {
      updateUserPreference.isBold = isBold;
    }

    if (isUnderline !== undefined) {
      updateUserPreference.isUnderline = isUnderline;
    }

    await User.update(updateUserPreference, {
      where: {
        id: loggedInUser.id
      },
      transaction
    });

    await transaction.commit();
    return responseSuccess(res, { id: loggedInUser.id, ...updateUserPreference});
  } catch (err) {
    await transaction.rollback();
    return responseError(res, err);
  }
}
