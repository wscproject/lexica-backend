/* eslint-disable no-await-in-loop */
/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
import Constant from '../../../utils/constants';
import { responseError, responseSuccess } from '../../../utils/output';
import { searchEntities, getEntityDetail} from '../../../utils/wikidata';

export async function getEntities(req, res) {
  try {
    let { limit, page, search } = req.query;

    limit = limit ? Number(limit) : Constant.PAGINATION.LIMIT;
    page = page ? Number(page) : Constant.PAGINATION.PAGE;
    const offset = (page - 1) * limit;

    // search entities
    const entityResponse = [];
    const entities = await searchEntities({ search, limit, offset });

    if (entities.search) {
      for (const entity of entities.search) {
        const temporaryEntity = {
          id: entity.id,
          label: entity.display.label.value,
          description: entity.display.description ? entity.display.description.value : '',
          image: null,
        }
  
        const entityDetail = await getEntityDetail({ entityId: entity.id, props: 'claims' });
        if (entityDetail['entities'][entity.id]['claims'] && entityDetail['entities'][entity.id]['claims'][Constant.WIKIDATA_PROPERTY_CODE.IMAGE]) {
          temporaryEntity.image = `https://commons.wikimedia.org/wiki/Special:FilePath/${entityDetail['entities'][entity.id]['claims'][Constant.WIKIDATA_PROPERTY_CODE.IMAGE][0]['mainsnak']['datavalue']['value']}`;
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
    const { entityId } = req.params;

    // get entitiy
    const entity = await getEntityDetail({ entityId, props: 'labels|claims|descriptions' });
    const entityResponse = {
      id: entityId,
      label: entity['entities'][entityId]['labels'][Constant.LANGUAGE.ID.ISO] ? entity['entities'][entityId]['labels'][Constant.LANGUAGE.ID.ISO]['value'] : '',
      description: entity['entities'][entityId]['descriptions'][Constant.LANGUAGE.ID.ISO] ? entity['entities'][entityId]['descriptions'][Constant.LANGUAGE.ID.ISO]['value'] : '',
      statements: {
        instanceOf: null,
        subclass: null,
        partOf: null,
        images: null,
        follows: null,
        textAudio:null,
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
          const instanceOfDetail = await getEntityDetail({ entityId: instanceOfId, props: 'labels' });

          instanceOf.push({
            id: instanceOfId,
            value: instanceOfDetail['entities'][instanceOfId]['labels'][Constant.LANGUAGE.ID.ISO] ? instanceOfDetail['entities'][instanceOfId]['labels'][Constant.LANGUAGE.ID.ISO]['value'] : '',
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
          const subclassDetail = await getEntityDetail({ entityId: subclassId, props: 'labels' });

          subclass.push({
            id: subclassId,
            value: subclassDetail['entities'][subclassId]['labels'][Constant.LANGUAGE.ID.ISO] ? subclassDetail['entities'][subclassId]['labels'][Constant.LANGUAGE.ID.ISO]['value'] : '',
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
          const partOfDetail = await getEntityDetail({ entityId: partOfId, props: 'labels' });

          partOf.push({
            id: partOfId,
            value: partOfDetail['entities'][partOfId]['labels'][Constant.LANGUAGE.ID.ISO] ? partOfDetail['entities'][partOfId]['labels'][Constant.LANGUAGE.ID.ISO]['value'] : '',
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

    // get follows
    if (entity['entities'][entityId]['claims'] && entity['entities'][entityId]['claims'][Constant.WIKIDATA_PROPERTY_CODE.FOLLOWS]) {
      const follows = [];
      for (const followsData of entity['entities'][entityId]['claims'][Constant.WIKIDATA_PROPERTY_CODE.FOLLOWS]) {
        if (followsData['mainsnak']['datavalue']['value']['id']) {
          const followsId = followsData['mainsnak']['datavalue']['value']['id'];
          const followsDetail = await getEntityDetail({ entityId: followsId, props: 'labels' });

          follows.push({
            id: followsId,
            value: followsDetail['entities'][followsId]['labels'][Constant.LANGUAGE.ID.ISO] ? followsDetail['entities'][followsId]['labels'][Constant.LANGUAGE.ID.ISO]['value'] : '',
          });
        }
      }

      if (follows.length > 0) {
        entityResponse.statements.follows = {
          property: Constant.WIKIDATA_PROPERTY_CODE.FOLLOWS,
          data: follows,
        };
      }
    }

    // get text audio
    if (entity['entities'][entityId]['claims'] && entity['entities'][entityId]['claims'][Constant.WIKIDATA_PROPERTY_CODE.TEXT_AUDIO]) {
      const textAudio = [];
      for (const textAudioData of entity['entities'][entityId]['claims'][Constant.WIKIDATA_PROPERTY_CODE.TEXT_AUDIO]) {
        if (textAudioData['mainsnak']['datavalue']['value']) {
          textAudio.push({
            value: textAudioData['mainsnak']['datavalue']['value'],
            url: `https://commons.wikimedia.org/wiki/Special:FilePath/${textAudioData['mainsnak']['datavalue']['value']}`,
          });
        }
      }

      if (textAudio.length > 0) {
        entityResponse.statements.textAudio = {
          property: Constant.WIKIDATA_PROPERTY_CODE.TEXT_AUDIO,
          data: textAudio,
        };
      }
    }

    return responseSuccess(res, entityResponse);
  } catch (err) {
    console.log(err);
    return responseError(res, err);
  }
}
