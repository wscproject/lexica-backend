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
} from '../../../utils/sparql';
import { getCsrfToken, addItemToLexemeSense, addLemmaToLexeme } from '../../../utils/wikidata';

export async function startContributionConnect(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { loggedInUser } = req;
    const { languageCode } = req.body;
    
    let createdContributionConnectDetails = [];
    let existingLexeme = true;

    // get ongoing contribution
    const ongoingContribution = await Contribution.findOne({
      where: {
        userId: loggedInUser.id,
        status: Constant.CONTRIBUTION_STATUS.PENDING,
      },
      transaction,
    });
    
    if (ongoingContribution) {
      if (ongoingContribution.activityType !== Constant.ACTIVITY.CONNECT) {
        throw Status.ERROR.PENDING_ACTIVITY;
      }

      // check existing contribution language
      const existingLanguage = await Language.findOne({
        where: {
          externalId: ongoingContribution.externalLanguageId,
        },
        transaction,
      });
  
      if (!existingLanguage) {
        throw Status.ERROR.LANGUAGE_NOT_FOUND;
      }
      
      // return exisiting contribution data
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

      // generate include lexeme string
      let includeLexemeString = '';
      const existingContributionConnectDetailsMapping = existingContributionConnectDetails.map(includeData => {
        return `wd:${includeData.externalLexemeSenseId}`
      });

      includeLexemeString = existingContributionConnectDetailsMapping.join(", ");

      // get lexemes
      const query = await generateGetConnectLexemeSenseQuery({ languageCode: existingLanguage.code, languageId: existingLanguage.externalId, include: includeLexemeString, displayLanguage: loggedInUser.displayLanguageCode });
      const queryResponse = await simpleQuery(query);
      if (queryResponse.results && queryResponse.results.bindings && queryResponse.results.bindings.length > 0) {
        const lexemes = queryResponse.results.bindings;
        for (const existingContributionConnectDetail of existingContributionConnectDetails) {
          const currentLexeme = lexemes.find(lexemeData => lexemeData.senseLabel.value === existingContributionConnectDetail.externalLexemeSenseId);

          // set lexeme detail
          if (currentLexeme) {
            createdContributionConnectDetails.push({
              id: existingContributionConnectDetail.id,
              contributionId: ongoingContribution.id,
              externalLexemeId: currentLexeme.lexemeLabel.value,
              externalLexemeSenseId: currentLexeme.senseLabel.value,
              externalLanguageId: existingContributionConnectDetail.languageId,
              externalCategoryId: currentLexeme.categoryQID.value,
              lemma: currentLexeme.lemma.value,
              category: currentLexeme.categoryLabel.value,
              gloss: currentLexeme.gloss ? currentLexeme.gloss.value : '',
              status: existingContributionConnectDetail.status,
              order: existingContributionConnectDetail.order,
            });
          }
        }
      } else {
        throw Status.ERROR.LEXEMES_NOT_FOUND;
      }
    } else {
      // check selected contribution language
      const existingLanguage = await Language.findOne({
        where: {
          code: languageCode,
        },
        transaction,
      });
  
      if (!existingLanguage) {
        throw Status.ERROR.LANGUAGE_NOT_FOUND;
      }

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

      // create contribution data
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
      
      // find all updating lexemes 
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

      // generate exclude lexeme string
      let excludeLexemeString = '';
      if (ongoingLexemeContributions.length > 0) {
        const ongoingLexemeContributionsMapping = ongoingLexemeContributions.map(excludeData => {
          return `wd:${excludeData.externalLexemeSenseId}`
        });

        excludeLexemeString = ongoingLexemeContributionsMapping.join(", ");   
      }

      // get random lexemes
      const query = await generateRandomConnectLexemeSenseQuery({ languageCode: existingLanguage.code, languageId: existingLanguage.externalId, exclude: excludeLexemeString, displayLanguage: loggedInUser.displayLanguageCode });
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
              category: lexemeData.categoryLabel.value,
              status: "pending",
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

    await transaction.commit();
    return responseSuccess(res, createdContributionConnectDetails);
  } catch (err) {
    await transaction.rollback();
    return responseError(res, err);
  }
}

