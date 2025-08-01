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
    let { limit, page, search, displayLanguageCode, languageCode } = req.query;

    displayLanguageCode = displayLanguageCode || Constant.DISPLAY_LANGUAGE.EN.ISO, 
    languageCode = languageCode || Constant.DISPLAY_LANGUAGE.EN.ISO

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
      language: displayLanguageCode, 
      uselang: languageCode 
    });

    if (entities.search && entities.search.length > 0) {
      // Fetch detailed information for found entities
      const entityIds = entities.search.map(entity => entity.id).join('|');
      const entityDetails = await getEntityDetail({ 
        entityId: entityIds, 
        props: 'claims', 
        language: displayLanguageCode, 
        uselang: languageCode 
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
          language: languageCode,
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
    const { entityId } = req.params;
    let { displayLanguageCode, languageCode } = req.query;

    displayLanguageCode = displayLanguageCode || Constant.DISPLAY_LANGUAGE.EN.ISO, 
    languageCode = languageCode || Constant.DISPLAY_LANGUAGE.EN.ISO

    // Fetch entity details from Wikidata
    const entity = await getEntityDetail({ 
      entityId, 
      props: 'labels|claims|descriptions|aliases', 
      language: displayLanguageCode, 
      uselang: languageCode 
    });

    // Prepare base response object
    const entityResponse = {
      id: entityId,
      label: entity?.entities?.[entityId]?.labels?.[languageCode]?.value || 
        entity?.entities?.[entityId]?.labels?.[displayLanguageCode]?.value ||
        entity?.entities?.[entityId]?.labels?.[Constant.DISPLAY_LANGUAGE.EN.ISO]?.value ||
        '',
      description: entity?.entities?.[entityId]?.descriptions?.[languageCode]?.value || 
        entity?.entities?.[entityId]?.descriptions?.[displayLanguageCode]?.value || 
        entity?.entities?.[entityId]?.descriptions?.[Constant.DISPLAY_LANGUAGE.EN.ISO]?.value ||
        '',
      aliases: entity?.entities?.[entityId]?.aliases?.[languageCode] 
        ? entity.entities[entityId].aliases[languageCode].map(item => item.value).join(', ') 
        : entity?.entities?.[entityId]?.aliases?.[Constant.DISPLAY_LANGUAGE.EN.ISO] ? 
        entity.entities[entityId].aliases[Constant.DISPLAY_LANGUAGE.EN.ISO].map(item => item.value).join(', ') : "",
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
            language: displayLanguageCode, 
            uselang: languageCode 
          });

          instanceOf.push({
            id: instanceOfId,
            value: instanceOfDetail?.entities?.[instanceOfId]?.labels?.[languageCode]?.value ||
              instanceOfDetail?.entities?.[instanceOfId]?.labels?.[displayLanguageCode]?.value ||
              instanceOfDetail?.entities?.[instanceOfId]?.labels?.[Constant.DISPLAY_LANGUAGE.EN.ISO]?.value ||
              ''
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
            language: displayLanguageCode, 
            uselang: languageCode 
          });

          subclass.push({
            id: subclassId,
            value: subclassDetail?.entities?.[subclassId]?.labels?.[languageCode]?.value ||
              subclassDetail?.entities?.[subclassId]?.labels?.[displayLanguageCode]?.value ||
              subclassDetail?.entities?.[subclassId]?.labels?.[Constant.DISPLAY_LANGUAGE.EN.ISO]?.value ||
              '',
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
            language: displayLanguageCode, 
            uselang: languageCode 
          });

          partOf.push({
            id: partOfId,
            value: partOfDetail?.entities?.[partOfId]?.labels?.[languageCode]?.value ||
              partOfDetail?.entities?.[partOfId]?.labels?.[displayLanguageCode]?.value ||
              partOfDetail?.entities?.[partOfId]?.labels?.[Constant.DISPLAY_LANGUAGE.EN.ISO]?.value ||
              '',
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
            language: displayLanguageCode, 
            uselang: languageCode 
          });

          taxonName.push({
            id: taxonNameId,
            value: taxonNameDetail?.entities?.[taxonNameId]?.labels?.[languageCode]?.value ||
              taxonNameDetail?.entities?.[taxonNameId]?.labels?.[displayLanguageCode]?.value ||
              taxonNameDetail?.entities?.[taxonNameId]?.labels?.[Constant.DISPLAY_LANGUAGE.EN.ISO]?.value ||
              '',
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
            language: displayLanguageCode, 
            uselang: languageCode 
          });

          hasParts.push({
            id: hasPartId,
            value: hasPartDetail?.entities?.[hasPartId]?.labels?.[languageCode]?.value ||
              hasPartDetail?.entities?.[hasPartId]?.labels?.[displayLanguageCode]?.value ||
              hasPartDetail?.entities?.[hasPartId]?.labels?.[Constant.DISPLAY_LANGUAGE.EN.ISO]?.value ||
              '',
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
    const { search, displayLanguageCode, languageCode } = req.query;
    let { limit, page } = req.query;

    // Set pagination parameters
    limit = limit ? Number(limit) : Constant.PAGINATION.LIMIT;
    page = page ? Number(page) : Constant.PAGINATION.PAGE;
    const offset = (page - 1) * limit;

    // Get recommendations from Wikidata
    const recommendations = await searchRecommendationEntities({ 
      search,
      limit,
      offset,
      language: languageCode || Constant.DISPLAY_LANGUAGE.EN.ISO,
      uselang: displayLanguageCode || Constant.DISPLAY_LANGUAGE.EN.ISO,
    });

    // Format recommendations for response
    const recommendationResponse = [];
    if (recommendations.query.pages && recommendations.query.pages.length > 0) {
      for (const recommendation of recommendations.query.pages) {
        recommendationResponse.push({
          id: recommendation.title,
          label: recommendation?.entityterms?.label?.[0] || recommendation?.cirrusdoc?.[0]?.source?.descriptions?.[displayLanguageCode]?.[0] || recommendation?.cirrusdoc?.[0]?.source?.descriptions?.[Constant.DISPLAY_LANGUAGE.EN.ISO]?.[0] || '',
          description: recommendation?.entityterms?.description?.[0] || recommendation?.cirrusdoc?.[0]?.source?.labels?.[displayLanguageCode]?.[0] || recommendation?.cirrusdoc?.[0]?.source?.labels?.[Constant.DISPLAY_LANGUAGE.EN.ISO]?.[0] || '',
          image: recommendation?.images?.[0]?.title
            ? `https://commons.wikimedia.org/wiki/Special:FilePath/${recommendation.images[0].title}` 
            : '',
          language: languageCode,
        });
      }
    }

    const response = {
      entities: recommendationResponse,
      metadata: {
        limit,
        currentPage: page,
      },
    };

    return responseSuccess(res, response);
  } catch (err) {
    return responseError(res, err);
  }
}