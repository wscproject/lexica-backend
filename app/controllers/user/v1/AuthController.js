/**
 * Authentication Controller
 * Handles user authentication via Wikimedia OAuth2
 * 
 * This controller manages the OAuth2 authentication flow with Wikimedia:
 * 1. Receives authorization code from frontend
 * 2. Exchanges code for access token
 * 3. Fetches user profile from Wikimedia
 * 4. Creates/updates local user record
 * 5. Generates JWT token for session management
 */

/* eslint-disable no-await-in-loop */
/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
import Jwt from 'jsonwebtoken';
import { User } from '../../../models';
import Status from '../../../utils/status';
import Config from '../../../configs/env.config';
import { responseError, responseSuccess } from '../../../utils/output';
import { Get, Post } from '../../../utils/axios';

/**
 * Handles user login through Wikimedia OAuth2
 * 
 * @param {Object} req - Express request object containing:
 *   - code: Wikimedia OAuth2 authorization code
 *   - displayLanguageCode: User's preferred language code
 * @param {Object} res - Express response object
 * @returns {Object} Response containing:
 *   - User data (id, username)
 *   - JWT token for authentication
 * @throws {Error} If token exchange or profile fetch fails
 */
export async function login(req, res) {
  // const transaction = await sequelize.transaction();
  try {
    // Extract authorization code and preferred language from request
    const {
      code,
      displayLanguageCode,
    } = req.body;

    // Step 1: Exchange authorization code for access token
    // Construct URL and body for Wikimedia OAuth token endpoint
    const getAccessTokenUrl = `${Config.wiki.wikidataUrl}/w/rest.php/oauth2/access_token`;
    const getAccessTokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: Config.wiki.clientId,
      client_secret: Config.wiki.clientSecret,
    });

    // Make request to Wikimedia OAuth endpoint to get access token
    const getAccessTokenResponse = await Post({ 
      url: getAccessTokenUrl,
      data: getAccessTokenBody,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Validate token response
    if (getAccessTokenResponse.error) {
      throw Status.ERROR.TOKEN_INVALID;
    }

    // Step 2: Fetch user profile from Wikimedia using obtained access token
    const getProfileUrl = `${Config.wiki.wikidataUrl}/w/api.php`;
    const getProfileQueryParams = {
      action: 'query',
      meta: 'userinfo',
      format: 'json',
    };

    // Request user profile from Wikimedia API
    const getProfileResponse = await Get({
      url: getProfileUrl,
      params: getProfileQueryParams,
      headers: {
        'Authorization': `Bearer ${getAccessTokenResponse.access_token}`
      }
    });

    // Validate profile response
    if (getProfileResponse.error) {
      throw Status.ERROR.TOKEN_INVALID;
    }

    // Step 3: Find or create user in local database
    // Check if user already exists in our system
    let user = await User.findOne({
      where: {
        externalId: getProfileResponse.query.userinfo.id
      }
    });

    if (!user) {
      // Create new user record if doesn't exist
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
      // Update existing user's tokens and preferences
      await user.update({ 
        displayLanguageCode,
        username: getProfileResponse.query.userinfo.name,
        wikiAccessToken: getAccessTokenResponse.access_token,
        wikiRefreshToken: getAccessTokenResponse.refresh_token,
      });
    }

    // Step 4: Prepare user data for JWT token
    // Only include necessary user information in token
    const userObject = {
      id: user.id,
      username: user.username,
      isAlternateFont: user.isAlternateFont,
      isBold: user.isBold,
      isUnderline: user.isUnderline,
      isReducedMotion: user.isReducedMotion,
    };

    // Step 5: Generate JWT token for session management
    const token = Jwt.sign({ user: { id: user.id, username: user.username } }, Config.jwt.jwtSecret, {
      expiresIn: Config.jwt.jwtExpirationInSeconds,
    });

    // Store JWT token in user record
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
