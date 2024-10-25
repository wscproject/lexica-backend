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
    const lexemeDetail = await getEntityDetail({ entityId: lexemeId, language: loggedInUser.languageCode, uselang: loggedInUser.languageCode });
    const lexemeSense = lexemeDetail['entities'][lexemeId]['senses'].find(senseData => senseData['id'] === senseId);
    
    let lemma = '';
    if (lexemeDetail['entities'][lexemeId]['lemmas']) {
      // Extract the values from the object
      const lemmaValues = Object.values(lexemeDetail['entities'][lexemeId]['lemmas']).map(lemma => lemma.value);
      
      // Join the values with " / " separator
      lemma = lemmaValues.join(' / ');
    }

    const lexemeResponse = {
      externalLexemeId: lexemeId,
      externalLexemeSenseId: senseId,
      lemma,
      externalCategoryId: lexemeDetail['entities'][lexemeId]['lexicalCategory'],
      category: "",
      externalLanguageId: lexemeDetail['entities'][lexemeId]['language'],
      gloss: lexemeSense['glosses'] && lexemeSense['glosses'][loggedInUser.languageCode] ? lexemeSense['glosses'][loggedInUser.languageCode]['value'] : '',
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
    const lexemeCategory = await getEntityDetail({ entityId: lexemeCategoryId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });
    lexemeResponse.category = lexemeCategory['entities'][lexemeCategoryId]['labels'][loggedInUser.displayLanguageCode] ? lexemeCategory['entities'][lexemeCategoryId]['labels'][loggedInUser.displayLanguageCode]['value'] :  '';

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
          const antonymDetail = await getEntityDetail({ entityId: antonymId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });

          antonym.push({
            id: antonymData['mainsnak']['datavalue']['value']['id'],
            value: antonymDetail['entities'][antonymId]['lemmas'][loggedInUser.languageCode] ? antonymDetail['entities'][antonymId]['lemmas'][loggedInUser.languageCode]['value'] : '',
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
          const synonymDetail = await getEntityDetail({ entityId: synonymId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });

          synonym.push({
            id: synonymData['mainsnak']['datavalue']['value']['id'],
            value: synonymDetail['entities'][synonymId]['lemmas'][loggedInUser.languageCode] ? synonymDetail['entities'][synonymId]['lemmas'][loggedInUser.languageCode]['value'] : '',
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
          const translateDetail = await getEntityDetail({ entityId: translateId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });
          const translateLanguageId = translateDetail['entities'][translateId]['language'];
          const language = await getEntityDetail({ entityId: translateLanguageId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });

          for (const translateLemmaKey in translateDetail['entities'][translateId]['lemmas']) {
            const translateLemma = translateDetail['entities'][translateId]['lemmas'][translateLemmaKey];
            translateValue.push(`${translateLemma.value}`);
            translateLanguageCode.push(translateLemma.language); 
          }

          translate.push({
            language: language['entities'][translateLanguageId]['labels'][loggedInUser.displayLanguageCode] ? language['entities'][translateLanguageId]['labels'][loggedInUser.displayLanguageCode]['value'] : '',
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
          const locationOfSenseUsageDetail = await getEntityDetail({ entityId: locationOfSenseUsageId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });

          locationOfSenseUsage.push({
            id: locationOfSenseUsageData['mainsnak']['datavalue']['value']['id'],
            value: locationOfSenseUsageDetail['entities'][locationOfSenseUsageId]['labels'][loggedInUser.displayLanguageCode] ? locationOfSenseUsageDetail['entities'][locationOfSenseUsageId]['labels'][loggedInUser.displayLanguageCode]['value'] : '',
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
          const languageStyleDetail = await getEntityDetail({ entityId: languageStyleId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });

          languageStyle.push({
            id: languageStyleData['mainsnak']['datavalue']['value']['id'],
            value: languageStyleDetail['entities'][languageStyleId]['labels'][loggedInUser.displayLanguageCode] ? languageStyleDetail['entities'][languageStyleId]['labels'][loggedInUser.displayLanguageCode]['value'] : '',
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
