/* eslint-disable no-await-in-loop */
/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
import { Op } from 'sequelize';
import FormData from 'form-data';
import { UserPreference } from '../../../models';
import Status from '../../../utils/status';
import Constant from '../../../utils/constants';
import Config from '../../../configs/env.config';
import { responseError, responseSuccess } from '../../../utils/output';
import { Get, Post } from '../../../utils/axios';

export async function accessToken(req, res) {
  // const transaction = await sequelize.transaction();
  try {
    const {
      code,
      displayLanguage,
    } = req.body;

    const getAccessTokenUrl = `${Config.wiki.wikimetaUrl}/w/rest.php/oauth2/access_token`;
    const getAccessTokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: Config.wiki.clientId,
      client_secret: Config.wiki.clientSecret,
    });

    const getAccessTokenResponse = await Post({ 
      url: getAccessTokenUrl,
      data: getAccessTokenBody,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (getAccessTokenResponse.error) {
      throw Status.ERROR.TOKEN_INVALID;
    }

    const getProfileUrl = `${Config.wiki.wikimetaUrl}/w/api.php`;
    const getProfileQueryParams = {
      action: 'query',
      meta: 'userinfo',
      format: 'json',
    };

    const getProfileResponse = await Get({
      url: getProfileUrl,
      params: getProfileQueryParams,
      headers: {
        'Authorization': `Bearer ${getAccessTokenResponse.access_token}`
      }
    });

    if (getProfileResponse.error) {
      throw Status.ERROR.TOKEN_INVALID;
    }

    const userPreference = await UserPreference.findOne({
      where: {
        userId: getProfileResponse.query.userinfo.id
      }
    });

    if (!userPreference) {
      await UserPreference.create(
        {
          userId: getProfileResponse.query.userinfo.id,
          displayLanguage,
          languageId: null,
          language: null,
        }
      );
    } else if (userPreference && !userPreference.displayLanguage) {
      await userPreference.update({ displayLanguage });
    }

    // await transaction.commit();
    return responseSuccess(res, {...getAccessTokenResponse, user: getProfileResponse.query.userinfo });
  } catch (err) {
    // await transaction.rollback();
    return responseError(res, err);
  }
}

export async function refreshToken(req, res) {
  // const transaction = await sequelize.transaction();
  try {
    const {
      refreshToken,
    } = req.body;

    const refreshTokenUrl = `${Config.wiki.wikimetaUrl}/w/rest.php/oauth2/access_token`;
    const refreshTokenBody = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: Config.wiki.clientId,
      client_secret: Config.wiki.clientSecret,
    });

    const refreshTokenResponse = await Post({ 
      url: refreshTokenUrl,
      data: refreshTokenBody,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (refreshTokenResponse.error) {
      throw Status.ERROR.REFRESH_TOKEN_INVALID;
    }

    // await transaction.commit();
    return responseSuccess(res, { ...refreshTokenResponse });
  } catch (err) {
    // await transaction.rollback();
    return responseError(res, err);
  }
}
