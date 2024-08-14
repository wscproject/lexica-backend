/* eslint-disable no-await-in-loop */
/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
import { UserPreference, sequelize } from '../../../models';
import Status from '../../../utils/status';
import { responseError, responseSuccess } from '../../../utils/output';

export async function getUserProfile(req, res) {
  try {
    const { loggedInUser } = req;

    return responseSuccess(res, loggedInUser);
  } catch (err) {
    return responseError(res, err);
  }
}

export async function updateUserPreference(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { loggedInUser } = req;
    const { displayLanguage } = req.body;

    const updateUserPreference = {
      displayLanguage,
    };

    await UserPreference.update(updateUserPreference, {
      where: {
        id: loggedInUser.id
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
