/**
 * User Controller
 * Handles user profile management and preferences
 * 
 * This controller provides endpoints for:
 * 1. Retrieving user profile information
 * 2. Updating user preferences (language, theme, font settings)
 */

/* eslint-disable no-await-in-loop */
/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
import { User, Contribution, Language, sequelize } from '../../../models';
import Status from '../../../utils/status';
import Constant from '../../../utils/constants';
import { responseError, responseSuccess } from '../../../utils/output';

/**
 * Retrieves the complete user profile including preferences and ongoing contributions
 * 
 * @param {Object} req - Express request object containing loggedInUser
 * @param {Object} res - Express response object
 * @returns {Object} Response containing:
 *   - User basic info (id, username)
 *   - Language preferences
 *   - Display preferences (theme, font settings)
 *   - Ongoing contribution status
 *   - Associated language details
 */
export async function getUserProfile(req, res) {
  try {
    const { loggedInUser } = req;

    // Check for any ongoing contributions by the user
    const ongoingContributionData = await Contribution.findOne({
      where: {
        userId: loggedInUser.id,
        status: Constant.CONTRIBUTION_STATUS.PENDING,
      },
    });

    // Fetch user's selected language details
    const language = await Language.findOne({
      attributes: ['id', 'externalId', 'title', 'code'],
      where: {
        id: loggedInUser.languageId,
      }
    });

    // Convert contribution data to boolean flag
    const ongoingContribution = ongoingContributionData ? true : false;

    // Compile complete user profile response
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
      isUnderline: loggedInUser.isUnderline,
      isReducedMotion: loggedInUser.isReducedMotion,
      ongoingContribution,
      language
    }

    return responseSuccess(res, response);
  } catch (err) {
    return responseError(res, err);
  }
}

/**
 * Updates user preferences including language, theme, and font settings
 * 
 * @param {Object} req - Express request object containing:
 *   - loggedInUser: Current authenticated user
 *   - body: Update parameters (displayLanguageCode, displayTheme, isAlternateFont, isBold, isUnderline)
 * @param {Object} res - Express response object
 * @returns {Object} Response containing updated user preferences
 * @throws {Error} If database update fails
 */
export async function updateUserPreference(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { loggedInUser } = req;
    const { displayLanguageCode, displayTheme, isAlternateFont, isBold, isUnderline, isReducedMotion } = req.body;

    // Initialize update object
    const updateUserPreference = {};

    // Add each preference to update object if provided
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

    if (isReducedMotion !== undefined) {
      updateUserPreference.isReducedMotion = isReducedMotion;
    }

    // Update user preferences in database
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
