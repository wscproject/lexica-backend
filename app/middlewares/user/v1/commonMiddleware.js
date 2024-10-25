/* eslint-disable max-len */
/* eslint-disable consistent-return */
import Jwt from 'jsonwebtoken';
import { User } from '../../../models';
import Status from '../../../utils/status';
import { Get, Post } from '../../../utils/axios';
import Config from '../../../configs/env.config';
import { responseError } from '../../../utils/output';

export async function validateToken(req, res, next) {
  const { headers: { authorization } } = req;

  if (!authorization) {
    return responseError(res, Status.ERROR.TOKEN_REQUIRED);
  }
  
  const bearerToken = authorization.split(' ');
  const token = bearerToken[1];

  Jwt.verify(token, Config.jwt.jwtSecret, (err, decoded) => {
    if (err) {
      return responseError(res, Status.ERROR.TOKEN_EXPIRED);
    }
    req.loggedInUser = { ...decoded.user, token };

    next();
  });
}

export async function validateUser(req, res, next) {
  try {
    const { loggedInUser } = req;

    const user = await User.findOne({
      where: {
        id: loggedInUser.id,
        token: loggedInUser.token,
      },
    });

    if (!user || !user.wikiAccessToken || !user.wikiRefreshToken) {
      throw Status.ERROR.TOKEN_EXPIRED;
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
        'Authorization': `Bearer ${user.wikiAccessToken}`
      }
    });

    if (getProfileResponse.error || !getProfileResponse.query) {
      const refreshTokenUrl = `${Config.wiki.wikimetaUrl}/w/rest.php/oauth2/access_token`;
      const refreshTokenBody = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: user.wikiRefreshToken,
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
        throw Status.ERROR.TOKEN_EXPIRED;
      }

      await user.update({ 
        wikiAccessToken: refreshTokenResponse.access_token,
        wikiRefreshToken: refreshTokenResponse.refresh_token,
      });
    }

    req.loggedInUser = user;

    next();
  } catch (error) {
    return responseError(res, error);
  }
}
