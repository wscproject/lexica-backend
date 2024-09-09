/* eslint-disable no-await-in-loop */
/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
import { UserPreference, Contribution, sequelize } from '../../../models';
import Status from '../../../utils/status';
import Constant from '../../../utils/constants';
import { responseError, responseSuccess } from '../../../utils/output';

export async function getUserProfile(req, res) {
  try {
    const { loggedInUser } = req;

    // get ongoing contribution
    const ongoingContributionData = await Contribution.findOne({
      where: {
        userId: loggedInUser.userId,
        status: Constant.CONTRIBUTION_STATUS.PENDING,
      },
    });

    const ongoingContribution = ongoingContributionData ? true : false;

    return responseSuccess(res, { ...loggedInUser, ongoingContribution });
  } catch (err) {
    return responseError(res, err);
  }
}

export async function updateUserPreference(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { loggedInUser } = req;
    const { displayLanguage, displayTheme } = req.body;

    const updateUserPreference = {};

    if (displayLanguage) {
      updateUserPreference.displayLanguage = displayLanguage;
    }

    if (displayTheme) {
      updateUserPreference.displayTheme = displayTheme;
    }

    await UserPreference.update(updateUserPreference, {
      where: {
        userId: loggedInUser.userId
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
