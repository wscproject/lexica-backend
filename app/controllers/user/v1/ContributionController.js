/**
 * Contribution Controller
 * Handles user contributions for language lexemes including:
 * 1. Connect - Linking lexemes with Wikidata items
 * 2. Script - Adding script information to lexemes
 * 3. Hyphenation - Adding hyphenation rules to lexemes
 * 
 * The controller manages the complete lifecycle of contributions:
 * - Starting new contributions
 * - Retrieving contribution details
 * - Updating contribution details
 * - Ending contributions
 */

/* eslint-disable no-await-in-loop */
/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
import { Op } from 'sequelize';
import Status from '../../../utils/status';
import Constant from '../../../utils/constants';
import { responseError, responseSuccess } from '../../../utils/output';
import {
  Contribution,
  ContributionConnectDetail,
  ContributionScriptDetail,
  ContributionHyphenationDetail,
  Language,
  User,
  Activity,
  LanguageActivity,
  LanguageVariant, 
  sequelize,
} from '../../../models';
import {
  simpleQuery,
  generateRandomConnectLexemeSenseQuery,
  generateGetConnectLexemeSenseQuery,
  generateRandomScriptLexemeQuery,
  generateGetScriptLexemeQuery,
  generateRandomHyphenationLexemeQuery,
  generateGetHyphenationLexemeQuery,
} from '../../../utils/sparql';
import { getCsrfToken, addItemToLexemeSense, addLemmaToLexeme, addHyphenationToLexemeForm, getEntityDetail } from '../../../utils/wikidata';

/**
 * Starts or resumes a Connect contribution session
 * 
 * @param {Object} params - Parameters object containing:
 *   - transaction: Database transaction
 *   - ongoingContribution: Existing contribution if any
 *   - loggedInUser: Current authenticated user
 *   - languageCode: Target language code
 * @returns {Array} Array of contribution connect details
 * @throws {Error} If language not found or activity not available
 */