export async function updateContributionConnectDetail(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { loggedInUser } = req;
    const { contributionDetailId } = req.params;
    const { action, itemId } = req.body;
    
    const contributionConnectDetail = await ContributionConnectDetail.findOne({
      where: {
        id: contributionDetailId,
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

    let status = '';
    let externalItemId = null;
    if (action === Constant.CONTRIBUTION_DETAIL_ACTION.ADD) {
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

    // update contribution detail status
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

export async function startContributionScript(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { loggedInUser } = req;
    const { languageCode } = req.body;
    
    let createdContributionScriptDetails = [];
    let existingLexeme = true;

    // get ongoing contribution
    const ongoingContribution = await Contribution.findOne({
      where: {
        userId: loggedInUser.id,
        status: Constant.CONTRIBUTION_STATUS.PENDING,
      },
      transaction,
    });
    
    if (ongoingContribution) {
      if (ongoingContribution.activityType !== Constant.ACTIVITY.SCRIPT) {
        throw Status.ERROR.PENDING_ACTIVITY;
      }
      // check existing contribution language
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
      
      // return exisiting contribution data
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

      // generate include lexeme string
      let includeLexemeString = '';
      const existingContributionScriptDetailsMapping = existingContributionScriptDetails.map(includeData => {
        return `wd:${includeData.externalLexemeId}`
      });

      includeLexemeString = existingContributionScriptDetailsMapping.join(", ");

      // get lexemes
      const query = await generateGetScriptLexemeQuery({ languageId: existingLanguage.externalId, include: includeLexemeString, displayLanguage: loggedInUser.displayLanguageCode });
      const queryResponse = await simpleQuery(query);
      if (queryResponse.results && queryResponse.results.bindings && queryResponse.results.bindings.length > 0) {
        const lexemes = queryResponse.results.bindings;
        for (const existingContributionScriptDetail of existingContributionScriptDetails) {
          const currentLexeme = lexemes.find(lexemeData => lexemeData.lLabel.value === existingContributionScriptDetail.externalLexemeId);

          // set lexeme detail
          if (currentLexeme) {
            createdContributionScriptDetails.push({
              id: existingContributionScriptDetail.id,
              contributionId: ongoingContribution.id,
              languageVariantId: existingContributionScriptDetail.languageVariantId,
              externalLexemeId: currentLexeme.lLabel.value,
              externalLanguageId: existingContributionScriptDetail.externalLanguageId,
              externalCategoryId: currentLexeme.categoryQID.value,
              languageVariantCode: existingContributionScriptDetail.languageVariantCode,
              language: existingLanguage,
              lemma: currentLexeme.lemma.value,
              category: currentLexeme.categoryLabel.value,
              gloss: currentLexeme.gloss ? currentLexeme.gloss.value : '',
              status: existingContributionScriptDetail.status,
              order: existingContributionScriptDetail.order,
            });
          }
        }
      } else {
        throw Status.ERROR.LEXEMES_NOT_FOUND;
      }
    } else {
      // check selected contribution language
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

      // create contribution data
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
      
      // find all updating lexemes 
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

      // generate exclude lexeme string
      let excludeLexemeString = '';
      if (ongoingLexemeContributions.length > 0) {
        const ongoingLexemeContributionsMapping = ongoingLexemeContributions.map(excludeData => {
          return `wd:${excludeData.externalLexemeId}`
        });

        excludeLexemeString = ongoingLexemeContributionsMapping.join(", ");   
      }

      // get random lexemes
      const query = await generateRandomScriptLexemeQuery({ variantCode: existingLanguage.languageVariant.code, languageId: existingLanguage.externalId, exclude: excludeLexemeString, displayLanguage: loggedInUser.displayLanguageCode });
      while (existingLexeme) {
        let orderNumber = 1;
        const queryResponse = await simpleQuery(query);
        if (queryResponse.results && queryResponse.results.bindings && queryResponse.results.bindings.length > 0) {
          const randomLexeme = queryResponse.results.bindings;
          for (const lexemeData of randomLexeme) {
            const existingLexemeContributionScriptDetail = await ContributionScriptDetail.findOne({
              where: {
                externalLexemeId: lexemeData.lLabel.value,
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
              externalLexemeId: lexemeData.lLabel.value,
              externalLanguageId: existingLanguage.externalId,
              externalCategoryId: lexemeData.categoryQID.value,
              languageVariantCode: existingLanguage.languageVariant.codePreview,
              language: existingLanguage,
              lemma: lexemeData.lemma.value,
              category: lexemeData.categoryLabel.value,
              status: "pending",
              gloss: lexemeData.gloss ? lexemeData.gloss.value : '',
              order: orderNumber,
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

    await transaction.commit();
    return responseSuccess(res, createdContributionScriptDetails);
  } catch (err) {
    await transaction.rollback();
    return responseError(res, err);
  }
}

export async function updateContributionScriptDetail(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { loggedInUser } = req;
    const { contributionDetailId } = req.params;
    let { action, lemma } = req.body;
    
    const contributionScriptDetail = await ContributionScriptDetail.findOne({
      where: {
        id: contributionDetailId,
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

export async function endContribution(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { loggedInUser } = req;

    // get ongoing contribution
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

    if (ongoingContribution.activityType === Constant.ACTIVITY.CONNECT) {
      await ContributionConnectDetail.destroy({
        where: {
          contributionId: ongoingContribution.id,
          status: [Constant.CONTRIBUTION_DETAIL_STATUS.PENDING, Constant.CONTRIBUTION_DETAIL_STATUS.SKIPPED, Constant.CONTRIBUTION_DETAIL_STATUS.COMPLETED],
        },
        transaction,
      });
    } else if (ongoingContribution.activityType === Constant.ACTIVITY.SCRIPT) {
      await ContributionScriptDetail.destroy({
        where: {
          contributionId: ongoingContribution.id,
          status: [Constant.CONTRIBUTION_DETAIL_STATUS.PENDING, Constant.CONTRIBUTION_DETAIL_STATUS.SKIPPED, Constant.CONTRIBUTION_DETAIL_STATUS.COMPLETED],
        },
        transaction,
      });
    }    

    await ongoingContribution.update({
      status: Constant.CONTRIBUTION_STATUS.COMPLETED,
    }, { transaction });

    await transaction.commit();
    return responseSuccess(res, ongoingContribution);
  } catch (err) {
    await transaction.rollback();
    return responseError(res, err);
  }
}