/* eslint-disable no-await-in-loop */
/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
import Jwt from 'jsonwebtoken';
import { User } from '../../../models';
import Status from '../../../utils/status';
import Config from '../../../configs/env.config';
import { responseError, responseSuccess } from '../../../utils/output';
import { Get, Post } from '../../../utils/axios';

export async function login(req, res) {
  // const transaction = await sequelize.transaction();
  try {
    const {
      code,
      displayLanguageCode,
    } = req.body;

    const getAccessTokenUrl = `${Config.wiki.wikidataUrl}/w/rest.php/oauth2/access_token`;
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

    const getProfileUrl = `${Config.wiki.wikidataUrl}/w/api.php`;
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

    let user = await User.findOne({
      where: {
        externalId: getProfileResponse.query.userinfo.id
      }
    });

    if (!user) {
      user = await User.create({
        externalId: getProfileResponse.query.userinfo.id,
        username: getProfileResponse.query.userinfo.name,
        wikiAccessToken: getAccessTokenResponse.access_token,
        wikiRefreshToken: getAccessTokenResponse.refresh_token,
        displayLanguageCode,
        languageId: null,
        language: null,
      });
    } else {
      await user.update({ 
        displayLanguageCode,
        username: getProfileResponse.query.userinfo.name,
        wikiAccessToken: getAccessTokenResponse.access_token,
        wikiRefreshToken: getAccessTokenResponse.refresh_token,
      });
    }

    const userObject = {
      id: user.id,
      username: user.username,
    };

    const token = Jwt.sign({ user: userObject }, Config.jwt.jwtSecret, {
      expiresIn: Config.jwt.jwtExpirationInSeconds,
    });

    await user.update({ 
      token,
    });

    // await transaction.commit();
    return responseSuccess(res, {...userObject, token });
  } catch (err) {
    // await transaction.rollback();
    return responseError(res, err);
  }
}
