/* eslint-disable no-await-in-loop */
/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
import Constant from '../../../utils/constants';
import Status from '../../../utils/status';
import { Language, LanguageVariant, sequelize } from '../../../models';
import { responseError, responseSuccess } from '../../../utils/output';
import { getEntityDetail } from '../../../utils/wikidata'

export async function getLexemeDetail(req, res) {
  try {
    const { params, loggedInUser } = req;
    const { lexemeId } = params;

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
    const lexemeDetail = await getEntityDetail({ entityId: lexemeId, language: loggedInUser.languageCode, uselang: loggedInUser.languageCode });
    // const lexemeSense = lexemeDetail['entities'][lexemeId]['senses'].find(senseData => senseData['id'] === senseId);
    
    let lemma = '';
    if (lexemeDetail['entities'][lexemeId]['lemmas']) {
      // Extract the values from the object
      const lemmaValues = Object.values(lexemeDetail['entities'][lexemeId]['lemmas']).map(lemma => lemma.value);
      
      // Join the values with " / " separator
      lemma = lemmaValues.join(' / ');
    }

    const gloss = [];
    const lexemeResponse = {
      externalLexemeId: lexemeId,
      externalLanguageId: lexemeDetail['entities'][lexemeId]['language'],
      lemma,
      externalCategoryId: lexemeDetail['entities'][lexemeId]['lexicalCategory'],
      language,
      category: '',
      gloss: '',
      senses: [],
    };

    // get category value
    const lexemeCategoryId = lexemeDetail['entities'][lexemeId]['lexicalCategory'];
    const lexemeCategory = await getEntityDetail({ entityId: lexemeCategoryId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });
    lexemeResponse.category = lexemeCategory['entities'][lexemeCategoryId]['labels'][loggedInUser.displayLanguageCode] ? lexemeCategory['entities'][lexemeCategoryId]['labels'][loggedInUser.displayLanguageCode]['value'] :  '';

    for (const sense of lexemeDetail['entities'][lexemeId]['senses']) {
      const statements = {
        gloss: '',
        images: null,
        antonym: null,
        synonym: null,
        translation: null,
        locationOfSenseUsage: null,
        languageStyle: null,
        describedAtUrl: null,
      }

      // Set glosses
      if (sense['glosses']) {
        // Extract the values from the object
        const glossValues = Object.values(sense['glosses']).map(gloss => gloss.value);

        // Join all gloss
        gloss.push(glossValues);

        // Join the values with " / " separator
        statements.gloss = glossValues.join(', ');
      }

      // get images
      if (sense['claims'] && sense['claims'][Constant.WIKIDATA_PROPERTY_CODE.IMAGE]) {
        const images = [];
        for (const imageDetail of sense['claims'][Constant.WIKIDATA_PROPERTY_CODE.IMAGE]) {
          if (imageDetail['mainsnak']['datavalue']['value']) {
            images.push({
              value: imageDetail['mainsnak']['datavalue']['value'],
              url: `https://commons.wikimedia.org/wiki/Special:FilePath/${imageDetail['mainsnak']['datavalue']['value']}`,
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

      // get antonym
      if (sense['claims'] && sense['claims'][Constant.WIKIDATA_PROPERTY_CODE.ANTONYM]) {
        const antonym = [];
        for (const antonymData of sense['claims'][Constant.WIKIDATA_PROPERTY_CODE.ANTONYM]) {
          if (antonymData['mainsnak']['datavalue']['value']['id']) {
            let antonymString = ''
            const antonymId = antonymData['mainsnak']['datavalue']['value']['id'].split('-')[0];
            const antonymDetail = await getEntityDetail({ entityId: antonymId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });

            if (antonymDetail['entities'][antonymId]['lemmas']) {
              // Extract the values from the object
              const antonymValues = Object.values(antonymDetail['entities'][antonymId]['lemmas']).map(lemma => lemma.value);
              
              // Join the values with " / " separator
              antonymString = antonymValues.join(' / ');
            }

            antonym.push({
              id: antonymData['mainsnak']['datavalue']['value']['id'],
              value: antonymString,
            });
          }
        }

        if (antonym.length > 0) {
          statements.antonym = {
            property: Constant.WIKIDATA_PROPERTY_CODE.ANTONYM,
            data: antonym,
          }
        }
      }

      // get synonym
      if (sense['claims'] && sense['claims'][Constant.WIKIDATA_PROPERTY_CODE.SYNONYM]) {
        const synonym = [];
        for (const synonymData of sense['claims'][Constant.WIKIDATA_PROPERTY_CODE.SYNONYM]) {
          if (synonymData['mainsnak']['datavalue']['value']['id']) {
            let synonymString = '';
            const synonymId = synonymData['mainsnak']['datavalue']['value']['id'].split('-')[0];
            const synonymDetail = await getEntityDetail({ entityId: synonymId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });

            if (synonymDetail['entities'][synonymId]['lemmas']) {
              // Extract the values from the object
              const synonymValues = Object.values(synonymDetail['entities'][synonymId]['lemmas']).map(lemma => lemma.value);
              
              // Join the values with " / " separator
              synonymString = synonymValues.join(' / ');
            }

            synonym.push({
              id: synonymData['mainsnak']['datavalue']['value']['id'],
              value: synonymString,
            });
          }
        }

        if (synonym.length > 0) {
          statements.synonym = {
            property: Constant.WIKIDATA_PROPERTY_CODE.SYNONYM,
            data: synonym,
          }
        }
      }

      // get translate
      if (sense['claims'] && sense['claims'][Constant.WIKIDATA_PROPERTY_CODE.TRANSLATION]) {
        const translate = [];
        for (const translateData of sense['claims'][Constant.WIKIDATA_PROPERTY_CODE.TRANSLATION]) {
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
          statements.translation = {
            property: Constant.WIKIDATA_PROPERTY_CODE.TRANSLATION,
            data: translate,
          }
        }
      }

      // get location of sense usage
      if (sense['claims'] && sense['claims'][Constant.WIKIDATA_PROPERTY_CODE.LOCATION_OF_SENSE_USAGE]) {
        const locationOfSenseUsage = [];
        for (const locationOfSenseUsageData of sense['claims'][Constant.WIKIDATA_PROPERTY_CODE.LOCATION_OF_SENSE_USAGE]) {
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
          statements.locationOfSenseUsage = {
            property: Constant.WIKIDATA_PROPERTY_CODE.LOCATION_OF_SENSE_USAGE,
            data: locationOfSenseUsage,
          }
        }
      }

      // get language style
      if (sense['claims'] && sense['claims'][Constant.WIKIDATA_PROPERTY_CODE.LANGUAGE_STYLE]) {
        const languageStyle = [];
        for (const languageStyleData of sense['claims'][Constant.WIKIDATA_PROPERTY_CODE.LANGUAGE_STYLE]) {
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
          statements.languageStyle = {
            property: Constant.WIKIDATA_PROPERTY_CODE.LANGUAGE_STYLE,
            data: languageStyle,
          }
        }
      }

      // get descibed at url
      if (sense['claims'] && sense['claims'][Constant.WIKIDATA_PROPERTY_CODE.DESCRIBED_AT_URL]) {
        const describedAtUrl = [];
        for (const describedAtUrlDetail of sense['claims'][Constant.WIKIDATA_PROPERTY_CODE.DESCRIBED_AT_URL]) {
          if (describedAtUrlDetail['mainsnak']['datavalue']['value']) {
            describedAtUrl.push({
              value: describedAtUrlDetail['mainsnak']['datavalue']['value'],
            });
          }
        }

        if (describedAtUrl.length > 0) {
          statements.describedAtUrl = {
            property: Constant.WIKIDATA_PROPERTY_CODE.DESCRIBED_AT_URL,
            data: describedAtUrl,
          }
        }
      }

      lexemeResponse.senses.push(statements);
    }

    // Join array of gloss to string
    lexemeResponse.gloss = gloss.flat().join(', ');

    return responseSuccess(res, lexemeResponse);
  } catch (err) {
    console.log(err);
    return responseError(res, err);
  }
}

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
