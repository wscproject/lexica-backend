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

    // set sense number
    let senseNumber = 1;
    for (const sense of lexemeDetail['entities'][lexemeId]['senses']) {
      const statements = {
        externalLexemeSenseId: sense['id'],
        senseNumber,
        gloss: sense['glosses'][loggedInUser.languageCode] ? sense['glosses'][loggedInUser.languageCode]['value'] : '',
        otherGlosses: [],
        images: null,
        itemForThisSense: null,
        languageStyle: null,
        fieldOfUsage: null,
      }

      if (sense['glosses'][Constant.DISPLAY_LANGUAGE.EN.ISO]) {
        statements.otherGlosses.push({
          language: sense['glosses'][Constant.DISPLAY_LANGUAGE.EN.ISO]['language'],
          value: sense['glosses'][Constant.DISPLAY_LANGUAGE.EN.ISO]['value']
        });
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

      // get item for this sense
      if (sense['claims'] && sense['claims'][Constant.WIKIDATA_PROPERTY_CODE.ITEM_FOR_THIS_SENSE]) {
        const itemForThisSense = [];
        for (const itemForThisSenseData of sense['claims'][Constant.WIKIDATA_PROPERTY_CODE.ITEM_FOR_THIS_SENSE]) {
          if (itemForThisSenseData['mainsnak']['datavalue']['value']['id']) {
            const itemForThisSenseId = itemForThisSenseData['mainsnak']['datavalue']['value']['id'];
            const itemForThisSenseDetail = await getEntityDetail({ entityId: itemForThisSenseId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });

            itemForThisSense.push({
              id: itemForThisSenseData['mainsnak']['datavalue']['value']['id'],
              value: itemForThisSenseDetail['entities'][itemForThisSenseId]['labels'][loggedInUser.displayLanguageCode] ? itemForThisSenseDetail['entities'][itemForThisSenseId]['labels'][loggedInUser.displayLanguageCode]['value'] : '',
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

      // get field of usage
      if (sense['claims'] && sense['claims'][Constant.WIKIDATA_PROPERTY_CODE.FIELD_OF_USAGE]) {
        const fieldOfUsage = [];
        for (const fieldOfUsageData of sense['claims'][Constant.WIKIDATA_PROPERTY_CODE.FIELD_OF_USAGE]) {
          if (fieldOfUsageData['mainsnak']['datavalue']['value']['id']) {
            const fieldOfUsageId = fieldOfUsageData['mainsnak']['datavalue']['value']['id'];
            const fieldOfUsageDetail = await getEntityDetail({ entityId: fieldOfUsageId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });
  
            fieldOfUsage.push({
              id: fieldOfUsageData['mainsnak']['datavalue']['value']['id'],
              value: fieldOfUsageDetail['entities'][fieldOfUsageId]['labels'][loggedInUser.displayLanguageCode] ? fieldOfUsageDetail['entities'][fieldOfUsageId]['labels'][loggedInUser.displayLanguageCode]['value'] : '',
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
      hasCharacteristics: null,
      usageExamples: null,
      combinesLexemes: null,
      sense: null,
      otherSenses: [],
    };

    // get category value
    const lexemeCategoryId = lexemeDetail['entities'][lexemeId]['lexicalCategory'];
    const lexemeCategory = await getEntityDetail({ entityId: lexemeCategoryId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });
    lexemeResponse.category = lexemeCategory['entities'][lexemeCategoryId]['labels'][loggedInUser.displayLanguageCode] ? lexemeCategory['entities'][lexemeCategoryId]['labels'][loggedInUser.displayLanguageCode]['value'] :  '';

    // get has characteristics data
    if (lexemeDetail['entities'][lexemeId]['claims'] && lexemeDetail['entities'][lexemeId]['claims'][Constant.WIKIDATA_PROPERTY_CODE.HAS_CHARACTERISTICS]) {
      const hasCharacteristics = [];
      for (const hasCharacteristicsData of lexemeDetail['entities'][lexemeId]['claims'][Constant.WIKIDATA_PROPERTY_CODE.HAS_CHARACTERISTICS]) {
        if (hasCharacteristicsData['mainsnak']['datavalue']['value']['id']) {
          const hasCharacteristicsId = hasCharacteristicsData['mainsnak']['datavalue']['value']['id'];
          const hasCharacteristicsDetail = await getEntityDetail({ entityId: hasCharacteristicsId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });

          hasCharacteristics.push({
            id: hasCharacteristicsData['mainsnak']['datavalue']['value']['id'],
            value: hasCharacteristicsDetail['entities'][hasCharacteristicsId]['labels'][loggedInUser.displayLanguageCode] ? hasCharacteristicsDetail['entities'][hasCharacteristicsId]['labels'][loggedInUser.displayLanguageCode]['value'] : '',
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
    if (lexemeDetail['entities'][lexemeId]['claims'] && lexemeDetail['entities'][lexemeId]['claims'][Constant.WIKIDATA_PROPERTY_CODE.USAGE_EXAMPLE]) {
      const usageExamples = [];
      for (const usageExamplesData of lexemeDetail['entities'][lexemeId]['claims'][Constant.WIKIDATA_PROPERTY_CODE.USAGE_EXAMPLE]) {
        if (usageExamplesData['mainsnak']['datavalue']['value'] && usageExamplesData['qualifiers'] && usageExamplesData['qualifiers'][Constant.WIKIDATA_PROPERTY_CODE.SUBJECT_SENSE]) {

          if (usageExamplesData['qualifiers'][Constant.WIKIDATA_PROPERTY_CODE.SUBJECT_SENSE].some(qualifier => qualifier.datavalue?.value?.id === senseId)) {
            usageExamples.push({
              value: usageExamplesData['mainsnak']['datavalue']['value']['text'],
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
    if (lexemeDetail['entities'][lexemeId]['claims'] && lexemeDetail['entities'][lexemeId]['claims'][Constant.WIKIDATA_PROPERTY_CODE.COMBINES_LEXEMES]) {
      const combinesLexemes = [];
      for (const combinesLexemesData of lexemeDetail['entities'][lexemeId]['claims'][Constant.WIKIDATA_PROPERTY_CODE.COMBINES_LEXEMES]) {
        if (combinesLexemesData['mainsnak']['datavalue']['value']['id']) {
          const combinesLexemesId = combinesLexemesData['mainsnak']['datavalue']['value']['id'];
          const combinesLexemesDetail = await getEntityDetail({ entityId: combinesLexemesId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });

          let combineLexemeLemma = '';
          if (combinesLexemesDetail['entities'][combinesLexemesId]['lemmas']) {
            const combineLexemeLemmaValues = Object.values(combinesLexemesDetail['entities'][combinesLexemesId]['lemmas']).map(lemma => lemma.value);
            combineLexemeLemma = combineLexemeLemmaValues.join(' / ');
          }

          combinesLexemes.push({
            id: combinesLexemesData['mainsnak']['datavalue']['value']['id'],
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
    for (const lexemeSense of lexemeDetail['entities'][lexemeId]['senses']) {
      // get gloss in user contribution language
      const gloss = lexemeSense['glosses'] && lexemeSense['glosses'][loggedInUser.languageCode] ? lexemeSense['glosses'][loggedInUser.languageCode]['value'] : '';

      // get images
      let images = null;
      if (lexemeSense['claims'] && lexemeSense['claims'][Constant.WIKIDATA_PROPERTY_CODE.IMAGE]) {
        const tempImages = [];
        for (const imageDetail of lexemeSense['claims'][Constant.WIKIDATA_PROPERTY_CODE.IMAGE]) {
          if (imageDetail['mainsnak']['datavalue']['value']) {
            tempImages.push({
              value: imageDetail['mainsnak']['datavalue']['value'],
              url: `https://commons.wikimedia.org/wiki/Special:FilePath/${imageDetail['mainsnak']['datavalue']['value']}`,
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

      if (lexemeSense['id'] === senseId) {
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
        for (const [key, value] of Object.entries(lexemeSense['glosses'])) {
          if (key !== loggedInUser.languageCode) {
            lexemeResponse.sense.otherGlosses.push({
              language: value.language,
              value: value.value
            });
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
            lexemeResponse.sense.languageStyle = {
              property: Constant.WIKIDATA_PROPERTY_CODE.LANGUAGE_STYLE,
              data: languageStyle,
            }
          }
        }

        // get field of usage
        if (lexemeSense['claims'] && lexemeSense['claims'][Constant.WIKIDATA_PROPERTY_CODE.FIELD_OF_USAGE]) {
          const fieldOfUsage = [];
          for (const fieldOfUsageData of lexemeSense['claims'][Constant.WIKIDATA_PROPERTY_CODE.FIELD_OF_USAGE]) {
            if (fieldOfUsageData['mainsnak']['datavalue']['value']['id']) {
              const fieldOfUsageId = fieldOfUsageData['mainsnak']['datavalue']['value']['id'];
              const fieldOfUsageDetail = await getEntityDetail({ entityId: fieldOfUsageId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });
    
              fieldOfUsage.push({
                id: fieldOfUsageData['mainsnak']['datavalue']['value']['id'],
                value: fieldOfUsageDetail['entities'][fieldOfUsageId]['labels'][loggedInUser.displayLanguageCode] ? fieldOfUsageDetail['entities'][fieldOfUsageId]['labels'][loggedInUser.displayLanguageCode]['value'] : '',
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
            lexemeResponse.sense.locationOfSenseUsage = {
              property: Constant.WIKIDATA_PROPERTY_CODE.LOCATION_OF_SENSE_USAGE,
              data: locationOfSenseUsage,
            }
          }
        }

        // get semantic gender
        if (lexemeSense['claims'] && lexemeSense['claims'][Constant.WIKIDATA_PROPERTY_CODE.SEMANTIC_GENDER]) {
          const semanticGender = [];
          for (const semanticGenderData of lexemeSense['claims'][Constant.WIKIDATA_PROPERTY_CODE.SEMANTIC_GENDER]) {
            if (semanticGenderData['mainsnak']['datavalue']['value']['id']) {
              const semanticGenderId = semanticGenderData['mainsnak']['datavalue']['value']['id'];
              const semanticGenderDetail = await getEntityDetail({ entityId: semanticGenderId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });
    
              semanticGender.push({
                id: semanticGenderData['mainsnak']['datavalue']['value']['id'],
                value: semanticGenderDetail['entities'][semanticGenderId]['labels'][loggedInUser.displayLanguageCode] ? semanticGenderDetail['entities'][semanticGenderId]['labels'][loggedInUser.displayLanguageCode]['value'] : '',
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
            lexemeResponse.sense.antonym = {
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
            lexemeResponse.sense.synonym = {
              property: Constant.WIKIDATA_PROPERTY_CODE.SYNONYM,
              data: synonym,
            }
          }
        }

        // get gloss quote
        if (lexemeSense['claims'] && lexemeSense['claims'][Constant.WIKIDATA_PROPERTY_CODE.GLOSS_QUOTE]) {
          const glossQuotes = [];
          for (const glossQuoteDetail of lexemeSense['claims'][Constant.WIKIDATA_PROPERTY_CODE.GLOSS_QUOTE]) {
            if (glossQuoteDetail['mainsnak']['datavalue']['value']) {
              glossQuotes.push({
                language: glossQuoteDetail['mainsnak']['datavalue']['value']['language'],
                value: glossQuoteDetail['mainsnak']['datavalue']['value']['text'],
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
          externalLexemeSenseId: lexemeSense['id'],
          senseNumber,
          gloss,
          otherGlosses: [],
          images,
          itemForThisSense: null,
        };

        if (lexemeSense['glosses'][Constant.DISPLAY_LANGUAGE.EN.ISO] && loggedInUser.languageCode !== Constant.DISPLAY_LANGUAGE.EN.ISO) {
          otherSense.otherGlosses.push({
            language: lexemeSense['glosses'][Constant.DISPLAY_LANGUAGE.EN.ISO]['language'],
            value: lexemeSense['glosses'][Constant.DISPLAY_LANGUAGE.EN.ISO]['value']
          });
        }
  
        if (lexemeSense['claims'] && lexemeSense['claims'][Constant.WIKIDATA_PROPERTY_CODE.ITEM_FOR_THIS_SENSE]) {
          const itemForThisSense = [];
          for (const itemForThisSenseData of lexemeSense['claims'][Constant.WIKIDATA_PROPERTY_CODE.ITEM_FOR_THIS_SENSE]) {
            if (itemForThisSenseData['mainsnak']['datavalue']['value']['id']) {
              const itemForThisSenseId = itemForThisSenseData['mainsnak']['datavalue']['value']['id'];
              const itemForThisSenseDetail = await getEntityDetail({ entityId: itemForThisSenseId, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });
  
              itemForThisSense.push({
                id: itemForThisSenseData['mainsnak']['datavalue']['value']['id'],
                value: itemForThisSenseDetail['entities'][itemForThisSenseId]['labels'][loggedInUser.displayLanguageCode] ? itemForThisSenseDetail['entities'][itemForThisSenseId]['labels'][loggedInUser.displayLanguageCode]['value'] : '',
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

    return responseSuccess(res, lexemeResponse);
  } catch (err) {
    console.log(err);
    return responseError(res, err);
  }
}
