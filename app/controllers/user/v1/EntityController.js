/* eslint-disable no-await-in-loop */
/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
import Constant from '../../../utils/constants';
import { responseError, responseSuccess } from '../../../utils/output';
import { searchEntities, getEntityDetail, searchRecommendationEntities} from '../../../utils/wikidata';

export async function getEntities(req, res) {
  try {
    const { loggedInUser } = req;
    let { limit, page, search } = req.query;

    limit = limit ? Number(limit) : Constant.PAGINATION.LIMIT;
    page = page ? Number(page) : Constant.PAGINATION.PAGE;
    const offset = (page - 1) * limit;

    // search entities
    const entityResponse = [];
    const entities = await searchEntities({ search, limit, offset, language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });

    if (entities.search && entities.search.length > 0) {
      const entityIds = entities.search.map(entity => entity.id).join('|');
      const entityDetails = await getEntityDetail({ entityId: entityIds, props: 'claims', language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });

      for (const entity of entities.search) {
        const temporaryEntity = {
          id: entity.id,
          label: entity.display.label.value,
          description: entity.display.description ? entity.display.description.value : '',
          image: entityDetails['entities'][entity.id]['claims'][Constant.WIKIDATA_PROPERTY_CODE.IMAGE] ? `https://commons.wikimedia.org/wiki/Special:FilePath/${entityDetails['entities'][entity.id]['claims'][Constant.WIKIDATA_PROPERTY_CODE.IMAGE][0]['mainsnak']['datavalue']['value']}` : '',
          language: loggedInUser.languageCode,
        }
  
        entityResponse.push(temporaryEntity);
      }
    }

    const response = {
      entities: entityResponse,
      metadata: {
        limit,
        currentPage: page,
      },
    };

    return responseSuccess(res, response);
  } catch (err) {
    console.log(err);
    return responseError(res, err);
  }
}

