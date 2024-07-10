/* eslint-disable no-await-in-loop */
/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
import Constant from '../../../utils/constants';
import { responseError, responseSuccess } from '../../../utils/output';
import { getEntityDetail } from '../../../utils/wikidata'

export async function getLexemeSenseDetail(req, res) {
  try {
    const { params } = req;
    const { senseId } = params;
    const lexemeId = senseId.split("-")[0];

    // get ongoing contribution
    const lexemeDetail = await getEntityDetail({ entityId: lexemeId });
    const lexemeSense = lexemeDetail['entities'][lexemeId]['senses'].find(senseData => senseData['id'] === senseId);
    const lexemeResponse = {
      lexemeId,
      lexemeSenseId: senseId,
      lemma: lexemeDetail['entities'][lexemeId]['lemmas'][Constant.LANGUAGE.ID.ISO]['value'],
      categoryId: lexemeDetail['entities'][lexemeId]['lexicalCategory'],
      category: "",
      languageId: lexemeDetail['entities'][lexemeId]['language'],
      gloss: lexemeSense['glosses'] && lexemeSense['glosses'][Constant.LANGUAGE.ID.ISO] ? lexemeSense['glosses'][Constant.LANGUAGE.ID.ISO]['value'] : '',
      statements: {
        images: null,
        antonym: null,
        translation: null
      }
    };

    // get category value
    const lexemeCategoryId = lexemeDetail['entities'][lexemeId]['lexicalCategory'];
    const lexemeCategory = await getEntityDetail({ entityId: lexemeCategoryId });
    lexemeResponse.category = lexemeCategory['entities'][lexemeCategoryId]['labels'][Constant.LANGUAGE.ID.ISO]['value'];

    // get images
    if (lexemeSense['claims'] && lexemeSense['claims'][Constant.WIKIDATA_PROPERTY_CODE.IMAGE]) {
      const images = [];
      for (const imageDetail of lexemeSense['claims'][Constant.WIKIDATA_PROPERTY_CODE.IMAGE]) {
        if (imageDetail['mainsnak']['datavalue']['value']) {
          images.push({
            value: imageDetail['mainsnak']['datavalue']['value'],
            url: `https://commons.wikimedia.org/wiki/Special:FilePath/${imageDetail['mainsnak']['datavalue']['value']}`,
          });
        }
      }

      if (images.length > 0) {
        lexemeResponse.statements.images = {
          property: Constant.WIKIDATA_PROPERTY_CODE.IMAGE,
          data: images,
        }
      }
    }

    // get antonym
    if (lexemeSense['claims'] && lexemeSense['claims'][Constant.WIKIDATA_PROPERTY_CODE.ANTONYM]) {
      const antonym = [];
      for (const antonymData of lexemeSense['claims'][Constant.WIKIDATA_PROPERTY_CODE.ANTONYM]) {
        if (antonymData['mainsnak']['datavalue']['value']['id']) {
          const antonymId = antonymData['mainsnak']['datavalue']['value']['id'].split('-')[0];
          const antonymDetail = await getEntityDetail({ entityId: antonymId });

          antonym.push({
            id: antonymData['mainsnak']['datavalue']['value']['id'],
            value: antonymDetail['entities'][antonymId]['lemmas'][Constant.LANGUAGE.ID.ISO]['value'],
          });
        }
      }

      if (antonym.length > 0) {
        lexemeResponse.statements.antonym = {
          property: Constant.WIKIDATA_PROPERTY_CODE.ANTONYM,
          data: antonym,
        }
      }
    }

    // get translate
    if (lexemeSense['claims'] && lexemeSense['claims'][Constant.WIKIDATA_PROPERTY_CODE.TRANSLATION]) {
      const translate = [];
      for (const translateData of lexemeSense['claims'][Constant.WIKIDATA_PROPERTY_CODE.TRANSLATION]) {
        if (translateData['mainsnak']['datavalue']['value']['id']) {
          const translateValue = [];
          const translateId = translateData['mainsnak']['datavalue']['value']['id'].split('-')[0];
          const translateDetail = await getEntityDetail({ entityId: translateId });
          const translateLanguageId = translateDetail['entities'][translateId]['language'];
          const language = await getEntityDetail({ entityId: translateLanguageId });

          for (const translateLemmaKey in translateDetail['entities'][translateId]['lemmas']) {
            const translateLemma = translateDetail['entities'][translateId]['lemmas'][translateLemmaKey];
            translateValue.push(`${translateLemma.value} (${translateLemma.language})`);
          }

          translate.push({
            language: language['entities'][translateLanguageId]['labels'][Constant.LANGUAGE.ID.ISO]['value'],
            id: translateData['mainsnak']['datavalue']['value']['id'],
            value: translateValue.join(', '),
          });
        }
      }

      if (translate.length > 0) {
        lexemeResponse.statements.translation = {
          property: Constant.WIKIDATA_PROPERTY_CODE.TRANSLATION,
          data: translate,
        }
      }
    }

    return responseSuccess(res, lexemeResponse);
  } catch (err) {
    console.log(err);
    return responseError(res, err);
  }
}