async function startContributionConnect({transaction, ongoingContribution, loggedInUser, languageCode}) {
  let createdContributionConnectDetails = [];
  let existingLexeme = true;
  
  if (ongoingContribution) {
    // Validate ongoing contribution type
    if (ongoingContribution.activityType !== Constant.ACTIVITY.CONNECT) {
      throw Status.ERROR.PENDING_ACTIVITY;
    }

    // Verify contribution language exists
    const existingLanguage = await Language.findOne({
      where: {
        externalId: ongoingContribution.externalLanguageId,
      },
      transaction,
    });

    if (!existingLanguage) {
      throw Status.ERROR.LANGUAGE_NOT_FOUND;
    }
    
    // Retrieve existing contribution details
    const existingContributionConnectDetails = await ContributionConnectDetail.findAll({
      where: {
        contributionId: ongoingContribution.id,
      },
      order: [['order', 'ASC']],
      transaction,
    });

    if (existingContributionConnectDetails.length < 1) {
      throw Status.ERROR.LEXEMES_NOT_FOUND;
    }

    // Generate SPARQL query to fetch lexeme details
    let includeLexemeString = '';
    const existingContributionConnectDetailsMapping = existingContributionConnectDetails.map(includeData => {
      return `wd:${includeData.externalLexemeSenseId}`
    });

    includeLexemeString = existingContributionConnectDetailsMapping.join(", ");

    // Fetch lexeme details from Wikidata
    const query = await generateGetConnectLexemeSenseQuery({ 
      languageCode: existingLanguage.code, 
      languageId: existingLanguage.externalId, 
      include: includeLexemeString, 
      displayLanguage: loggedInUser.displayLanguageCode 
    });
    const queryResponse = await simpleQuery(query);
    if (queryResponse.results && queryResponse.results.bindings && queryResponse.results.bindings.length > 0) {
      const lexemes = queryResponse.results.bindings;
      for (const existingContributionConnectDetail of existingContributionConnectDetails) {
        const currentLexeme = lexemes.find(lexemeData => 
          lexemeData.senseLabel.value === existingContributionConnectDetail.externalLexemeSenseId
        );

        // Map lexeme data to contribution details
        if (currentLexeme) {
          createdContributionConnectDetails.push({
            id: existingContributionConnectDetail.id,
            contributionId: ongoingContribution.id,
            externalLexemeId: currentLexeme.lexemeLabel.value,
            externalLexemeSenseId: currentLexeme.senseLabel.value,
            externalLanguageId: existingContributionConnectDetail.languageId,
            externalCategoryId: currentLexeme.categoryQID.value,
            lemma: currentLexeme.lemma.value,
            language: existingLanguage,
            category: currentLexeme.categoryLabel.value,
            gloss: currentLexeme.gloss ? currentLexeme.gloss.value : '',
            status: existingContributionConnectDetail.status,
            order: existingContributionConnectDetail.order,
            image: currentLexeme.images.value ? currentLexeme.images.value.split(', ')[0] : '',
          });
        }
      }
    } else {
      throw Status.ERROR.LEXEMES_NOT_FOUND;
    }
  } else {
    // Verify selected language exists
    const existingLanguage = await Language.findOne({
      where: {
        code: languageCode,
      },
      transaction,
    });

    if (!existingLanguage) {
      throw Status.ERROR.LANGUAGE_NOT_FOUND;
    }

    // Check if language has connect activity enabled
    const languageActivity = await LanguageActivity.findOne({
      include:[
        { 
          attributes: [],
          model: Language,
          where: {
            id: existingLanguage.id
          },
          as: 'language',
          required: true,
        },
        {
          attributes: [],
          model: Activity,
          where: {
            type: Constant.ACTIVITY.CONNECT
          },
          as: 'activity',
          required: true,
        },
      ],
      transaction,
    });

    if (!languageActivity) {
      throw Status.ERROR.ACTIVITY_NOT_FOUND;
    }

    // Create new contribution record
    const createdContribution = await Contribution.create(
      {
        userId: loggedInUser.id,
        externalUserId: loggedInUser.externalId,
        startTime: new Date(),
        externalLanguageId: existingLanguage.externalId,
        status: Constant.CONTRIBUTION_STATUS.PENDING,
        activityType: Constant.ACTIVITY.CONNECT,
        languageActivityId: languageActivity.id,
      },
      { transaction }
    );
    
    // Find lexemes that are already being worked on
    const ongoingLexemeContributions = await ContributionConnectDetail.findAll({
      attributes: ['externalLexemeSenseId'],
      where: {
        externalLanguageId: existingLanguage.externalId,
        [Op.or]: [
          { status: Constant.CONTRIBUTION_DETAIL_STATUS.PENDING },
          { 
            status: Constant.CONTRIBUTION_DETAIL_STATUS.NO_ITEM,
            '$contribution.external_user_id$': loggedInUser.externalId,
          },
        ],
      },
      include: [
        {
          model: Contribution,
          as: 'contribution',
          attributes: [],
        }
      ],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    // Generate SPARQL query to exclude already worked on lexemes
    let excludeLexemeString = '';
    if (ongoingLexemeContributions.length > 0) {
      const ongoingLexemeContributionsMapping = ongoingLexemeContributions.map(excludeData => {
        return `wd:${excludeData.externalLexemeSenseId}`
      });

      excludeLexemeString = ongoingLexemeContributionsMapping.join(", ");   
    }

    // Fetch random lexemes for contribution
    const query = await generateRandomConnectLexemeSenseQuery({ 
      languageCode: existingLanguage.code, 
      languageId: existingLanguage.externalId, 
      exclude: excludeLexemeString, 
      displayLanguage: loggedInUser.displayLanguageCode 
    });
    while (existingLexeme) {
      let orderNumber = 1;
      const queryResponse = await simpleQuery(query);
      if (queryResponse.results && queryResponse.results.bindings && queryResponse.results.bindings.length > 0) {
        const randomLexeme = queryResponse.results.bindings;
        for (const lexemeData of randomLexeme) {
          const existingLexemeContributionConnectDetail = await ContributionConnectDetail.findOne({
            where: {
              externalLexemeSenseId: lexemeData.senseLabel.value,
              [Op.or]: [
                { status: Constant.CONTRIBUTION_DETAIL_STATUS.PENDING },
                { 
                  status: Constant.CONTRIBUTION_DETAIL_STATUS.NO_ITEM,
                  '$contribution.external_user_id$': loggedInUser.externalId,
                },
              ],
            },
            include: [
              {
                model: Contribution,
                as: 'contribution',
                attributes: [],
              }
            ],
            attributes: ['externalLexemeSenseId'],
            lock: transaction.LOCK.UPDATE,
            transaction,
          });

          // validate exisitng lexeme contribution detail
          if (existingLexemeContributionConnectDetail) {
            existingLexeme = true;
            break;
          }

          const contributionConnectDetailData = {
            contributionId: createdContribution.id,
            externalLexemeId: lexemeData.lexemeLabel.value,
            externalLexemeSenseId: lexemeData.senseLabel.value,
            externalLanguageId: existingLanguage.externalId,
            externalCategoryId: lexemeData.categoryQID.value,
            lemma: lexemeData.lemma.value,
            language: existingLanguage,
            category: lexemeData.categoryLabel.value,
            gloss: lexemeData.gloss ? lexemeData.gloss.value : '',
            status: "pending",
            image: lexemeData.images.value ? lexemeData.images.value.split(', ')[0] : '',
            order: orderNumber,
          };

          const createContributionConnectDetail = await ContributionConnectDetail.create(contributionConnectDetailData, { transaction });

          // set lexeme detail
          contributionConnectDetailData.id = createContributionConnectDetail.id;
          createdContributionConnectDetails.push(contributionConnectDetailData);

          // increment order number;
          orderNumber++;
        }
        existingLexeme = false;
      } else {
        throw Status.ERROR.LEXEMES_NOT_FOUND;
      }
    }

    // validate if created contribution not empty
    if (createdContributionConnectDetails.length < 1) {
      throw Status.ERROR.LEXEMES_NOT_FOUND;
    }

    await User.update({
      languageId: existingLanguage.id,
      languageCode: languageCode,
      activityType: Constant.ACTIVITY.CONNECT,
    }, { where: { id: loggedInUser.id }, transaction });
  }

  return createdContributionConnectDetails;
}

/**
 * Starts or resumes a Script contribution session
 * Handles adding script information to lexemes
 * 
 * @param {Object} params - Parameters object containing:
 *   - transaction: Database transaction
 *   - ongoingContribution: Existing contribution if any
 *   - loggedInUser: Current authenticated user
 *   - languageCode: Target language code
 * @returns {Array} Array of contribution script details
 * @throws {Error} If language not found or activity not available
 */
async function startContributionScript({transaction, ongoingContribution, loggedInUser, languageCode}) {
  let createdContributionScriptDetails = [];
  let existingLexeme = true;

  if (ongoingContribution) {
    // Validate ongoing contribution type
    if (ongoingContribution.activityType !== Constant.ACTIVITY.SCRIPT) {
      throw Status.ERROR.PENDING_ACTIVITY;
    }

    // Verify contribution language exists and get variant information
    const existingLanguage = await Language.findOne({
      attributes: ['id', 'code', 'externalId', 'title'],
      where: {
        externalId: ongoingContribution.externalLanguageId,
      },
      include: { 
        attributes: ['id', 'code', 'codePreview', 'title', 'isRtl'],
        model: LanguageVariant,
        as: 'languageVariant',
        required: true,
      },
      transaction,
    });

    if (!existingLanguage) {
      throw Status.ERROR.LANGUAGE_NOT_FOUND;
    }
    
    // Retrieve existing contribution details
    const existingContributionScriptDetails = await ContributionScriptDetail.findAll({
      where: {
        contributionId: ongoingContribution.id,
      },
      order: [['order', 'ASC']],
      transaction,
    });

    if (existingContributionScriptDetails.length < 1) {
      throw Status.ERROR.LEXEMES_NOT_FOUND;
    }

    // Generate SPARQL query to fetch lexeme details
    let includeLexemeString = '';
    const existingContributionScriptDetailsMapping = existingContributionScriptDetails.map(includeData => {
      return `wd:${includeData.externalLexemeId}`
    });

    includeLexemeString = existingContributionScriptDetailsMapping.join(", ");

    // Fetch lexeme details from Wikidata
    const query = await generateGetScriptLexemeQuery({ 
      languageId: existingLanguage.externalId, 
      languageCode: existingLanguage.code, 
      include: includeLexemeString, 
      displayLanguage: loggedInUser.displayLanguageCode 
    });
    const queryResponse = await simpleQuery(query);
    if (queryResponse.results && queryResponse.results.bindings && queryResponse.results.bindings.length > 0) {
      const lexemes = queryResponse.results.bindings;
      for (const existingContributionScriptDetail of existingContributionScriptDetails) {
        const currentLexeme = lexemes.find(lexemeData => 
          lexemeData.lexemeLabel.value === existingContributionScriptDetail.externalLexemeId
        );

        // Map lexeme data to contribution details
        if (currentLexeme) {
          createdContributionScriptDetails.push({
            id: existingContributionScriptDetail.id,
            contributionId: ongoingContribution.id,
            languageVariantId: existingContributionScriptDetail.languageVariantId,
            externalLexemeId: currentLexeme.lexemeLabel.value,
            externalLanguageId: existingContributionScriptDetail.externalLanguageId,
            externalCategoryId: currentLexeme.categoryQID.value,
            languageVariantCode: existingContributionScriptDetail.languageVariantCode,
            language: existingLanguage,
            lemma: currentLexeme.lemma.value,
            category: currentLexeme.categoryLabel.value,
            gloss: currentLexeme.gloss ? currentLexeme.gloss.value : '',
            status: existingContributionScriptDetail.status,
            order: existingContributionScriptDetail.order,
            image: currentLexeme.image.value ? currentLexeme.image.value.split(', ')[0] : '',
          });
        }
      }
    } else {
      throw Status.ERROR.LEXEMES_NOT_FOUND;
    }
  } else {
    // Verify selected language exists and get variant information
    const existingLanguage = await Language.findOne({
      attributes: ['id', 'code', 'externalId', 'title'],
      where: {
        code: languageCode,
      },
      include: { 
        attributes: ['id', 'code', 'codePreview', 'title', 'isRtl'],
        model: LanguageVariant,
        as: 'languageVariant',
        required: true,
      },
      transaction,
    });

    if (!existingLanguage) {
      throw Status.ERROR.LANGUAGE_NOT_FOUND;
    }

    // Check if language has script activity enabled
    const languageActivity = await LanguageActivity.findOne({
      include:[
        { 
          attributes: [],
          model: Language,
          where: {
            id: existingLanguage.id
          },
          as: 'language',
          required: true,
        },
        {
          attributes: [],
          model: Activity,
          where: {
            type: Constant.ACTIVITY.SCRIPT
          },
          as: 'activity',
          required: true,
        },
      ],
      transaction,
    });

    if (!languageActivity) {
      throw Status.ERROR.ACTIVITY_NOT_FOUND;
    }

    // Create new contribution record
    const createdContribution = await Contribution.create(
      {
        userId: loggedInUser.id,
        externalUserId: loggedInUser.externalId,
        startTime: new Date(),
        externalLanguageId: existingLanguage.externalId,
        status: Constant.CONTRIBUTION_STATUS.PENDING,
        activityType: Constant.ACTIVITY.SCRIPT,
        languageActivityId: languageActivity.id,
      },
      { transaction }
    );
    
    // Find lexemes that are already being worked on
    const ongoingLexemeContributions = await ContributionScriptDetail.findAll({
      attributes: ['externalLexemeId'],
      where: {
        externalLanguageId: existingLanguage.externalId,
        // [Op.or]: [
        //   { status: Constant.CONTRIBUTION_DETAIL_STATUS.PENDING },
        //   { 
        //     status: Constant.CONTRIBUTION_DETAIL_STATUS.NO_ITEM,
        //     '$contribution.external_user_id$': loggedInUser.externalId,
        //   },
        // ],
      },
      // include: [
      //   {
      //     model: Contribution,
      //     as: 'contribution',
      //     attributes: [],
      //   }
      // ],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    // Generate SPARQL query to exclude already worked on lexemes
    let excludeLexemeString = '';
    if (ongoingLexemeContributions.length > 0) {
      const ongoingLexemeContributionsMapping = ongoingLexemeContributions.map(excludeData => {
        return `wd:${excludeData.externalLexemeId}`
      });

      excludeLexemeString = ongoingLexemeContributionsMapping.join(", ");   
    }

    // Fetch random lexemes for contribution
    const query = await generateRandomScriptLexemeQuery({ 
      variantCode: existingLanguage.languageVariant.code, 
      languageCode: existingLanguage.code, 
      languageId: existingLanguage.externalId, 
      exclude: excludeLexemeString, 
      displayLanguage: loggedInUser.displayLanguageCode 
    });
    while (existingLexeme) {
      let orderNumber = 1;
      const queryResponse = await simpleQuery(query);
      if (queryResponse.results && queryResponse.results.bindings && queryResponse.results.bindings.length > 0) {
        const randomLexeme = queryResponse.results.bindings;
        for (const lexemeData of randomLexeme) {
          const existingLexemeContributionScriptDetail = await ContributionScriptDetail.findOne({
            where: {
              externalLexemeId: lexemeData.lexemeLabel.value,
              // [Op.or]: [
              //   { status: Constant.CONTRIBUTION_DETAIL_STATUS.PENDING },
              //   { 
              //     status: Constant.CONTRIBUTION_DETAIL_STATUS.NO_ITEM,
              //     '$contribution.external_user_id$': loggedInUser.externalId,
              //   },
              // ],
            },
            // include: [
            //   {
            //     model: Contribution,
            //     as: 'contribution',
            //     attributes: [],
            //   }
            // ],
            attributes: ['externalLexemeId'],
            lock: transaction.LOCK.UPDATE,
            transaction,
          });

          // validate exisitng lexeme contribution detail
          if (existingLexemeContributionScriptDetail) {
            existingLexeme = true;
            break;
          }

          const contributionScriptDetailData = {
            contributionId: createdContribution.id,
            languageVariantId: existingLanguage.languageVariant.id,
            externalLexemeId: lexemeData.lexemeLabel.value,
            externalLanguageId: existingLanguage.externalId,
            externalCategoryId: lexemeData.categoryQID.value,
            languageVariantCode: existingLanguage.languageVariant.codePreview,
            language: existingLanguage,
            lemma: lexemeData.lemma.value,
            category: lexemeData.categoryLabel.value,
            status: "pending",
            gloss: lexemeData.gloss ? lexemeData.gloss.value : '',
            order: orderNumber,
            image: lexemeData.image.value ? lexemeData.image.value.split(', ')[0] : '',
          }
          const createdContributionScriptDetail = await ContributionScriptDetail.create(contributionScriptDetailData, { transaction });

          // set lexeme detail
          contributionScriptDetailData.id = createdContributionScriptDetail.id;
          createdContributionScriptDetails.push(contributionScriptDetailData);

          // increment order number;
          orderNumber++;
        }
        existingLexeme = false;
      } else {
        throw Status.ERROR.LEXEMES_NOT_FOUND;
      }
    }

    // validate if created contribution not empty
    if (createdContributionScriptDetails.length < 1) {
      throw Status.ERROR.LEXEMES_NOT_FOUND;
    }

    await User.update({
      languageId: existingLanguage.id,
      languageCode: languageCode,
      activityType: Constant.ACTIVITY.SCRIPT,
    }, { where: { id: loggedInUser.id }, transaction });
  }

  return createdContributionScriptDetails;
}

/**
 * Starts or resumes a Hyphenation contribution session
 * Handles adding hyphenation rules to lexemes
 * 
 * @param {Object} params - Parameters object containing:
 *   - transaction: Database transaction
 *   - ongoingContribution: Existing contribution if any
 *   - loggedInUser: Current authenticated user
 *   - languageCode: Target language code
 * @returns {Array} Array of contribution hyphenation details
 * @throws {Error} If language not found or activity not available
 */
async function startContributionHyphenation({transaction, ongoingContribution, loggedInUser, languageCode}) {
  let createdContributionHyphenationDetails = [];
  let existingLexeme = true;

  if (ongoingContribution) {
    // Validate ongoing contribution type
    if (ongoingContribution.activityType !== Constant.ACTIVITY.HYPHENATION) {
      throw Status.ERROR.PENDING_ACTIVITY;
    }

    // Verify contribution language exists
    const existingLanguage = await Language.findOne({
      attributes: ['id', 'code', 'externalId', 'title'],
      where: {
        externalId: ongoingContribution.externalLanguageId,
      },
      transaction,
    });

    if (!existingLanguage) {
      throw Status.ERROR.LANGUAGE_NOT_FOUND;
    }
    
    // Retrieve existing contribution details
    const existingContributionHyphenationDetails = await ContributionHyphenationDetail.findAll({
      where: {
        contributionId: ongoingContribution.id,
      },
      order: [['order', 'ASC']],
      transaction,
    });

    if (existingContributionHyphenationDetails.length < 1) {
      throw Status.ERROR.LEXEMES_NOT_FOUND;
    }

    // Generate SPARQL query to fetch lexeme details
    let includeLexemeString = '';
    const existingContributionHyphenationDetailsMapping = existingContributionHyphenationDetails.map(includeData => {
      return `wd:${includeData.externalLexemeId}`
    });

    includeLexemeString = existingContributionHyphenationDetailsMapping.join(", ");

    // Fetch lexeme details from Wikidata
    const query = await generateGetHyphenationLexemeQuery({ 
      languageId: existingLanguage.externalId, 
      languageCode: existingLanguage.code, 
      include: includeLexemeString, 
      displayLanguage: loggedInUser.displayLanguageCode 
    });
    const queryResponse = await simpleQuery(query);
    if (queryResponse.results && queryResponse.results.bindings && queryResponse.results.bindings.length > 0) {
      const lexemes = queryResponse.results.bindings;
      for (const existingContributionHyphenationDetail of existingContributionHyphenationDetails) {
        const currentLexeme = lexemes.find(lexemeData => 
          lexemeData.lexemeLabel.value === existingContributionHyphenationDetail.externalLexemeId
        );

        // Map lexeme data to contribution details
        if (currentLexeme) {
          createdContributionHyphenationDetails.push({
            id: existingContributionHyphenationDetail.id,
            contributionId: ongoingContribution.id,
            externalLexemeId: currentLexeme.lexemeLabel.value,
            externalLexemeFormId: currentLexeme.formLabel.value,
            externalLanguageId: existingContributionHyphenationDetail.externalLanguageId,
            externalCategoryId: currentLexeme.categoryQID.value,
            language: existingLanguage,
            lemma: currentLexeme.lemma.value,
            category: currentLexeme.categoryLabel.value,
            gloss: currentLexeme.gloss ? currentLexeme.gloss.value : '',
            status: existingContributionHyphenationDetail.status,
            order: existingContributionHyphenationDetail.order,
            image: currentLexeme.images ? currentLexeme.images.value.split(', ')[0] : '',
          });
        }
      }
    } else {
      throw Status.ERROR.LEXEMES_NOT_FOUND;
    }
  } else {
    // Verify selected language exists
    const existingLanguage = await Language.findOne({
      attributes: ['id', 'code', 'externalId', 'title'],
      where: {
        code: languageCode,
      },
      transaction,
    });

    if (!existingLanguage) {
      throw Status.ERROR.LANGUAGE_NOT_FOUND;
    }

    // Check if language has hyphenation activity enabled
    const languageActivity = await LanguageActivity.findOne({
      include:[
        { 
          attributes: [],
          model: Language,
          where: {
            id: existingLanguage.id
          },
          as: 'language',
          required: true,
        },
        {
          attributes: [],
          model: Activity,
          where: {
            type: Constant.ACTIVITY.HYPHENATION
          },
          as: 'activity',
          required: true,
        },
      ],
      transaction,
    });

    if (!languageActivity) {
      throw Status.ERROR.ACTIVITY_NOT_FOUND;
    }

    // Create new contribution record
    const createdContribution = await Contribution.create(
      {
        userId: loggedInUser.id,
        externalUserId: loggedInUser.externalId,
        startTime: new Date(),
        externalLanguageId: existingLanguage.externalId,
        status: Constant.CONTRIBUTION_STATUS.PENDING,
        activityType: Constant.ACTIVITY.HYPHENATION,
        languageActivityId: languageActivity.id,
      },
      { transaction }
    );
    
    // Find lexemes that are already being worked on
    const ongoingLexemeContributions = await ContributionHyphenationDetail.findAll({
      attributes: ['externalLexemeId'],
      where: {
        externalLanguageId: existingLanguage.externalId,
        // [Op.or]: [
        //   { status: Constant.CONTRIBUTION_DETAIL_STATUS.PENDING },
        //   { 
        //     status: Constant.CONTRIBUTION_DETAIL_STATUS.NO_ITEM,
        //     '$contribution.external_user_id$': loggedInUser.externalId,
        //   },
        // ],
      },
      // include: [
      //   {
      //     model: Contribution,
      //     as: 'contribution',
      //     attributes: [],
      //   }
      // ],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    // Generate SPARQL query to exclude already worked on lexemes
    let excludeLexemeString = '';
    if (ongoingLexemeContributions.length > 0) {
      const ongoingLexemeContributionsMapping = ongoingLexemeContributions.map(excludeData => {
        return `wd:${excludeData.externalLexemeId}`
      });

      excludeLexemeString = ongoingLexemeContributionsMapping.join(", ");   
    }

    // Fetch random lexemes for contribution
    const query = await generateRandomHyphenationLexemeQuery({ languageCode: existingLanguage.code, languageId: existingLanguage.externalId, exclude: excludeLexemeString, displayLanguage: loggedInUser.displayLanguageCode });
    while (existingLexeme) {
      let orderNumber = 1;
      const queryResponse = await simpleQuery(query);
      if (queryResponse.results && queryResponse.results.bindings && queryResponse.results.bindings.length > 0) {
        const randomLexeme = queryResponse.results.bindings;
        for (const lexemeData of randomLexeme) {
          const existingLexemeContributionHyphenationDetail = await ContributionHyphenationDetail.findOne({
            where: {
              externalLexemeId: lexemeData.lexemeLabel.value,
              // [Op.or]: [
              //   { status: Constant.CONTRIBUTION_DETAIL_STATUS.PENDING },
              //   { 
              //     status: Constant.CONTRIBUTION_DETAIL_STATUS.NO_ITEM,
              //     '$contribution.external_user_id$': loggedInUser.externalId,
              //   },
              // ],
            },
            // include: [
            //   {
            //     model: Contribution,
            //     as: 'contribution',
            //     attributes: [],
            //   }
            // ],
            attributes: ['externalLexemeId'],
            lock: transaction.LOCK.UPDATE,
            transaction,
          });

          // validate exisitng lexeme contribution detail
          if (existingLexemeContributionHyphenationDetail) {
            existingLexeme = true;
            break;
          }

          const contributionHyphenationDetailData = {
            contributionId: createdContribution.id,
            externalLexemeId: lexemeData.lexemeLabel.value,
            externalLexemeFormId: lexemeData.formLabel.value,
            externalLanguageId: existingLanguage.externalId,
            externalCategoryId: lexemeData.categoryQID.value,
            language: existingLanguage,
            lemma: lexemeData.lemma.value,
            category: lexemeData.categoryLabel.value,
            status: "pending",
            gloss: lexemeData.gloss ? lexemeData.gloss.value : '',
            order: orderNumber,
            image: lexemeData.images ? lexemeData.images.value.split(', ')[0] : '',
          }
          const createdContributionHyphenationDetail = await ContributionHyphenationDetail.create(contributionHyphenationDetailData, { transaction });

          // set lexeme detail
          contributionHyphenationDetailData.id = createdContributionHyphenationDetail.id;
          createdContributionHyphenationDetails.push(contributionHyphenationDetailData);

          // increment order number;
          orderNumber++;
        }
        existingLexeme = false;
      } else {
        throw Status.ERROR.LEXEMES_NOT_FOUND;
      }
    }

    // validate if created contribution not empty
    if (createdContributionHyphenationDetails.length < 1) {
      throw Status.ERROR.LEXEMES_NOT_FOUND;
    }

    await User.update({
      languageId: existingLanguage.id,
      languageCode: languageCode,
      activityType: Constant.ACTIVITY.HYPHENATION,
    }, { where: { id: loggedInUser.id }, transaction });
  }

  return createdContributionHyphenationDetails;
}

/**
 * Starts a new contribution session or resumes an existing one
 * 
 * @param {Object} req - Express request object containing:
 *   - loggedInUser: Current authenticated user
 *   - body: Request body with:
 *     - languageCode: Target language code
 *     - activityType: Type of contribution (CONNECT/SCRIPT/HYPHENATION)
 * @param {Object} res - Express response object
 * @returns {Object} Response containing contribution details
 * @throws {Error} If contribution cannot be started
 */
export async function startContribution(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { loggedInUser } = req;
    const { languageCode, activityType } = req.body;

    let contributionDetails = [];

    // Check for any ongoing contribution
    const ongoingContribution = await Contribution.findOne({
      where: {
        userId: loggedInUser.id,
        status: Constant.CONTRIBUTION_STATUS.PENDING,
      },
      transaction,
    });
    
    // Start appropriate contribution type
    if (activityType === Constant.ACTIVITY.CONNECT) {
      contributionDetails = await startContributionConnect({transaction, ongoingContribution, loggedInUser, languageCode});
    } else if (activityType === Constant.ACTIVITY.SCRIPT) {
      contributionDetails = await startContributionScript({transaction, ongoingContribution, loggedInUser, languageCode});
    } else if (activityType === Constant.ACTIVITY.HYPHENATION) {
      contributionDetails = await startContributionHyphenation({transaction, ongoingContribution, loggedInUser, languageCode});
    }

    await transaction.commit();
    return responseSuccess(res, contributionDetails);
  } catch (err) {
    await transaction.rollback();
    return responseError(res, err);
  }
}

/**
 * Retrieves detailed information for a Connect contribution
 * This function handles fetching and formatting detailed information about a lexeme's connect contribution,
 * including its senses, glosses, and related Wikidata items.
 * 
 * The function:
 * 1. Validates the contribution detail exists and belongs to the user
 * 2. Fetches lexeme details from Wikidata
 * 3. Extracts lemma information
 * 4. Builds a comprehensive response with:
 *    - Basic lexeme info (lemma, category, language)
 *    - Characteristics and usage examples
 *    - Combines lexemes information
 *    - Detailed sense information including:
 *      - Glosses in different languages
 *      - Images
 *      - Language style
 *      - Field of usage
 *      - Location of sense usage
 *      - Semantic gender
 *      - Antonyms and synonyms
 *      - Gloss quotes
 * 
 * @param {Object} req - Express request object containing:
 *   - loggedInUser: Current authenticated user
 *   - params: URL parameters with:
 *     - id: Contribution detail ID
 *     - contributionId: Parent contribution ID
 * @param {Object} res - Express response object
 * @returns {Object} Response containing detailed lexeme information
 * @throws {Error} If contribution detail not found
 */
export async function getContributionConnectDetail(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { params, loggedInUser } = req;
    const { id, contributionId } = params;

    // Find contribution detail with validation
    const contributionConnectDetail = await ContributionConnectDetail.findOne({
      where: {
        id,
      },
      include: { 
        model: Contribution,
        as: 'contribution',
        required: true,
        where: {
          userId: loggedInUser.id,
          status: Constant.CONTRIBUTION_STATUS.PENDING,
        },
      },
      transaction,
    });

    if (!contributionConnectDetail) {
      throw Status.ERROR.CONTRIBUTION_DETAIL_NOT_FOUND;
    }

    // Fetch lexeme details from Wikidata
    const lexemeDetail = await getEntityDetail({ 
      entityId: contributionConnectDetail.externalLexemeId, 
      language: loggedInUser.languageCode, 
      uselang: loggedInUser.languageCode 
    });

    // Extract lemma information
    let lemma = '';
    if (lexemeDetail.entities[contributionConnectDetail.externalLexemeId].lemmas) {
      const lemmaValues = Object.values(lexemeDetail.entities[contributionConnectDetail.externalLexemeId].lemmas)
        .map(lemma => lemma.value);
      lemma = lemmaValues.join(' / ');
    }

    // Prepare response object
    const lexemeResponse = {
      id,
      contributionId,
      externalLexemeId: contributionConnectDetail.externalLexemeId,
      externalLexemeSenseId: contributionConnectDetail.externalLexemeSenseId,
      lemma,
      externalCategoryId: lexemeDetail.entities[contributionConnectDetail.externalLexemeId].lexicalCategory,
      category: "",
      externalLanguageId: lexemeDetail.entities[contributionConnectDetail.externalLexemeId].language,
      hasCharacteristics: null,
      usageExamples: null,
      combinesLexemes: null,
      sense: null,
      otherSenses: [],
    };

    // Fetch category information
    const lexemeCategoryId = lexemeDetail.entities[contributionConnectDetail.externalLexemeId].lexicalCategory;
    const lexemeCategory = await getEntityDetail({ 
      entityId: lexemeCategoryId, 
      language: loggedInUser.displayLanguageCode, 
      uselang: loggedInUser.languageCode 
    });
    lexemeResponse.category = lexemeCategory.entities[lexemeCategoryId].labels[loggedInUser.displayLanguageCode] 
      ? lexemeCategory.entities[lexemeCategoryId].labels[loggedInUser.displayLanguageCode].value 
      : '';

    // Fetch characteristics information
    if (lexemeDetail.entities[contributionConnectDetail.externalLexemeId].claims && 
        lexemeDetail.entities[contributionConnectDetail.externalLexemeId].claims[Constant.WIKIDATA_PROPERTY_CODE.HAS_CHARACTERISTICS]) {
      const hasCharacteristics = [];
      for (const hasCharacteristicsData of lexemeDetail.entities[contributionConnectDetail.externalLexemeId].claims[Constant.WIKIDATA_PROPERTY_CODE.HAS_CHARACTERISTICS]) {
        if (hasCharacteristicsData.mainsnak.datavalue.value.id) {
          const hasCharacteristicsId = hasCharacteristicsData.mainsnak.datavalue.value.id;
          const hasCharacteristicsDetail = await getEntityDetail({ 
            entityId: hasCharacteristicsId, 
            language: loggedInUser.displayLanguageCode, 
            uselang: loggedInUser.languageCode 
          });

          hasCharacteristics.push({
            id: hasCharacteristicsData.mainsnak.datavalue.value.id,
            value: hasCharacteristicsDetail?.entities?.[hasCharacteristicsId]?.labels?.[loggedInUser.languageCode]?.value ||
            hasCharacteristicsDetail?.entities?.[hasCharacteristicsId]?.labels?.[loggedInUser.displayLanguageCode]?.value ||
            hasCharacteristicsDetail?.entities?.[hasCharacteristicsId]?.labels?.[Constant.DISPLAY_LANGUAGE.EN.ISO]?.value || 
            '',
          });
        }
      }

      if (hasCharacteristics.length > 0) {
        lexemeResponse.hasCharacteristics = {
          property: Constant.WIKIDATA_PROPERTY_CODE.HAS_CHARACTERISTICS,
          data: hasCharacteristics,
        }
      }
    }

    // get usage example data
    if (lexemeDetail.entities[contributionConnectDetail.externalLexemeId].claims && lexemeDetail.entities[contributionConnectDetail.externalLexemeId].claims[Constant.WIKIDATA_PROPERTY_CODE.USAGE_EXAMPLE]) {
      const usageExamples = [];
      for (const usageExamplesData of lexemeDetail.entities[contributionConnectDetail.externalLexemeId].claims[Constant.WIKIDATA_PROPERTY_CODE.USAGE_EXAMPLE]) {
        if (usageExamplesData.mainsnak.datavalue.value && usageExamplesData.qualifiers && usageExamplesData.qualifiers[Constant.WIKIDATA_PROPERTY_CODE.SUBJECT_SENSE]) {

          if (usageExamplesData.qualifiers[Constant.WIKIDATA_PROPERTY_CODE.SUBJECT_SENSE].some(qualifier => qualifier.datavalue?.value?.id === contributionConnectDetail.externalLexemeSenseId)) {
            usageExamples.push({
              value: usageExamplesData.mainsnak.datavalue.value.text,
            });
          }
        }
      }

      if (usageExamples.length > 0) {
        lexemeResponse.usageExamples = {
          property: Constant.WIKIDATA_PROPERTY_CODE.USAGE_EXAMPLE,
          data: usageExamples,
        }
      }
    }

    // get combines lexemes data
    if (lexemeDetail.entities[contributionConnectDetail.externalLexemeId].claims && lexemeDetail.entities[contributionConnectDetail.externalLexemeId].claims[Constant.WIKIDATA_PROPERTY_CODE.COMBINES_LEXEMES]) {
      const combinesLexemes = [];
      for (const combinesLexemesData of lexemeDetail.entities[contributionConnectDetail.externalLexemeId].claims[Constant.WIKIDATA_PROPERTY_CODE.COMBINES_LEXEMES]) {
        if (combinesLexemesData.mainsnak.datavalue.value.id) {
          const combinesLexemesId = combinesLexemesData.mainsnak.datavalue.value.id;
          const combinesLexemesDetail = await getEntityDetail({ entityId: combinesLexemesId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });

          let combineLexemeLemma = '';
          if (combinesLexemesDetail.entities[combinesLexemesId].lemmas) {
            const combineLexemeLemmaValues = Object.values(combinesLexemesDetail.entities[combinesLexemesId].lemmas).map(lemma => lemma.value);
            combineLexemeLemma = combineLexemeLemmaValues.join(' / ');
          }

          combinesLexemes.push({
            id: combinesLexemesData.mainsnak.datavalue.value.id,
            value: combineLexemeLemma,
          });
        }
      }

      if (combinesLexemes.length > 0) {
        lexemeResponse.combinesLexemes = {
          property: Constant.WIKIDATA_PROPERTY_CODE.COMBINES_LEXEMES,
          data: combinesLexemes,
        }
      }
    }

    // set sense number
    let senseNumber = 1;
    for (const lexemeSense of lexemeDetail.entities[contributionConnectDetail.externalLexemeId].senses) {
      // get gloss in user contribution language
      const gloss = lexemeSense.glosses && lexemeSense.glosses[loggedInUser.languageCode] ? lexemeSense.glosses[loggedInUser.languageCode].value : '';

      // get images
      let images = null;
      if (lexemeSense.claims && lexemeSense.claims[Constant.WIKIDATA_PROPERTY_CODE.IMAGE]) {
        const tempImages = [];
        for (const imageDetail of lexemeSense.claims[Constant.WIKIDATA_PROPERTY_CODE.IMAGE]) {
          if (imageDetail.mainsnak.datavalue.value) {
            tempImages.push({
              value: imageDetail.mainsnak.datavalue.value,
              url: `https://commons.wikimedia.org/wiki/Special:FilePath/${imageDetail.mainsnak.datavalue.value}`,
            });
          }
        }
  
        if (tempImages.length > 0) {
          images = {
            property: Constant.WIKIDATA_PROPERTY_CODE.IMAGE,
            data: tempImages,
          }
        }
      }

      if (lexemeSense.id === contributionConnectDetail.externalLexemeSenseId) {
        lexemeResponse.sense = {
          gloss,
          otherGlosses: [],
          images,
          languageStyle: null,
          fieldOfUsage: null,
          locationOfSenseUsage: null,
          semanticGender: null,
          antonym: null,
          synonym: null,
          glossQuotes: null,
        };

        // get other gloss in different language than contribution language
        for (const [key, value] of Object.entries(lexemeSense.glosses)) {
          if (key !== loggedInUser.languageCode) {
            lexemeResponse.sense.otherGlosses.push({
              language: value.language,
              value: value.value
            });
          }
        }

        // get language style
        if (lexemeSense.claims && lexemeSense.claims[Constant.WIKIDATA_PROPERTY_CODE.LANGUAGE_STYLE]) {
          const languageStyle = [];
          for (const languageStyleData of lexemeSense.claims[Constant.WIKIDATA_PROPERTY_CODE.LANGUAGE_STYLE]) {
            if (languageStyleData.mainsnak.datavalue.value.id) {
              const languageStyleId = languageStyleData.mainsnak.datavalue.value.id;
              const languageStyleDetail = await getEntityDetail({ entityId: languageStyleId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });
    
              languageStyle.push({
                id: languageStyleData.mainsnak.datavalue.value.id,
                value: languageStyleDetail?.entities?.[languageStyleId]?.labels?.[loggedInUser.languageCode]?.value ||
                languageStyleDetail?.entities?.[languageStyleId]?.labels?.[loggedInUser.displayLanguageCode]?.value ||
                languageStyleDetail?.entities?.[languageStyleId]?.labels?.[Constant.DISPLAY_LANGUAGE.EN.ISO]?.value || 
                '',
              });
            }
          }
    
          if (languageStyle.length > 0) {
            lexemeResponse.sense.languageStyle = {
              property: Constant.WIKIDATA_PROPERTY_CODE.LANGUAGE_STYLE,
              data: languageStyle,
            }
          }
        }

        // get field of usage
        if (lexemeSense.claims && lexemeSense.claims[Constant.WIKIDATA_PROPERTY_CODE.FIELD_OF_USAGE]) {
          const fieldOfUsage = [];
          for (const fieldOfUsageData of lexemeSense.claims[Constant.WIKIDATA_PROPERTY_CODE.FIELD_OF_USAGE]) {
            if (fieldOfUsageData.mainsnak.datavalue.value.id) {
              const fieldOfUsageId = fieldOfUsageData.mainsnak.datavalue.value.id;
              const fieldOfUsageDetail = await getEntityDetail({ entityId: fieldOfUsageId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });
    
              fieldOfUsage.push({
                id: fieldOfUsageData.mainsnak.datavalue.value.id,
                value: fieldOfUsageDetail?.entities?.[fieldOfUsageId]?.labels?.[loggedInUser.languageCode]?.value ||
                fieldOfUsageDetail?.entities?.[fieldOfUsageId]?.labels?.[loggedInUser.displayLanguageCode]?.value ||
                fieldOfUsageDetail?.entities?.[fieldOfUsageId]?.labels?.[Constant.DISPLAY_LANGUAGE.EN.ISO]?.value || 
                '',
              });
            }
          }
    
          if (fieldOfUsage.length > 0) {
            lexemeResponse.sense.fieldOfUsage = {
              property: Constant.WIKIDATA_PROPERTY_CODE.FIELD_OF_USAGE,
              data: fieldOfUsage,
            }
          }
        }

        // get location of sense usage
        if (lexemeSense.claims && lexemeSense.claims[Constant.WIKIDATA_PROPERTY_CODE.LOCATION_OF_SENSE_USAGE]) {
          const locationOfSenseUsage = [];
          for (const locationOfSenseUsageData of lexemeSense.claims[Constant.WIKIDATA_PROPERTY_CODE.LOCATION_OF_SENSE_USAGE]) {
            if (locationOfSenseUsageData.mainsnak.datavalue.value.id) {
              const locationOfSenseUsageId = locationOfSenseUsageData.mainsnak.datavalue.value.id;
              const locationOfSenseUsageDetail = await getEntityDetail({ entityId: locationOfSenseUsageId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });
    
              locationOfSenseUsage.push({
                id: locationOfSenseUsageData.mainsnak.datavalue.value.id,
                value: locationOfSenseUsageDetail?.entities?.[locationOfSenseUsageId]?.labels?.[loggedInUser.languageCode]?.value ||
                locationOfSenseUsageDetail?.entities?.[locationOfSenseUsageId]?.labels?.[loggedInUser.displayLanguageCode]?.value ||
                locationOfSenseUsageDetail?.entities?.[locationOfSenseUsageId]?.labels?.[Constant.DISPLAY_LANGUAGE.EN.ISO]?.value || 
                '',
              });
            }
          }
    
          if (locationOfSenseUsage.length > 0) {
            lexemeResponse.sense.locationOfSenseUsage = {
              property: Constant.WIKIDATA_PROPERTY_CODE.LOCATION_OF_SENSE_USAGE,
              data: locationOfSenseUsage,
            }
          }
        }

        // get semantic gender
        if (lexemeSense.claims && lexemeSense.claims[Constant.WIKIDATA_PROPERTY_CODE.SEMANTIC_GENDER]) {
          const semanticGender = [];
          for (const semanticGenderData of lexemeSense.claims[Constant.WIKIDATA_PROPERTY_CODE.SEMANTIC_GENDER]) {
            if (semanticGenderData.mainsnak.datavalue.value.id) {
              const semanticGenderId = semanticGenderData.mainsnak.datavalue.value.id;
              const semanticGenderDetail = await getEntityDetail({ entityId: semanticGenderId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });
    
              semanticGender.push({
                id: semanticGenderData.mainsnak.datavalue.value.id,
                value: semanticGenderDetail?.entities?.[semanticGenderId]?.labels?.[loggedInUser.languageCode]?.value ||
                semanticGenderDetail?.entities?.[semanticGenderId]?.labels?.[loggedInUser.displayLanguageCode]?.value ||
                semanticGenderDetail?.entities?.[semanticGenderId]?.labels?.[Constant.DISPLAY_LANGUAGE.EN.ISO]?.value || 
                '',
              });
            }
          }
    
          if (semanticGender.length > 0) {
            lexemeResponse.sense.semanticGender = {
              property: Constant.WIKIDATA_PROPERTY_CODE.SEMANTIC_GENDER,
              data: semanticGender,
            }
          }
        }
    
        // get antonym
        if (lexemeSense.claims && lexemeSense.claims[Constant.WIKIDATA_PROPERTY_CODE.ANTONYM]) {
          const antonym = [];
          for (const antonymData of lexemeSense.claims[Constant.WIKIDATA_PROPERTY_CODE.ANTONYM]) {
            if (antonymData.mainsnak.datavalue.value.id) {
              const antonymId = antonymData.mainsnak.datavalue.value.id.split('-')[0];
              const antonymDetail = await getEntityDetail({ entityId: antonymId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });

              let antonymLemma = '';
              if (antonymDetail.entities[antonymId].lemmas) {
                const antonymLemmaValues = Object.values(antonymDetail.entities[antonymId].lemmas).map(lemma => lemma.value);
                antonymLemma = antonymLemmaValues.join(' / ');
              }
    
              antonym.push({
                id: antonymData.mainsnak.datavalue.value.id,
                value: antonymLemma,
              });
            }
          }
    
          if (antonym.length > 0) {
            lexemeResponse.sense.antonym = {
              property: Constant.WIKIDATA_PROPERTY_CODE.ANTONYM,
              data: antonym,
            }
          }
        }
    
        // get synonym
        if (lexemeSense.claims && lexemeSense.claims[Constant.WIKIDATA_PROPERTY_CODE.SYNONYM]) {
          const synonym = [];
          for (const synonymData of lexemeSense.claims[Constant.WIKIDATA_PROPERTY_CODE.SYNONYM]) {
            if (synonymData.mainsnak.datavalue.value.id) {
              const synonymId = synonymData.mainsnak.datavalue.value.id.split('-')[0];
              const synonymDetail = await getEntityDetail({ entityId: synonymId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });

              let synonymLemma = '';
              if (synonymDetail.entities[synonymId].lemmas) {
                const synonymLemmaValues = Object.values(synonymDetail.entities[synonymId].lemmas).map(lemma => lemma.value);
                synonymLemma = synonymLemmaValues.join(' / ');
              }
    
              synonym.push({
                id: synonymData.mainsnak.datavalue.value.id,
                value: synonymLemma,
              });
            }
          }
    
          if (synonym.length > 0) {
            lexemeResponse.sense.synonym = {
              property: Constant.WIKIDATA_PROPERTY_CODE.SYNONYM,
              data: synonym,
            }
          }
        }

        // get gloss quote
        if (lexemeSense.claims && lexemeSense.claims[Constant.WIKIDATA_PROPERTY_CODE.GLOSS_QUOTE]) {
          const glossQuotes = [];
          for (const glossQuoteDetail of lexemeSense.claims[Constant.WIKIDATA_PROPERTY_CODE.GLOSS_QUOTE]) {
            if (glossQuoteDetail.mainsnak.datavalue.value) {
              glossQuotes.push({
                language: glossQuoteDetail.mainsnak.datavalue.value.language,
                value: glossQuoteDetail.mainsnak.datavalue.value.text,
              });
            }
          }
    
          if (glossQuotes.length > 0) {
            lexemeResponse.sense.glossQuotes = {
              property: Constant.WIKIDATA_PROPERTY_CODE.GLOSS_QUOTE,
              data: glossQuotes,
            }
          }
        }
      } else {
        const otherSense = {
          externalLexemeSenseId: lexemeSense.id,
          senseNumber,
          gloss,
          otherGlosses: [],
          images,
          itemForThisSense: null,
        };
        
        // get other glosses
        if (lexemeSense.glosses) {
          for (const glossKey in lexemeSense.glosses) {
            if (glossKey === Constant.DISPLAY_LANGUAGE.EN.ISO && loggedInUser.languageCode !== Constant.DISPLAY_LANGUAGE.EN.ISO) {
              otherSense.otherGlosses.push({
                language: lexemeSense?.glosses[glossKey].language ,
                value: lexemeSense?.glosses[glossKey].value,
              });
              break;
            } else if (glossKey !== Constant.DISPLAY_LANGUAGE.EN.ISO && glossKey !== loggedInUser.languageCode) {
              otherSense.otherGlosses.push({
                language: lexemeSense?.glosses[glossKey].language ,
                value: lexemeSense?.glosses[glossKey].value,
              });
              break;
            }
          }
        }
  
        if (lexemeSense.claims && lexemeSense.claims[Constant.WIKIDATA_PROPERTY_CODE.ITEM_FOR_THIS_SENSE]) {
          const itemForThisSense = [];
          for (const itemForThisSenseData of lexemeSense.claims[Constant.WIKIDATA_PROPERTY_CODE.ITEM_FOR_THIS_SENSE]) {
            if (itemForThisSenseData.mainsnak.datavalue.value.id) {
              const itemForThisSenseId = itemForThisSenseData.mainsnak.datavalue.value.id;
              const itemForThisSenseDetail = await getEntityDetail({ entityId: itemForThisSenseId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });
  
              itemForThisSense.push({
                id: itemForThisSenseData.mainsnak.datavalue.value.id,
                value: itemForThisSenseDetail?.entities?.[itemForThisSenseId]?.labels?.[loggedInUser.languageCode]?.value ||
                itemForThisSenseDetail?.entities?.[itemForThisSenseId]?.labels?.[loggedInUser.displayLanguageCode]?.value ||
                itemForThisSenseDetail?.entities?.[itemForThisSenseId]?.labels?.[Constant.DISPLAY_LANGUAGE.EN.ISO]?.value || 
                '',
              });
            }
          }
    
          if (itemForThisSense.length > 0) {
            otherSense.itemForThisSense = {
              property: Constant.WIKIDATA_PROPERTY_CODE.ITEM_FOR_THIS_SENSE,
              data: itemForThisSense,
            }
          }
        }
  
        lexemeResponse.otherSenses.push(otherSense);
      }
      senseNumber++;
    }

    await transaction.commit();
    return responseSuccess(res, lexemeResponse);
  } catch (err) {
    await transaction.rollback();
    return responseError(res, err);
  }
}

/**
 * Retrieves detailed information for a Script contribution
 * This function handles fetching and formatting detailed information about a lexeme's script contribution,
 * focusing on script variants and their associated information.
 * 
 * The function:
 * 1. Validates the contribution detail exists and belongs to the user
 * 2. Fetches language variant information
 * 3. Retrieves lexeme details from Wikidata
 * 4. Builds a comprehensive response with:
 *    - Basic lexeme info (lemma, category, language)
 *    - Language variant details
 *    - For each sense:
 *      - Glosses in different languages
 *      - Images
 *      - Item for this sense
 *      - Language style
 *      - Field of usage
 * 
 * @param {Object} req - Express request object containing:
 *   - loggedInUser: Current authenticated user
 *   - params: URL parameters with:
 *     - id: Contribution detail ID
 *     - contributionId: Parent contribution ID
 * @param {Object} res - Express response object
 * @returns {Object} Response containing detailed lexeme information with script details
 * @throws {Error} If contribution detail not found
 */
export async function getContributionScriptDetail(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { params, loggedInUser } = req;
    const { id, contributionId } = params;

    const contributionScriptDetail = await ContributionScriptDetail.findOne({
      where: {
        id,
      },
      include: { 
        model: Contribution,
        as: 'contribution',
        required: true,
        where: {
          userId: loggedInUser.id,
          status: Constant.CONTRIBUTION_STATUS.PENDING,
        },
      },
      transaction,
    });

    if (!contributionScriptDetail) {
      throw Status.ERROR.CONTRIBUTION_DETAIL_NOT_FOUND;
    }

    const language = await Language.findOne({
      attributes: ['id', 'code', 'externalId', 'title'],
      where: { id: loggedInUser.languageId },
      include: {
        attributes: ['id', 'code', 'codePreview', 'title'],
        model: LanguageVariant,
        as: 'languageVariant',
      }
    });

    if (!language) {
      throw Status.ERROR.LANGUAGE_NOT_FOUND;
    }

    // get ongoing contribution
    const lexemeDetail = await getEntityDetail({ entityId: contributionScriptDetail.externalLexemeId, language: loggedInUser.languageCode, uselang: loggedInUser.languageCode });
    // const lexemeSense = lexemeDetail['entities'][lexemeId]['senses'].find(senseData => senseData['id'] === senseId);
    
    let lemma = '';
    if (lexemeDetail.entities[contributionScriptDetail.externalLexemeId].lemmas) {
      // Extract the values from the object
      const lemmaValues = Object.values(lexemeDetail.entities[contributionScriptDetail.externalLexemeId].lemmas).map(lemma => lemma.value);
      
      // Join the values with " / " separator
      lemma = lemmaValues.join(' / ');
    }

    const gloss = [];
    const lexemeResponse = {
      id,
      contributionId,
      externalLexemeId: contributionScriptDetail.externalLexemeId,
      externalLanguageId: lexemeDetail.entities[contributionScriptDetail.externalLexemeId].language,
      lemma,
      externalCategoryId: lexemeDetail.entities[contributionScriptDetail.externalLexemeId].lexicalCategory,
      language,
      category: '',
      gloss: '',
      senses: [],
    };

    // get category value
    const lexemeCategoryId = lexemeDetail.entities[contributionScriptDetail.externalLexemeId].lexicalCategory;
    const lexemeCategory = await getEntityDetail({ entityId: lexemeCategoryId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });
    lexemeResponse.category = lexemeCategory.entities[lexemeCategoryId].labels[loggedInUser.displayLanguageCode] ? lexemeCategory.entities[lexemeCategoryId].labels[loggedInUser.displayLanguageCode].value :  '';

    // set sense number
    let senseNumber = 1;
    for (const sense of lexemeDetail.entities[contributionScriptDetail.externalLexemeId].senses) {
      const statements = {
        externalLexemeSenseId: sense.id,
        senseNumber,
        gloss: sense.glosses[loggedInUser.languageCode] ? sense.glosses[loggedInUser.languageCode].value : '',
        images: null,
        itemForThisSense: null,
        languageStyle: null,
        fieldOfUsage: null,
        otherGlosses: [],
      }

      if (sense.glosses[loggedInUser.languageCode]) {
        gloss.push(sense.glosses[loggedInUser.languageCode].value);
      }

      if (sense.glosses[Constant.DISPLAY_LANGUAGE.EN.ISO]) {
        statements.otherGlosses.push({
          language: sense.glosses[Constant.DISPLAY_LANGUAGE.EN.ISO].language,
          value: sense.glosses[Constant.DISPLAY_LANGUAGE.EN.ISO].value
        });
      }

      if (sense.glosses[Constant.DISPLAY_LANGUAGE.ID.ISO]) {
        statements.otherGlosses.push({
          language: sense.glosses[Constant.DISPLAY_LANGUAGE.ID.ISO].language,
          value: sense.glosses[Constant.DISPLAY_LANGUAGE.ID.ISO].value
        });
      }

      // get images
      if (sense.claims && sense.claims[Constant.WIKIDATA_PROPERTY_CODE.IMAGE]) {
        const images = [];
        for (const imageDetail of sense.claims[Constant.WIKIDATA_PROPERTY_CODE.IMAGE]) {
          if (imageDetail.mainsnak.datavalue.value) {
            images.push({
              value: imageDetail.mainsnak.datavalue.value,
              url: `https://commons.wikimedia.org/wiki/Special:FilePath/${imageDetail.mainsnak.datavalue.value}`,
            });
          }
        }

        if (images.length > 0) {
          statements.images = {
            property: Constant.WIKIDATA_PROPERTY_CODE.IMAGE,
            data: images,
          }
        }
      }

      // get item for this sense
      if (sense.claims && sense.claims[Constant.WIKIDATA_PROPERTY_CODE.ITEM_FOR_THIS_SENSE]) {
        const itemForThisSense = [];
        for (const itemForThisSenseData of sense.claims[Constant.WIKIDATA_PROPERTY_CODE.ITEM_FOR_THIS_SENSE]) {
          if (itemForThisSenseData.mainsnak.datavalue.value.id) {
            const itemForThisSenseId = itemForThisSenseData.mainsnak.datavalue.value.id;
            const itemForThisSenseDetail = await getEntityDetail({ entityId: itemForThisSenseId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });

            itemForThisSense.push({
              id: itemForThisSenseData.mainsnak.datavalue.value.id,
              value: itemForThisSenseDetail?.entities?.[itemForThisSenseId]?.labels?.[loggedInUser.languageCode]?.value ||
              itemForThisSenseDetail?.entities?.[itemForThisSenseId]?.labels?.[loggedInUser.displayLanguageCode]?.value ||
              itemForThisSenseDetail?.entities?.[itemForThisSenseId]?.labels?.[Constant.DISPLAY_LANGUAGE.EN.ISO]?.value || 
              '',
            });
          }
        }
  
        if (itemForThisSense.length > 0) {
          statements.itemForThisSense = {
            property: Constant.WIKIDATA_PROPERTY_CODE.ITEM_FOR_THIS_SENSE,
            data: itemForThisSense,
          }
        }
      }

      // get language style
      if (sense.claims && sense.claims[Constant.WIKIDATA_PROPERTY_CODE.LANGUAGE_STYLE]) {
        const languageStyle = [];
        for (const languageStyleData of sense.claims[Constant.WIKIDATA_PROPERTY_CODE.LANGUAGE_STYLE]) {
          if (languageStyleData.mainsnak.datavalue.value.id) {
            const languageStyleId = languageStyleData.mainsnak.datavalue.value.id;
            const languageStyleDetail = await getEntityDetail({ entityId: languageStyleId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });

            languageStyle.push({
              id: languageStyleData.mainsnak.datavalue.value.id,
              value: languageStyleDetail?.entities?.[languageStyleId]?.labels?.[loggedInUser.languageCode]?.value ||
              languageStyleDetail?.entities?.[languageStyleId]?.labels?.[loggedInUser.displayLanguageCode]?.value ||
              languageStyleDetail?.entities?.[languageStyleId]?.labels?.[Constant.DISPLAY_LANGUAGE.EN.ISO]?.value || 
              ''
            });
          }
        }

        if (languageStyle.length > 0) {
          statements.languageStyle = {
            property: Constant.WIKIDATA_PROPERTY_CODE.LANGUAGE_STYLE,
            data: languageStyle,
          }
        }
      }

      // get field of usage
      if (sense.claims && sense.claims[Constant.WIKIDATA_PROPERTY_CODE.FIELD_OF_USAGE]) {
        const fieldOfUsage = [];
        for (const fieldOfUsageData of sense.claims[Constant.WIKIDATA_PROPERTY_CODE.FIELD_OF_USAGE]) {
          if (fieldOfUsageData.mainsnak.datavalue.value.id) {
            const fieldOfUsageId = fieldOfUsageData.mainsnak.datavalue.value.id;
            const fieldOfUsageDetail = await getEntityDetail({ entityId: fieldOfUsageId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });
  
            fieldOfUsage.push({
              id: fieldOfUsageData.mainsnak.datavalue.value.id,
              value: fieldOfUsageDetail?.entities?.[fieldOfUsageId]?.labels?.[loggedInUser.languageCode]?.value ||
              fieldOfUsageDetail?.entities?.[fieldOfUsageId]?.labels?.[loggedInUser.displayLanguageCode]?.value ||
              fieldOfUsageDetail?.entities?.[itemForThisSenseId]?.labels?.[Constant.DISPLAY_LANGUAGE.EN.ISO]?.value || 
              '',
            });
          }
        }
  
        if (fieldOfUsage.length > 0) {
          statements.fieldOfUsage = {
            property: Constant.WIKIDATA_PROPERTY_CODE.FIELD_OF_USAGE,
            data: fieldOfUsage,
          }
        }
      }

      lexemeResponse.senses.push(statements);
      senseNumber++;
    }

    // Join array of gloss to string
    lexemeResponse.gloss = gloss.flat().join('; ');

    await transaction.commit();
    return responseSuccess(res, lexemeResponse);
  } catch (err) {
    await transaction.rollback();
    return responseError(res, err);
  }
}

/**
 * Retrieves detailed information for a Hyphenation contribution
 * This function handles fetching and formatting detailed information about a lexeme's hyphenation contribution,
 * focusing on hyphenation rules and grammatical features.
 * 
 * The function:
 * 1. Validates the contribution detail exists and belongs to the user
 * 2. Fetches language variant information
 * 3. Retrieves lexeme details from Wikidata
 * 4. Builds a comprehensive response with:
 *    - Basic lexeme info (lemma, category, language)
 *    - Language variant details
 *    - Grammatical features for the specific form
 *    - For each sense:
 *      - Glosses in different languages
 *      - Images
 *      - Item for this sense
 *      - Language style
 *      - Field of usage
 * 
 * The key difference from other detail functions is the addition of:
 * - Grammatical features specific to the form being hyphenated
 * - Form-specific information rather than just lexeme-level data
 * 
 * @param {Object} req - Express request object containing:
 *   - loggedInUser: Current authenticated user
 *   - params: URL parameters with:
 *     - id: Contribution detail ID
 *     - contributionId: Parent contribution ID
 * @param {Object} res - Express response object
 * @returns {Object} Response containing detailed lexeme information with hyphenation details
 * @throws {Error} If contribution detail not found
 */
export async function getContributionHyphenationDetail(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { params, loggedInUser } = req;
    const { id, contributionId } = params;

    const contributionHyphenationDetail = await ContributionHyphenationDetail.findOne({
      where: {
        id,
      },
      include: { 
        model: Contribution,
        as: 'contribution',
        required: true,
        where: {
          userId: loggedInUser.id,
          status: Constant.CONTRIBUTION_STATUS.PENDING,
        },
      },
      transaction,
    });

    if (!contributionHyphenationDetail) {
      throw Status.ERROR.CONTRIBUTION_DETAIL_NOT_FOUND;
    }

    const language = await Language.findOne({
      attributes: ['id', 'code', 'externalId', 'title'],
      where: { id: loggedInUser.languageId },
      include: {
        attributes: ['id', 'code', 'codePreview', 'title'],
        model: LanguageVariant,
        as: 'languageVariant',
      }
    });

    if (!language) {
      throw Status.ERROR.LANGUAGE_NOT_FOUND;
    }

    // get ongoing contribution
    const lexemeDetail = await getEntityDetail({ entityId: contributionHyphenationDetail.externalLexemeId, language: loggedInUser.languageCode, uselang: loggedInUser.languageCode });
    // const lexemeSense = lexemeDetail['entities'][lexemeId]['senses'].find(senseData => senseData['id'] === senseId);
    
    let lemma = '';
    if (lexemeDetail.entities[contributionHyphenationDetail.externalLexemeId].lemmas) {
      // Extract the values from the object
      const lemmaValues = Object.values(lexemeDetail.entities[contributionHyphenationDetail.externalLexemeId].lemmas).map(lemma => lemma.value);
      
      // Join the values with " / " separator
      lemma = lemmaValues.join(' / ');
    }

    const gloss = [];
    const lexemeResponse = {
      id,
      contributionId,
      externalLexemeId: contributionHyphenationDetail.externalLexemeId,
      externalLanguageId: lexemeDetail.entities[contributionHyphenationDetail.externalLexemeId].language,
      lemma,
      externalCategoryId: lexemeDetail.entities[contributionHyphenationDetail.externalLexemeId].lexicalCategory,
      language,
      category: '',
      gloss: '',
      grammaticalFeatures: '',
      senses: [],
    };

    // get category value
    const lexemeCategoryId = lexemeDetail.entities[contributionHyphenationDetail.externalLexemeId].lexicalCategory;
    const lexemeCategory = await getEntityDetail({ entityId: lexemeCategoryId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });
    lexemeResponse.category = lexemeCategory.entities[lexemeCategoryId].labels[loggedInUser.displayLanguageCode] ? lexemeCategory.entities[lexemeCategoryId].labels[loggedInUser.displayLanguageCode].value :  '';

    // set sense number
    let senseNumber = 1;
    for (const sense of lexemeDetail.entities[contributionHyphenationDetail.externalLexemeId].senses) {
      const statements = {
        externalLexemeSenseId: sense.id,
        senseNumber,
        gloss: sense.glosses[loggedInUser.languageCode] ? sense.glosses[loggedInUser.languageCode].value : '',
        images: null,
        itemForThisSense: null,
        languageStyle: null,
        fieldOfUsage: null,
        otherGlosses: [],
      }

      if (sense.glosses[loggedInUser.languageCode]) {
        gloss.push(sense.glosses[loggedInUser.languageCode].value);
      }

      if (sense.glosses[Constant.DISPLAY_LANGUAGE.EN.ISO]) {
        statements.otherGlosses.push({
          language: sense.glosses[Constant.DISPLAY_LANGUAGE.EN.ISO].language,
          value: sense.glosses[Constant.DISPLAY_LANGUAGE.EN.ISO].value
        });
      }

      if (sense.glosses[Constant.DISPLAY_LANGUAGE.ID.ISO]) {
        statements.otherGlosses.push({
          language: sense.glosses[Constant.DISPLAY_LANGUAGE.ID.ISO].language,
          value: sense.glosses[Constant.DISPLAY_LANGUAGE.ID.ISO].value
        });
      }

      // get images
      if (sense.claims && sense.claims[Constant.WIKIDATA_PROPERTY_CODE.IMAGE]) {
        const images = [];
        for (const imageDetail of sense.claims[Constant.WIKIDATA_PROPERTY_CODE.IMAGE]) {
          if (imageDetail.mainsnak.datavalue.value) {
            images.push({
              value: imageDetail.mainsnak.datavalue.value,
              url: `https://commons.wikimedia.org/wiki/Special:FilePath/${imageDetail.mainsnak.datavalue.value}`,
            });
          }
        }

        if (images.length > 0) {
          statements.images = {
            property: Constant.WIKIDATA_PROPERTY_CODE.IMAGE,
            data: images,
          }
        }
      }

      // get item for this sense
      if (sense.claims && sense.claims[Constant.WIKIDATA_PROPERTY_CODE.ITEM_FOR_THIS_SENSE]) {
        const itemForThisSense = [];
        for (const itemForThisSenseData of sense.claims[Constant.WIKIDATA_PROPERTY_CODE.ITEM_FOR_THIS_SENSE]) {
          if (itemForThisSenseData.mainsnak.datavalue.value.id) {
            const itemForThisSenseId = itemForThisSenseData.mainsnak.datavalue.value.id;
            const itemForThisSenseDetail = await getEntityDetail({ entityId: itemForThisSenseId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });

            itemForThisSense.push({
              id: itemForThisSenseData.mainsnak.datavalue.value.id,
              value: itemForThisSenseDetail?.entities?.[itemForThisSenseId]?.labels?.[loggedInUser.languageCode]?.value ||
              itemForThisSenseDetail?.entities?.[itemForThisSenseId]?.labels?.[loggedInUser.displayLanguageCode]?.value ||
              itemForThisSenseDetail?.entities?.[itemForThisSenseId]?.labels?.[Constant.DISPLAY_LANGUAGE.EN.ISO]?.value || 
              '',
            });
          }
        }
  
        if (itemForThisSense.length > 0) {
          statements.itemForThisSense = {
            property: Constant.WIKIDATA_PROPERTY_CODE.ITEM_FOR_THIS_SENSE,
            data: itemForThisSense,
          }
        }
      }

      // get language style
      if (sense.claims && sense.claims[Constant.WIKIDATA_PROPERTY_CODE.LANGUAGE_STYLE]) {
        const languageStyle = [];
        for (const languageStyleData of sense.claims[Constant.WIKIDATA_PROPERTY_CODE.LANGUAGE_STYLE]) {
          if (languageStyleData.mainsnak.datavalue.value.id) {
            const languageStyleId = languageStyleData.mainsnak.datavalue.value.id;
            const languageStyleDetail = await getEntityDetail({ entityId: languageStyleId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });

            languageStyle.push({
              id: languageStyleData.mainsnak.datavalue.value.id,
              value: languageStyleDetail?.entities?.[languageStyleId]?.labels?.[loggedInUser.languageCode]?.value ||
              languageStyleDetail?.entities?.[languageStyleId]?.labels?.[loggedInUser.displayLanguageCode]?.value ||
              languageStyleDetail?.entities?.[languageStyleId]?.labels?.[Constant.DISPLAY_LANGUAGE.EN.ISO]?.value || 
              ''
            });
          }
        }

        if (languageStyle.length > 0) {
          statements.languageStyle = {
            property: Constant.WIKIDATA_PROPERTY_CODE.LANGUAGE_STYLE,
            data: languageStyle,
          }
        }
      }

      // get field of usage
      if (sense.claims && sense.claims[Constant.WIKIDATA_PROPERTY_CODE.FIELD_OF_USAGE]) {
        const fieldOfUsage = [];
        for (const fieldOfUsageData of sense.claims[Constant.WIKIDATA_PROPERTY_CODE.FIELD_OF_USAGE]) {
          if (fieldOfUsageData.mainsnak.datavalue.value.id) {
            const fieldOfUsageId = fieldOfUsageData.mainsnak.datavalue.value.id;
            const fieldOfUsageDetail = await getEntityDetail({ entityId: fieldOfUsageId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });
  
            fieldOfUsage.push({
              id: fieldOfUsageData.mainsnak.datavalue.value.id,
              value: fieldOfUsageDetail?.entities?.[fieldOfUsageId]?.labels?.[loggedInUser.languageCode]?.value ||
              fieldOfUsageDetail?.entities?.[fieldOfUsageId]?.labels?.[loggedInUser.displayLanguageCode]?.value ||
              fieldOfUsageDetail?.entities?.[itemForThisSenseId]?.labels?.[Constant.DISPLAY_LANGUAGE.EN.ISO]?.value || 
              '',
            });
          }
        }
  
        if (fieldOfUsage.length > 0) {
          statements.fieldOfUsage = {
            property: Constant.WIKIDATA_PROPERTY_CODE.FIELD_OF_USAGE,
            data: fieldOfUsage,
          }
        }
      }

      lexemeResponse.senses.push(statements);
      senseNumber++;
    }

    // get gramatical forms
    const form = lexemeDetail.entities[contributionHyphenationDetail.externalLexemeId].forms.find(form => form.id === contributionHyphenationDetail.externalLexemeFormId);
    if (form && form.grammaticalFeatures) {
      const grammaticalFeatures = []
      for (const gramaticalFeatureId of form.grammaticalFeatures) {
        const grammaticalFeature = await getEntityDetail({ entityId: gramaticalFeatureId, language: '', uselang: '' });
        grammaticalFeatures.push(
          grammaticalFeature?.entities?.[gramaticalFeatureId]?.labels?.[loggedInUser.languageCode].value ||
          grammaticalFeature?.entities?.[gramaticalFeatureId]?.labels?.[loggedInUser.displayLanguageCode].value ||
          grammaticalFeature?.entities?.[gramaticalFeatureId]?.labels?.[Constant.DISPLAY_LANGUAGE.EN.ISO].value ||
          ''
        );
      }
      lexemeResponse.grammaticalFeatures = grammaticalFeatures.flat().join(', ');
    }

    // Join array of gloss to string
    lexemeResponse.gloss = gloss.flat().join('; ');

    await transaction.commit();
    return responseSuccess(res, lexemeResponse);
  } catch (err) {
    await transaction.rollback();
    return responseError(res, err);
  }
}

/**
 * Updates a Connect contribution detail with new item information
 * 
 * @param {Object} req - Express request object containing:
 *   - loggedInUser: Current authenticated user
 *   - params: URL parameters with id
 *   - body: Request body with:
 *     - action: Action to perform (ADD/NO_ITEM/SKIP)
 *     - itemId: Wikidata item ID to link (for ADD action)
 * @param {Object} res - Express response object
 * @returns {Object} Updated contribution detail
 * @throws {Error} If contribution detail not found or update fails
 */
export async function updateContributionConnectDetail(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { loggedInUser } = req;
    const { id } = req.params;
    const { action, itemId } = req.body;
    
    // Find and validate contribution detail
    const contributionConnectDetail = await ContributionConnectDetail.findOne({
      where: {
        id,
        status: Constant.CONTRIBUTION_DETAIL_STATUS.PENDING,
      },
      include: {
        model: Contribution,
        as: 'contribution',
        required: true,
        where: {
          externalUserId: loggedInUser.externalId,
          status: Constant.CONTRIBUTION_STATUS.PENDING
        },
      },
      transaction,
    });

    if (!contributionConnectDetail) {
      throw Status.ERROR.CONTRIBUTION_DETAIL_NOT_FOUND;
    }

    // Process based on action type
    let status = '';
    let externalItemId = null;
    if (action === Constant.CONTRIBUTION_DETAIL_ACTION.ADD) {
      // Add item to lexeme sense in Wikidata
      const csrfToken = await getCsrfToken({ accessToken: loggedInUser.wikiAccessToken });
      await addItemToLexemeSense({
        csrfToken,
        accessToken: loggedInUser.wikiAccessToken,
        itemId,
        senseId: contributionConnectDetail.externalLexemeSenseId,
      });

      externalItemId = itemId;
      status = Constant.CONTRIBUTION_DETAIL_STATUS.COMPLETED;
    } else if (action === Constant.CONTRIBUTION_DETAIL_ACTION.NO_ITEM) {
      status = Constant.CONTRIBUTION_DETAIL_STATUS.NO_ITEM;
    } else {
      status = Constant.CONTRIBUTION_DETAIL_STATUS.SKIPPED;
    }

    // Update contribution detail status
    await contributionConnectDetail.update({
      status,
      externalItemId,
    }, { transaction });

    await transaction.commit();
    return responseSuccess(res, contributionConnectDetail);
  } catch (err) {
    await transaction.rollback();
    return responseError(res, err);
  }
}

/**
 * Updates a Script contribution detail with new lemma information
 * 
 * @param {Object} req - Express request object containing:
 *   - loggedInUser: Current authenticated user
 *   - params: URL parameters with id
 *   - body: Request body with:
 *     - action: Action to perform (ADD/SKIP)
 *     - lemma: New lemma text (for ADD action)
 * @param {Object} res - Express response object
 * @returns {Object} Updated contribution detail
 * @throws {Error} If contribution detail not found or update fails
 */
export async function updateContributionScriptDetail(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { loggedInUser } = req;
    const { id } = req.params;
    let { action, lemma } = req.body;
    
    // Find and validate contribution detail
    const contributionScriptDetail = await ContributionScriptDetail.findOne({
      where: {
        id,
        status: Constant.CONTRIBUTION_DETAIL_STATUS.PENDING,
      },
      include: {
        model: Contribution,
        as: 'contribution',
        required: true,
        where: {
          userId: loggedInUser.id,
          status: Constant.CONTRIBUTION_STATUS.PENDING
        },
      },
      transaction,
    });

    if (!contributionScriptDetail) {
      throw Status.ERROR.CONTRIBUTION_DETAIL_NOT_FOUND;
    }

    let status = '';
    if (action === Constant.CONTRIBUTION_DETAIL_ACTION.ADD) {
      const csrfToken = await getCsrfToken({ accessToken: loggedInUser.wikiAccessToken });
      await addLemmaToLexeme({
        csrfToken,
        accessToken: loggedInUser.wikiAccessToken,
        lexemeId: contributionScriptDetail.externalLexemeId,
        variantCode: contributionScriptDetail.languageVariantCode,
        lemma,
      });

      status = Constant.CONTRIBUTION_DETAIL_STATUS.COMPLETED;
    } else {
      status = Constant.CONTRIBUTION_DETAIL_STATUS.SKIPPED;
      lemma = null;
    }

    // update contribution detail status
    await contributionScriptDetail.update({
      status,
      lemmaVariant: lemma,
    }, { transaction });

    await transaction.commit();
    return responseSuccess(res, contributionScriptDetail);
  } catch (err) {
    await transaction.rollback();
    return responseError(res, err);
  }
}