export async function getEntity(req, res) {
  try {
    const { loggedInUser } = req;
    const { entityId } = req.params;

    // get entitiy
    const entity = await getEntityDetail({ entityId, props: 'labels|claims|descriptions', language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });
    const entityResponse = {
      id: entityId,
      label: entity['entities'][entityId]['labels'][loggedInUser.displayLanguageCode] ? entity['entities'][entityId]['labels'][loggedInUser.displayLanguageCode]['value'] : '',
      description: entity['entities'][entityId]['descriptions'][loggedInUser.displayLanguageCode] ? entity['entities'][entityId]['descriptions'][loggedInUser.displayLanguageCode]['value'] : '',
      statements: {
        instanceOf: null,
        subclass: null,
        partOf: null,
        images: null,
        // follows: null,
        // textAudio:null,
        taxonName: null,
        hasParts: null,
      }
    };

    // get images
    if (entity['entities'][entityId]['claims'] && entity['entities'][entityId]['claims'][Constant.WIKIDATA_PROPERTY_CODE.IMAGE]) {
      const images = [];
      for (const imageDetail of entity['entities'][entityId]['claims'][Constant.WIKIDATA_PROPERTY_CODE.IMAGE]) {
        if (imageDetail['mainsnak']['datavalue']['value']) {
          images.push({
            value: imageDetail['mainsnak']['datavalue']['value'],
            url: `https://commons.wikimedia.org/wiki/Special:FilePath/${imageDetail['mainsnak']['datavalue']['value']}`,
          });
        }
      }

      if (images.length > 0) {
        entityResponse.statements.images = {
          property: Constant.WIKIDATA_PROPERTY_CODE.IMAGE,
          data: images,
        };
      }
    }

    // get instance of
    if (entity['entities'][entityId]['claims'] && entity['entities'][entityId]['claims'][Constant.WIKIDATA_PROPERTY_CODE.INSTANCE_OF]) {
      const instanceOf = [];
      for (const instanceOfData of entity['entities'][entityId]['claims'][Constant.WIKIDATA_PROPERTY_CODE.INSTANCE_OF]) {
        if (instanceOfData['mainsnak']['datavalue']['value']['id']) {
          const instanceOfId = instanceOfData['mainsnak']['datavalue']['value']['id'];
          const instanceOfDetail = await getEntityDetail({ entityId: instanceOfId, props: 'labels', language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });

          instanceOf.push({
            id: instanceOfId,
            value: instanceOfDetail['entities'][instanceOfId]['labels'][loggedInUser.displayLanguageCode] ? instanceOfDetail['entities'][instanceOfId]['labels'][loggedInUser.displayLanguageCode]['value'] : '',
          });
        }
      }

      if (instanceOf.length > 0) {
        entityResponse.statements.instanceOf = {
          property: Constant.WIKIDATA_PROPERTY_CODE.INSTANCE_OF,
          data: instanceOf,
        };
      }
    }

    // get subclass
    if (entity['entities'][entityId]['claims'] && entity['entities'][entityId]['claims'][Constant.WIKIDATA_PROPERTY_CODE.SUBCLASS]) {
      const subclass = [];
      for (const subclassData of entity['entities'][entityId]['claims'][Constant.WIKIDATA_PROPERTY_CODE.SUBCLASS]) {
        if (subclassData['mainsnak']['datavalue']['value']['id']) {
          const subclassId = subclassData['mainsnak']['datavalue']['value']['id'];
          const subclassDetail = await getEntityDetail({ entityId: subclassId, props: 'labels', language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });

          subclass.push({
            id: subclassId,
            value: subclassDetail['entities'][subclassId]['labels'][loggedInUser.displayLanguageCode] ? subclassDetail['entities'][subclassId]['labels'][loggedInUser.displayLanguageCode]['value'] : '',
          });
        }
      }

      if (subclass.length > 0) {
        entityResponse.statements.subclass = {
          property: Constant.WIKIDATA_PROPERTY_CODE.SUBCLASS,
          data: subclass,
        };
      }
    }

    // get part of
    if (entity['entities'][entityId]['claims'] && entity['entities'][entityId]['claims'][Constant.WIKIDATA_PROPERTY_CODE.PART_OF]) {
      const partOf = [];
      for (const partOfData of entity['entities'][entityId]['claims'][Constant.WIKIDATA_PROPERTY_CODE.PART_OF]) {
        if (partOfData['mainsnak']['datavalue']['value']['id']) {
          const partOfId = partOfData['mainsnak']['datavalue']['value']['id'];
          const partOfDetail = await getEntityDetail({ entityId: partOfId, props: 'labels', language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });

          partOf.push({
            id: partOfId,
            value: partOfDetail['entities'][partOfId]['labels'][loggedInUser.displayLanguageCode] ? partOfDetail['entities'][partOfId]['labels'][loggedInUser.displayLanguageCode]['value'] : '',
          });
        }
      }

      if (partOf.length > 0) {
        entityResponse.statements.partOf = {
          property: Constant.WIKIDATA_PROPERTY_CODE.PART_OF,
          data: partOf,
        };
      }
    }

    // get taxon name
    if (entity['entities'][entityId]['claims'] && entity['entities'][entityId]['claims'][Constant.WIKIDATA_PROPERTY_CODE.TAXON_NAME]) {
      const taxonName = [];
      for (const taxonNameData of entity['entities'][entityId]['claims'][Constant.WIKIDATA_PROPERTY_CODE.TAXON_NAME]) {
        if (taxonNameData['mainsnak']['datavalue']['value']['id']) {
          const taxonNameId = taxonNameData['mainsnak']['datavalue']['value']['id'];
          const taxonNameDetail = await getEntityDetail({ entityId: taxonNameId, props: 'labels', language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });

          taxonName.push({
            id: taxonNameId,
            value: taxonNameDetail['entities'][taxonNameId]['labels'][loggedInUser.displayLanguageCode] ? taxonNameDetail['entities'][taxonNameId]['labels'][loggedInUser.displayLanguageCode]['value'] : '',
          });
        }
      }

      if (taxonName.length > 0) {
        entityResponse.statements.taxonName = {
          property: Constant.WIKIDATA_PROPERTY_CODE.TAXON_NAME,
          data: taxonName,
        };
      }
    }

    // get has parts
    if (entity['entities'][entityId]['claims'] && entity['entities'][entityId]['claims'][Constant.WIKIDATA_PROPERTY_CODE.HAS_PARTS]) {
      const hasParts = [];
      for (const hasPartData of entity['entities'][entityId]['claims'][Constant.WIKIDATA_PROPERTY_CODE.HAS_PARTS]) {
        if (hasPartData['mainsnak']['datavalue']['value']['id']) {
          const hasPartId = hasPartData['mainsnak']['datavalue']['value']['id'];
          const hasPartDetail = await getEntityDetail({ entityId: hasPartId, props: 'labels', language: loggedInUser.displayLanguageCode, uselang: loggedInUser.languageCode });

          hasParts.push({
            id: hasPartId,
            value: hasPartDetail['entities'][hasPartId]['labels'][loggedInUser.displayLanguageCode] ? hasPartDetail['entities'][hasPartId]['labels'][loggedInUser.displayLanguageCode]['value'] : '',
          });
        }
      }

      if (hasParts.length > 0) {
        entityResponse.statements.hasParts = {
          property: Constant.WIKIDATA_PROPERTY_CODE.HAS_PARTS,
          data: hasParts,
        };
      }
    }

    // get follows
    // if (entity['entities'][entityId]['claims'] && entity['entities'][entityId]['claims'][Constant.WIKIDATA_PROPERTY_CODE.FOLLOWS]) {
    //   const follows = [];
    //   for (const followsData of entity['entities'][entityId]['claims'][Constant.WIKIDATA_PROPERTY_CODE.FOLLOWS]) {
    //     if (followsData['mainsnak']['datavalue']['value']['id']) {
    //       const followsId = followsData['mainsnak']['datavalue']['value']['id'];
    //       const followsDetail = await getEntityDetail({ entityId: followsId, props: 'labels' });

    //       follows.push({
    //         id: followsId,
    //         value: followsDetail['entities'][followsId]['labels'][loggedInUser.displayLanguage] ? followsDetail['entities'][followsId]['labels'][loggedInUser.displayLanguage]['value'] : '',
    //       });
    //     }
    //   }

    //   if (follows.length > 0) {
    //     entityResponse.statements.follows = {
    //       property: Constant.WIKIDATA_PROPERTY_CODE.FOLLOWS,
    //       data: follows,
    //     };
    //   }
    // }

    // get text audio
    // if (entity['entities'][entityId]['claims'] && entity['entities'][entityId]['claims'][Constant.WIKIDATA_PROPERTY_CODE.TEXT_AUDIO]) {
    //   const textAudio = [];
    //   for (const textAudioData of entity['entities'][entityId]['claims'][Constant.WIKIDATA_PROPERTY_CODE.TEXT_AUDIO]) {
    //     if (textAudioData['mainsnak']['datavalue']['value']) {
    //       textAudio.push({
    //         value: textAudioData['mainsnak']['datavalue']['value'],
    //         url: `https://commons.wikimedia.org/wiki/Special:FilePath/${textAudioData['mainsnak']['datavalue']['value']}`,
    //       });
    //     }
    //   }

    //   if (textAudio.length > 0) {
    //     entityResponse.statements.textAudio = {
    //       property: Constant.WIKIDATA_PROPERTY_CODE.TEXT_AUDIO,
    //       data: textAudio,
    //     };
    //   }
    // }

    return responseSuccess(res, entityResponse);
  } catch (err) {
    console.log(err);
    return responseError(res, err);
  }
}

