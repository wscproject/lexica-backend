/* eslint-disable max-len */
/* eslint-disable consistent-return */
import Jwt from 'jsonwebtoken';
import { User } from '../../../models';
import Status from '../../../utils/status';
import { Get, Post } from '../../../utils/axios';
import Config from '../../../configs/env.config';
import { responseError } from '../../../utils/output';

/**
 * Middleware to validate JWT token from request headers
 * Verifies the token and attaches the decoded user information to the request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object|void} Returns error response if token is invalid, otherwise calls next()
 */
export async function validateToken(req, res, next) {
  const { headers: { authorization } } = req;

  // Check if authorization header exists
  if (!authorization) {
    return responseError(res, Status.ERROR.TOKEN_REQUIRED);
  }
  
  // Extract token from Bearer format
  const bearerToken = authorization.split(' ');
  const token = bearerToken[1];

  // Verify JWT token
  Jwt.verify(token, Config.jwt.jwtSecret, (err, decoded) => {
    if (err) {
      return responseError(res, Status.ERROR.TOKEN_EXPIRED);
    }
    // Attach decoded user info and token to request
    req.loggedInUser = { ...decoded.user, token };

    next();
  });
}

/**
 * Middleware to validate user session and refresh Wiki tokens if needed
 * Checks user existence and token validity, refreshes Wiki tokens if expired
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object|void} Returns error response if validation fails, otherwise calls next()
 */
export async function validateUser(req, res, next) {
  try {
    const { loggedInUser } = req;

    // Find user in database and verify tokens
    const user = await User.findOne({
      where: {
        id: loggedInUser.id,
        token: loggedInUser.token,
      },
    });

    // Check if user exists and has valid Wiki tokens
    if (!user || !user.wikiAccessToken || !user.wikiRefreshToken) {
      throw Status.ERROR.TOKEN_EXPIRED;
    }

    // Attempt to get user profile from Wiki API
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

    // If profile fetch fails, attempt to refresh tokens
    if (getProfileResponse.error || !getProfileResponse.query) {
      // Prepare token refresh request
      const refreshTokenUrl = `${Config.wiki.wikimetaUrl}/w/rest.php/oauth2/access_token`;
      const refreshTokenBody = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: user.wikiRefreshToken,
        client_id: Config.wiki.clientId,
        client_secret: Config.wiki.clientSecret,
      });

      // Make token refresh request
      const refreshTokenResponse = await Post({ 
        url: refreshTokenUrl,
        data: refreshTokenBody,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      // If token refresh fails, throw error
      if (refreshTokenResponse.error) {
        throw Status.ERROR.TOKEN_EXPIRED;
      }

      // Update user with new tokens
      await user.update({ 
        wikiAccessToken: refreshTokenResponse.access_token,
        wikiRefreshToken: refreshTokenResponse.refresh_token,
      });
    }

    // Attach validated user to request
    req.loggedInUser = user;

    next();
  } catch (error) {
    return responseError(res, error);
  }
}
