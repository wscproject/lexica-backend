/* eslint-disable no-await-in-loop */
/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
import { Op } from 'sequelize';
import Status from '../../../utils/status';
import Constant from '../../../utils/constants';
import { responseError, responseSuccess } from '../../../utils/output';
import {
  Contribution, ContributionDetail, Language, UserPreference, sequelize,
} from '../../../models';
import { simpleQuery, generateRandomLexemeQuery, generateGetLexemeQuery } from '../../../utils/sparql';
import { getCsrfToken, addItemToLexemeSense } from '../../../utils/wikidata';

export async function startContribution(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { loggedInUser } = req;
    const { language } = req.body;
    
    let createdContributionDetails = [];
    let existingLexeme = true;

    // get ongoing contribution
    const ongoingContribution = await Contribution.findOne({
      where: {
        userId: loggedInUser.userId,
        status: Constant.CONTRIBUTION_STATUS.PENDING,
      },
      transaction,
    });
    
    if (ongoingContribution) {
      // check existing contribution language
      const existingLanguage = await Language.findOne({
        where: {
          externalId: ongoingContribution.languageId,
        },
        transaction,
      });
  
      if (!existingLanguage) {
        throw Status.ERROR.LANGUAGE_NOT_FOUND;
      }
      
      // return exisiting contribution data
      const existingContributionDetails = await ContributionDetail.findAll({
        where: {
          contributionId: ongoingContribution.id,
        },
        order: [['order', 'ASC']],
        transaction,
      });

      if (existingContributionDetails.length < 1) {
        throw Status.ERROR.LEXEMES_NOT_FOUND;
      }

      // generate include lexeme string
      let includeLexemeString = '';
      const existingContributionDetailsMapping = existingContributionDetails.map(includeData => {
        return `wd:${includeData.lexemeSenseId}`
      });

      includeLexemeString = existingContributionDetailsMapping.join(", ");

      // get lexemes
      const query = await generateGetLexemeQuery({ languageCode: existingLanguage.code, languageId: existingLanguage.externalId, include: includeLexemeString, displayLanguage: loggedInUser.displayLanguage });
      const queryResponse = await simpleQuery(query);
      if (queryResponse.results && queryResponse.results.bindings && queryResponse.results.bindings.length > 0) {
        const lexemes = queryResponse.results.bindings;
        for (const existingContributionDetail of existingContributionDetails) {
          const currentLexeme = lexemes.find(lexemeData => lexemeData.senseLabel.value === existingContributionDetail.lexemeSenseId);
          
          // set lexeme detail
          createdContributionDetails.push({
            contributionId: ongoingContribution.id,
            lexemeId: currentLexeme.lexemeLabel.value,
            lexemeSenseId: currentLexeme.senseLabel.value,
            languageId: existingContributionDetail.languageId,
            categoryId: currentLexeme.categoryQID.value,
            lemma: currentLexeme.lemma.value,
            category: currentLexeme.categoryLabel.value,
            gloss: currentLexeme.gloss ? currentLexeme.gloss.value : '',
            status: existingContributionDetail.status,
            order: existingContributionDetail.order,
          });
        }
      } else {
        throw Status.ERROR.LEXEMES_NOT_FOUND;
      }
    } else {
      // check selected contribution language
      const existingLanguage = await Language.findOne({
        where: {
          code: language,
        },
        transaction,
      });
  
      if (!existingLanguage) {
        throw Status.ERROR.LANGUAGE_NOT_FOUND;
      }

      // create contribution data
      const createdContribution = await Contribution.create(
        {
          userId: loggedInUser.userId,
          startTime: new Date(),
          languageId: existingLanguage.externalId,
          status: Constant.CONTRIBUTION_STATUS.PENDING,
        },
        { transaction }
      );
      
      // find all updating lexemes 
      const ongoingLexemeContributions = await ContributionDetail.findAll({
        attributes: ['lexemeSenseId'],
        where: {
          languageId: existingLanguage.externalId,
          [Op.or]: [
            { status: Constant.CONTRIBUTION_DETAIL_STATUS.PENDING },
            { 
              status: Constant.CONTRIBUTION_DETAIL_STATUS.NO_ITEM,
              '$contribution.user_id$': loggedInUser.userId,
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

      console.log(ongoingLexemeContributions);

      // generate exclude lexeme string
      let excludeLexemeString = '';
      if (ongoingLexemeContributions.length > 0) {
        const ongoingLexemeContributionsMapping = ongoingLexemeContributions.map(excludeData => {
          return `wd:${excludeData.lexemeSenseId}`
        });

        excludeLexemeString = ongoingLexemeContributionsMapping.join(", ");   
      }

      // get random lexemes
      const query = await generateRandomLexemeQuery({ languageCode: existingLanguage.code, languageId: existingLanguage.externalId, exclude: excludeLexemeString, displayLanguage: loggedInUser.displayLanguage });
      while (existingLexeme) {
        let orderNumber = 1;
        const queryResponse = await simpleQuery(query);
        if (queryResponse.results && queryResponse.results.bindings && queryResponse.results.bindings.length > 0) {
          const randomLexeme = queryResponse.results.bindings;
          for (const lexemeData of randomLexeme) {
            const existingLexemeContributionDetail = await ContributionDetail.findOne({
              where: {
                lexemeSenseId: lexemeData.senseLabel.value,
              },
              attributes: ['lexemeSenseId'],
              lock: transaction.LOCK.UPDATE,
              transaction,
            });

            // validate exisitng lexeme contribution detail
            if (existingLexemeContributionDetail) {
              existingLexeme = true;
              break;
            }

            // set lexeme detail
            createdContributionDetails.push({
              contributionId: createdContribution.id,
              lexemeId: lexemeData.lexemeLabel.value,
              lexemeSenseId: lexemeData.senseLabel.value,
              languageId: existingLanguage.externalId,
              categoryId: lexemeData.categoryQID.value,
              lemma: lexemeData.lemma.value,
              category: lexemeData.categoryLabel.value,
              status: "pending",
              gloss: lexemeData.gloss ? lexemeData.gloss.value : '',
              order: orderNumber,
            });

            // increment order number;
            orderNumber++;
          }
          existingLexeme = false;
        } else {
          throw Status.ERROR.LEXEMES_NOT_FOUND;
        }
      }

      // validate if created contribution not empty
      if (createdContributionDetails.length < 1) {
        throw Status.ERROR.LEXEMES_NOT_FOUND;
      }

      await ContributionDetail.bulkCreate(createdContributionDetails, { transaction });

      await UserPreference.update({
        languageId: existingLanguage.id,
        language: existingLanguage.code,
      }, { where: { userId: loggedInUser.userId }, transaction });
    }

    await transaction.commit();
    return responseSuccess(res, createdContributionDetails);
  } catch (err) {
    console.log(err);
    await transaction.rollback();
    return responseError(res, err);
  }
}

export async function updateContributionDetail(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const { loggedInUser, accessToken } = req;
    const { senseId } = req.params;
    const { action, itemId } = req.body;
    
    const contributionDetail = await ContributionDetail.findOne({
      where: {
        lexemeSenseId: senseId,
        status: Constant.CONTRIBUTION_DETAIL_STATUS.PENDING,
      },
      include: {
        model: Contribution,
        as: 'contribution',
        require: true,
        where: {
          userId: loggedInUser.userId,
          status: Constant.CONTRIBUTION_STATUS.PENDING
        },
      },
      transaction,
    });

    if (!contributionDetail) {
      throw Status.ERROR.CONTRIBUTION_DETAIL_NOT_FOUND;
    }

    let status = '';
    if (action === Constant.CONTRIBUTION_DETAIL_ACTION.ADD) {
      const csrfToken = await getCsrfToken({ accessToken });
      await addItemToLexemeSense({
        csrfToken,
        accessToken,
        itemId,
        senseId: senseId,
      });

      status = Constant.CONTRIBUTION_DETAIL_STATUS.COMPLETED;
    } else if (action === Constant.CONTRIBUTION_DETAIL_ACTION.NO_ITEM) {
      status = Constant.CONTRIBUTION_DETAIL_STATUS.NO_ITEM;
    } else {
      status = Constant.CONTRIBUTION_DETAIL_STATUS.SKIPPED;
    }

    // update contribution detail status
    await contributionDetail.update({
      status,
    }, { transaction });

    await transaction.commit();
    return responseSuccess(res, contributionDetail);
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
        userId: loggedInUser.userId,
        status: Constant.CONTRIBUTION_STATUS.PENDING,
      },
      transaction,
    });
    
    if (!ongoingContribution) {
      throw Status.ERROR.ON_GOING_CONTRIBUTION_NOT_FOUND;
    }

    await ContributionDetail.destroy({
      where: {
        contributionId: ongoingContribution.id,
        status: [Constant.CONTRIBUTION_DETAIL_STATUS.PENDING, Constant.CONTRIBUTION_DETAIL_STATUS.SKIPPED],
      },
      transaction,
    });

    await ongoingContribution.update({
      status: Constant.CONTRIBUTION_STATUS.COMPLETED,
    }, { transaction });

    await transaction.commit();
    return responseSuccess(res, ongoingContribution);
  } catch (err) {
    console.log(err);
    await transaction.rollback();
    return responseError(res, err);
  }
}