export async function getRecommendations(req, res) {
  try {
    const { loggedInUser } = req;
    let { limit, page, search } = req.query;

    limit = limit ? Number(limit) : Constant.PAGINATION.LIMIT;
    page = page ? Number(page) : Constant.PAGINATION.PAGE;
    const offset = (page - 1) * limit;

    // search entities
    const entityResponse = [];
    const entities = await searchRecommendationEntities({ search, limit, offset, language: loggedInUser.languageCode });

    if (entities?.query?.pages) {
      for (const entity of entities.query.pages) {
        const temporaryEntity = {
          id: entity.title,
          label: entity.entityterms?.label?.[0] ||
          entity.cirrusdoc?.[0]?.source?.labels?.[Constant.DISPLAY_LANGUAGE.EN.ISO]?.[0] ||
          '',
          description: entity.entityterms?.description?.[0] ||
          entity.cirrusdoc?.[0]?.source?.descriptions?.[Constant.DISPLAY_LANGUAGE.EN.ISO]?.[0] ||
          '',
          image: entity.images?.[0]?.title?.replace("File:", "https://commons.wikimedia.org/wiki/Special:FilePath/") || '',
          language: loggedInUser.languageCode,
        }
  
        entityResponse.push(temporaryEntity);
      }
    }

    const response = {
      entities: entityResponse,
      metadata: {
        limit,
        currentPage: page,
      },
    };

    return responseSuccess(res, response);
  } catch (err) {
    console.log(err);
    return responseError(res, err);
  }
}