/**
 * Entity Controller
 * Handles interaction with Wikidata entities including:
 * 1. Searching for entities
 * 2. Retrieving entity details
 * 3. Getting entity recommendations
 */

/* eslint-disable no-await-in-loop */
/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
import Constant from '../../../utils/constants';
import { responseError, responseSuccess } from '../../../utils/output';
import { searchEntities, getEntityDetail, searchRecommendationEntities} from '../../../utils/wikidata';

/**
 * Searches for Wikidata entities based on query parameters
 * 
 * @param {Object} req - Express request object containing:
 *   - loggedInUser: Current authenticated user
 *   - query: Query parameters:
 *     - limit: Number of results per page
 *     - page: Page number
 *     - search: Search term
 * @param {Object} res - Express response object
 * @returns {Object} Response containing:
 *   - entities: Array of matching entities
 *   - metadata: Pagination information
 */
export async function getEntities(req, res) {
  try {
    const { loggedInUser } = req;
    let { limit, page, search } = req.query;

    // Set pagination parameters
    limit = limit ? Number(limit) : Constant.PAGINATION.LIMIT;
    page = page ? Number(page) : Constant.PAGINATION.PAGE;
    const offset = (page - 1) * limit;

    // Search for entities in Wikidata
    const entityResponse = [];
    const entities = await searchEntities({ 
      search, 
      limit, 
      offset, 
      language: loggedInUser.displayLanguageCode, 
      uselang: loggedInUser.languageCode 
    });

    if (entities.search && entities.search.length > 0) {
      // Fetch detailed information for found entities
      const entityIds = entities.search.map(entity => entity.id).join('|');
      const entityDetails = await getEntityDetail({ 
        entityId: entityIds, 
        props: 'claims', 
        language: loggedInUser.displayLanguageCode, 
        uselang: loggedInUser.languageCode 
      });

      // Map entity data to response format
      for (const entity of entities.search) {
        const temporaryEntity = {
          id: entity.id,
          label: entity.display.label.value,
          description: entity.display.description ? entity.display.description.value : '',
          image: entityDetails.entities[entity.id].claims[Constant.WIKIDATA_PROPERTY_CODE.IMAGE] 
            ? `https://commons.wikimedia.org/wiki/Special:FilePath/${entityDetails.entities[entity.id].claims[Constant.WIKIDATA_PROPERTY_CODE.IMAGE][0].mainsnak.datavalue.value}` 
            : '',
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

/**
 * Retrieves detailed information for a specific Wikidata entity
 * 
 * @param {Object} req - Express request object containing:
 *   - loggedInUser: Current authenticated user
 *   - params: URL parameters with entityId
 * @param {Object} res - Express response object
 * @returns {Object} Response containing detailed entity information including:
 *   - Basic info (id, label, description, aliases)
 *   - Statements (instanceOf, subclass, partOf, images, etc.)
 */
export async function getEntity(req, res) {
  try {
    const { loggedInUser } = req;
    const { entityId } = req.params;

    // Fetch entity details from Wikidata
    const entity = await getEntityDetail({ 
      entityId, 
      props: 'labels|claims|descriptions|aliases', 
      language: loggedInUser.displayLanguageCode, 
      uselang: loggedInUser.languageCode 
    });

    // Prepare base response object
    const entityResponse = {
      id: entityId,
      label: entity.entities[entityId].labels[loggedInUser.displayLanguageCode] 
        ? entity.entities[entityId].labels[loggedInUser.displayLanguageCode].value 
        : '',
      description: entity.entities[entityId].descriptions[loggedInUser.displayLanguageCode] 
        ? entity.entities[entityId].descriptions[loggedInUser.displayLanguageCode].value 
        : '',
      aliases: entity?.entities?.[entityId]?.aliases?.[loggedInUser.languageCode] 
        ? entity.entities[entityId].aliases[loggedInUser.languageCode].map(item => item.value).join(', ') 
        : '',
      statements: {
        instanceOf: null,
        subclass: null,
        partOf: null,
        images: null,
        taxonName: null,
        hasParts: null,
      }
    };

    // Process entity images
    if (entity.entities[entityId].claims && entity.entities[entityId].claims[Constant.WIKIDATA_PROPERTY_CODE.IMAGE]) {
      const images = [];
      for (const imageDetail of entity.entities[entityId].claims[Constant.WIKIDATA_PROPERTY_CODE.IMAGE]) {
        if (imageDetail.mainsnak.datavalue.value) {
          images.push({
            value: imageDetail.mainsnak.datavalue.value,
            url: `https://commons.wikimedia.org/wiki/Special:FilePath/${imageDetail.mainsnak.datavalue.value}`,
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

    // Process instance of statements
    if (entity.entities[entityId].claims && entity.entities[entityId].claims[Constant.WIKIDATA_PROPERTY_CODE.INSTANCE_OF]) {
      const instanceOf = [];
      for (const instanceOfData of entity.entities[entityId].claims[Constant.WIKIDATA_PROPERTY_CODE.INSTANCE_OF]) {
        if (instanceOfData.mainsnak.datavalue.value.id) {
          const instanceOfId = instanceOfData.mainsnak.datavalue.value.id;
          const instanceOfDetail = await getEntityDetail({ 
            entityId: instanceOfId, 
            props: 'labels', 
            language: loggedInUser.displayLanguageCode, 
            uselang: loggedInUser.languageCode 
          });

          instanceOf.push({
            id: instanceOfId,
            value: instanceOfDetail.entities[instanceOfId].labels[loggedInUser.displayLanguageCode] 
              ? instanceOfDetail.entities[instanceOfId].labels[loggedInUser.displayLanguageCode].value 
              : '',
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

    // Process subclass statements
    if (entity.entities[entityId].claims && entity.entities[entityId].claims[Constant.WIKIDATA_PROPERTY_CODE.SUBCLASS]) {
      const subclass = [];
      for (const subclassData of entity.entities[entityId].claims[Constant.WIKIDATA_PROPERTY_CODE.SUBCLASS]) {
        if (subclassData.mainsnak.datavalue.value.id) {
          const subclassId = subclassData.mainsnak.datavalue.value.id;
          const subclassDetail = await getEntityDetail({ 
            entityId: subclassId, 
            props: 'labels', 
            language: loggedInUser.displayLanguageCode, 
            uselang: loggedInUser.languageCode 
          });

          subclass.push({
            id: subclassId,
            value: subclassDetail.entities[subclassId].labels[loggedInUser.displayLanguageCode] 
              ? subclassDetail.entities[subclassId].labels[loggedInUser.displayLanguageCode].value 
              : '',
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

    // Process part of statements
    if (entity.entities[entityId].claims && entity.entities[entityId].claims[Constant.WIKIDATA_PROPERTY_CODE.PART_OF]) {
      const partOf = [];
      for (const partOfData of entity.entities[entityId].claims[Constant.WIKIDATA_PROPERTY_CODE.PART_OF]) {
        if (partOfData.mainsnak.datavalue.value.id) {
          const partOfId = partOfData.mainsnak.datavalue.value.id;
          const partOfDetail = await getEntityDetail({ 
            entityId: partOfId, 
            props: 'labels', 
            language: loggedInUser.displayLanguageCode, 
            uselang: loggedInUser.languageCode 
          });

          partOf.push({
            id: partOfId,
            value: partOfDetail.entities[partOfId].labels[loggedInUser.displayLanguageCode] 
              ? partOfDetail.entities[partOfId].labels[loggedInUser.displayLanguageCode].value 
              : '',
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

    // Process taxon name statements
    if (entity.entities[entityId].claims && entity.entities[entityId].claims[Constant.WIKIDATA_PROPERTY_CODE.TAXON_NAME]) {
      const taxonName = [];
      for (const taxonNameData of entity.entities[entityId].claims[Constant.WIKIDATA_PROPERTY_CODE.TAXON_NAME]) {
        if (taxonNameData.mainsnak.datavalue.value.id) {
          const taxonNameId = taxonNameData.mainsnak.datavalue.value.id;
          const taxonNameDetail = await getEntityDetail({ 
            entityId: taxonNameId, 
            props: 'labels', 
            language: loggedInUser.displayLanguageCode, 
            uselang: loggedInUser.languageCode 
          });

          taxonName.push({
            id: taxonNameId,
            value: taxonNameDetail.entities[taxonNameId].labels[loggedInUser.displayLanguageCode] 
              ? taxonNameDetail.entities[taxonNameId].labels[loggedInUser.displayLanguageCode].value 
              : '',
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

    // Process has parts statements
    if (entity.entities[entityId].claims && entity.entities[entityId].claims[Constant.WIKIDATA_PROPERTY_CODE.HAS_PARTS]) {
      const hasParts = [];
      for (const hasPartData of entity.entities[entityId].claims[Constant.WIKIDATA_PROPERTY_CODE.HAS_PARTS]) {
        if (hasPartData.mainsnak.datavalue.value.id) {
          const hasPartId = hasPartData.mainsnak.datavalue.value.id;
          const hasPartDetail = await getEntityDetail({ 
            entityId: hasPartId, 
            props: 'labels', 
            language: loggedInUser.displayLanguageCode, 
            uselang: loggedInUser.languageCode 
          });

          hasParts.push({
            id: hasPartId,
            value: hasPartDetail.entities[hasPartId].labels[loggedInUser.displayLanguageCode] 
              ? hasPartDetail.entities[hasPartId].labels[loggedInUser.displayLanguageCode].value 
              : '',
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

    return responseSuccess(res, entityResponse);
  } catch (err) {
    console.log(err);
    return responseError(res, err);
  }
}

/**
 * Gets entity recommendations based on search term
 * 
 * @param {Object} req - Express request object containing:
 *   - loggedInUser: Current authenticated user
 *   - query: Query parameters with search term
 * @param {Object} res - Express response object
 * @returns {Object} Response containing recommended entities
 */
export async function getRecommendations(req, res) {
  try {
    const { loggedInUser } = req;
    const { search } = req.query;

    // Get recommendations from Wikidata
    const recommendations = await searchRecommendationEntities({ 
      search, 
      language: loggedInUser.displayLanguageCode, 
      uselang: loggedInUser.languageCode 
    });

    // Format recommendations for response
    const recommendationResponse = [];
    if (recommendations.search && recommendations.search.length > 0) {
      for (const recommendation of recommendations.search) {
        recommendationResponse.push({
          id: recommendation.id,
          label: recommendation.display.label.value,
          description: recommendation.display.description ? recommendation.display.description.value : '',
          language: loggedInUser.languageCode,
        });
      }
    }

    return responseSuccess(res, recommendationResponse);
  } catch (err) {
    return responseError(res, err);
  }
}