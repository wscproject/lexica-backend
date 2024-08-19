/* eslint-disable no-await-in-loop */
/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
import Constant from '../../../utils/constants';
import { responseError, responseSuccess } from '../../../utils/output';
import { getEntityDetail } from '../../../utils/wikidata'

export async function getLexemeSenseDetail(req, res) {
  try {
    const { params, loggedInUser } = req;
    const { senseId } = params;
    const lexemeId = senseId.split("-")[0];

    // get ongoing contribution
    const lexemeDetail = await getEntityDetail({ entityId: lexemeId, language: loggedInUser.displayLanguage, uselang: loggedInUser.language });
    const lexemeSense = lexemeDetail['entities'][lexemeId]['senses'].find(senseData => senseData['id'] === senseId);
    const lexemeResponse = {
      lexemeId,
      lexemeSenseId: senseId,
      lemma: lexemeDetail['entities'][lexemeId]['lemmas'][loggedInUser.language] ? lexemeDetail['entities'][lexemeId]['lemmas'][loggedInUser.language]['value'] : '',
      categoryId: lexemeDetail['entities'][lexemeId]['lexicalCategory'],
      category: "",
      languageId: lexemeDetail['entities'][lexemeId]['language'],
      gloss: lexemeSense['glosses'] && lexemeSense['glosses'][loggedInUser.displayLanguage] ? lexemeSense['glosses'][loggedInUser.displayLanguage]['value'] : '',
      statements: {
        images: null,
        antonym: null,
        synonym: null,
        translation: null,
        locationOfSenseUsage: null,
        languageStyle: null,
        describedAtUrl: null,
      }
    };

    // get category value
    const lexemeCategoryId = lexemeDetail['entities'][lexemeId]['lexicalCategory'];
    const lexemeCategory = await getEntityDetail({ entityId: lexemeCategoryId, language: loggedInUser.displayLanguage, uselang: loggedInUser.language });
    lexemeResponse.category = lexemeCategory['entities'][lexemeCategoryId]['labels'][loggedInUser.displayLanguage] ? lexemeCategory['entities'][lexemeCategoryId]['labels'][loggedInUser.displayLanguage]['value'] :  '';

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
          const antonymDetail = await getEntityDetail({ entityId: antonymId, language: loggedInUser.displayLanguage, uselang: loggedInUser.language });

          antonym.push({
            id: antonymData['mainsnak']['datavalue']['value']['id'],
            value: antonymDetail['entities'][antonymId]['lemmas'][loggedInUser.language] ? antonymDetail['entities'][antonymId]['lemmas'][loggedInUser.language]['value'] : '',
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

    // get synonym
    if (lexemeSense['claims'] && lexemeSense['claims'][Constant.WIKIDATA_PROPERTY_CODE.SYNONYM]) {
      const synonym = [];
      for (const synonymData of lexemeSense['claims'][Constant.WIKIDATA_PROPERTY_CODE.SYNONYM]) {
        if (synonymData['mainsnak']['datavalue']['value']['id']) {
          const synonymId = synonymData['mainsnak']['datavalue']['value']['id'].split('-')[0];
          const synonymDetail = await getEntityDetail({ entityId: synonymId, language: loggedInUser.displayLanguage, uselang: loggedInUser.language });

          synonym.push({
            id: synonymData['mainsnak']['datavalue']['value']['id'],
            value: synonymDetail['entities'][synonymId]['lemmas'][loggedInUser.language] ? synonymDetail['entities'][synonymId]['lemmas'][loggedInUser.language]['value'] : '',
          });
        }
      }

      if (synonym.length > 0) {
        lexemeResponse.statements.synonym = {
          property: Constant.WIKIDATA_PROPERTY_CODE.SYNONYM,
          data: synonym,
        }
      }
    }

    // get translate
    if (lexemeSense['claims'] && lexemeSense['claims'][Constant.WIKIDATA_PROPERTY_CODE.TRANSLATION]) {
      const translate = [];
      for (const translateData of lexemeSense['claims'][Constant.WIKIDATA_PROPERTY_CODE.TRANSLATION]) {
        if (translateData['mainsnak']['datavalue']['value']['id']) {
          const translateValue = [];
          const translateLanguageCode = [];
          const translateId = translateData['mainsnak']['datavalue']['value']['id'].split('-')[0];
          const translateDetail = await getEntityDetail({ entityId: translateId, language: loggedInUser.displayLanguage, uselang: loggedInUser.language });
          const translateLanguageId = translateDetail['entities'][translateId]['language'];
          const language = await getEntityDetail({ entityId: translateLanguageId, language: loggedInUser.displayLanguage, uselang: loggedInUser.language });

          for (const translateLemmaKey in translateDetail['entities'][translateId]['lemmas']) {
            const translateLemma = translateDetail['entities'][translateId]['lemmas'][translateLemmaKey];
            translateValue.push(`${translateLemma.value}`);
            translateLanguageCode.push(translateLemma.language); 
          }

          translate.push({
            language: language['entities'][translateLanguageId]['labels'][loggedInUser.displayLanguage] ? language['entities'][translateLanguageId]['labels'][loggedInUser.displayLanguage]['value'] : '',
            code: translateLanguageCode.length > 0 ? translateLanguageCode.join(', ') : null,
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

    // get location of sense usage
    if (lexemeSense['claims'] && lexemeSense['claims'][Constant.WIKIDATA_PROPERTY_CODE.LOCATION_OF_SENSE_USAGE]) {
      const locationOfSenseUsage = [];
      for (const locationOfSenseUsageData of lexemeSense['claims'][Constant.WIKIDATA_PROPERTY_CODE.LOCATION_OF_SENSE_USAGE]) {
        if (locationOfSenseUsageData['mainsnak']['datavalue']['value']['id']) {
          const locationOfSenseUsageId = locationOfSenseUsageData['mainsnak']['datavalue']['value']['id'];
          const locationOfSenseUsageDetail = await getEntityDetail({ entityId: locationOfSenseUsageId, language: loggedInUser.displayLanguage, uselang: loggedInUser.language });

          locationOfSenseUsage.push({
            id: locationOfSenseUsageData['mainsnak']['datavalue']['value']['id'],
            value: locationOfSenseUsageDetail['entities'][locationOfSenseUsageId]['labels'][loggedInUser.displayLanguage] ? locationOfSenseUsageDetail['entities'][locationOfSenseUsageId]['labels'][loggedInUser.displayLanguage]['value'] : '',
          });
        }
      }

      if (locationOfSenseUsage.length > 0) {
        lexemeResponse.statements.locationOfSenseUsage = {
          property: Constant.WIKIDATA_PROPERTY_CODE.LOCATION_OF_SENSE_USAGE,
          data: locationOfSenseUsage,
        }
      }
    }

    // get language style
    if (lexemeSense['claims'] && lexemeSense['claims'][Constant.WIKIDATA_PROPERTY_CODE.LANGUAGE_STYLE]) {
      const languageStyle = [];
      for (const languageStyleData of lexemeSense['claims'][Constant.WIKIDATA_PROPERTY_CODE.LANGUAGE_STYLE]) {
        if (languageStyleData['mainsnak']['datavalue']['value']['id']) {
          const languageStyleId = languageStyleData['mainsnak']['datavalue']['value']['id'];
          const languageStyleDetail = await getEntityDetail({ entityId: languageStyleId, language: loggedInUser.displayLanguage, uselang: loggedInUser.language });

          languageStyle.push({
            id: languageStyleData['mainsnak']['datavalue']['value']['id'],
            value: languageStyleDetail['entities'][languageStyleId]['labels'][loggedInUser.displayLanguage] ? languageStyleDetail['entities'][languageStyleId]['labels'][loggedInUser.displayLanguage]['value'] : '',
          });
        }
      }

      if (languageStyle.length > 0) {
        lexemeResponse.statements.languageStyle = {
          property: Constant.WIKIDATA_PROPERTY_CODE.LANGUAGE_STYLE,
          data: languageStyle,
        }
      }
    }

    // get descibed at url
    if (lexemeSense['claims'] && lexemeSense['claims'][Constant.WIKIDATA_PROPERTY_CODE.DESCRIBED_AT_URL]) {
      const describedAtUrl = [];
      for (const describedAtUrlDetail of lexemeSense['claims'][Constant.WIKIDATA_PROPERTY_CODE.DESCRIBED_AT_URL]) {
        if (describedAtUrlDetail['mainsnak']['datavalue']['value']) {
          describedAtUrl.push({
            value: describedAtUrlDetail['mainsnak']['datavalue']['value'],
          });
        }
      }

      if (describedAtUrl.length > 0) {
        lexemeResponse.statements.describedAtUrl = {
          property: Constant.WIKIDATA_PROPERTY_CODE.DESCRIBED_AT_URL,
          data: describedAtUrl,
        }
      }
    }

    return responseSuccess(res, lexemeResponse);
  } catch (err) {
    console.log(err);
    return responseError(res, err);
  }
}