export async function updateContributionHyphenationDetail(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { loggedInUser } = req;
    const { id } = req.params;
    let { action, hyphenation } = req.body;
    
    const contributionHyphenationDetail = await ContributionHyphenationDetail.findOne({
      where: {
        id,
        status: Constant.CONTRIBUTION_DETAIL_STATUS.PENDING,
      },
      include: {
        model: Contribution,
        as: 'contribution',
        required: true,
        where: {
          userId: loggedInUser.id,
          status: Constant.CONTRIBUTION_STATUS.PENDING
        },
      },
      transaction,
    });

    if (!contributionHyphenationDetail) {
      throw Status.ERROR.CONTRIBUTION_DETAIL_NOT_FOUND;
    }

    let status = '';
    if (action === Constant.CONTRIBUTION_DETAIL_ACTION.ADD) {
      hyphenation = hyphenation.flat().join('‧')
      const csrfToken = await getCsrfToken({ accessToken: loggedInUser.wikiAccessToken });
      await addHyphenationToLexemeForm({
        csrfToken,
        accessToken: loggedInUser.wikiAccessToken,
        formId: contributionHyphenationDetail.externalLexemeFormId,
        hyphenation,
      });

      status = Constant.CONTRIBUTION_DETAIL_STATUS.COMPLETED;
    } else {
      status = Constant.CONTRIBUTION_DETAIL_STATUS.SKIPPED;
      hyphenation = null;
    }

    // update contribution detail status
    await contributionHyphenationDetail.update({
      status,
      hyphenation,
    }, { transaction });

    await transaction.commit();
    return responseSuccess(res, contributionHyphenationDetail);
  } catch (err) {
    await transaction.rollback();
    return responseError(res, err);
  }
}

