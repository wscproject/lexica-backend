/* eslint-disable max-len */
/* eslint-disable consistent-return */
import { UserPreference } from '../../../models';
import Status from '../../../utils/status';
import Constant from '../../../utils/constants';
import { Get } from '../../../utils/axios';
import Config from '../../../configs/env.config';
import { responseError } from '../../../utils/output';

export async function validateToken(req, res, next) {
  const { headers: { authorization } } = req;

  if (!authorization) {
    return responseError(res, Status.ERROR.TOKEN_REQUIRED);
  }

  const bearerToken = authorization.split(' ');
  const token = bearerToken[1];
  req.accessToken = token;

  next();
}

export async function validateUser(req, res, next) {
  try {
    const { accessToken } = req;
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
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (getProfileResponse.error || !getProfileResponse.query) {
      throw Status.ERROR.TOKEN_INVALID;
    }

    let userPreference = await UserPreference.findOne({
      where: {
        userId: getProfileResponse.query.userinfo.id
      }
    });

    if (!userPreference) {
      userPreference = await UserPreference.create(
        {
          userId: getProfileResponse.query.userinfo.id,
          displayLanguage: null,
          languageId: null,
          language: null,
        }
      );
    }

    req.loggedInUser = { ...getProfileResponse.query.userinfo, ...userPreference.dataValues };

    next();
  } catch (error) {
    return responseError(res, error);
  }
}