/**
 * Ends the current contribution session and cleans up related data
 * 
 * @param {Object} req - Express request object containing:
 *   - loggedInUser: Current authenticated user
 * @param {Object} res - Express response object
 * @returns {Object} Success response
 * @throws {Error} If no ongoing contribution found
 */
export async function endContribution(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { loggedInUser } = req;

    // Find ongoing contribution
    const ongoingContribution = await Contribution.findOne({
      where: {
        userId: loggedInUser.id,
        status: Constant.CONTRIBUTION_STATUS.PENDING,
      },
      transaction,
    });
    
    if (!ongoingContribution) {
      throw Status.ERROR.ON_GOING_CONTRIBUTION_NOT_FOUND;
    }

    // Clean up contribution details based on activity type
    if (ongoingContribution.activityType === Constant.ACTIVITY.CONNECT) {
      // Remove all connect contribution details
      await ContributionConnectDetail.destroy({
        where: {
          contributionId: ongoingContribution.id,
          status: [
            Constant.CONTRIBUTION_DETAIL_STATUS.PENDING, 
            Constant.CONTRIBUTION_DETAIL_STATUS.SKIPPED, 
            Constant.CONTRIBUTION_DETAIL_STATUS.COMPLETED
          ],
        },
        transaction,
      });
    } else if (ongoingContribution.activityType === Constant.ACTIVITY.SCRIPT) {
      // Remove all script contribution details
      await ContributionScriptDetail.destroy({
        where: {
          contributionId: ongoingContribution.id,
          status: [
            Constant.CONTRIBUTION_DETAIL_STATUS.PENDING, 
            Constant.CONTRIBUTION_DETAIL_STATUS.SKIPPED, 
            Constant.CONTRIBUTION_DETAIL_STATUS.COMPLETED
          ],
        },
        transaction,
      });
    } else if (ongoingContribution.activityType === Constant.ACTIVITY.HYPHENATION) {
      // Remove all hyphenation contribution details
      await ContributionHyphenationDetail.destroy({
        where: {
          contributionId: ongoingContribution.id,
          status: [
            Constant.CONTRIBUTION_DETAIL_STATUS.PENDING, 
            Constant.CONTRIBUTION_DETAIL_STATUS.SKIPPED, 
            Constant.CONTRIBUTION_DETAIL_STATUS.COMPLETED
          ],
        },
        transaction,
      });
    }

    // Remove the contribution record
    await ongoingContribution.destroy({ transaction });

    // Reset user's activity type
    await User.update({
      activityType: null,
    }, { 
      where: { id: loggedInUser.id }, 
      transaction 
    });

    await transaction.commit();
    return responseSuccess(res, { message: 'Contribution ended successfully' });
  } catch (err) {
    await transaction.rollback();
    return responseError(res, err);
  }
}