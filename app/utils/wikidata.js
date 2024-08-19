import qs from 'qs';
import { v4 as uuidv4 } from 'uuid';
import { Get, Post } from './axios';
import Config from '../configs/env.config'
import Status from './status';
import Constant from './constants';

export async function searchEntities({ search = '', language = Constant.DISPLAY_LANGUAGE.ID.ISO, uselang = Constant.DISPLAY_LANGUAGE.ID.ISO, limit, offset = 0 }) {
  const params = {
      action: 'wbsearchentities',
      search,
      format: 'json',
      errorformat: 'plaintext',
      language,
      uselang,
      type: 'item',
      limit,
      continue: offset,
  };
  
  const response = await Get({ url: Config.wiki.wikidataUrl, params });

  return response;
};

export async function getEntityDetail({ entityId, language = Constant.DISPLAY_LANGUAGE.ID.ISO, uselang = Constant.DISPLAY_LANGUAGE.ID.ISO, props = 'labels|claims', format = 'json' }){
  const params = {
      action: 'wbgetentities',
      ids: entityId,
      format,
      props,
      language,
      uselang
  };
  
  const response = await Get({ url: Config.wiki.wikidataUrl, params });
  if (response.error) {
    throw Status.ERROR.ENTITY_NOT_FOUND(entityId);
  }
  return response;
};

export async function getCsrfToken({ accessToken }) {
  const params = {
    action: 'query',
    meta: 'tokens',
    type: 'csrf',
    format: 'json',
  };

  const headers =  {
    Authorization: `Bearer ${accessToken}`,
  }

  const response = await Get({ url: Config.wiki.wikidataUrl, params, headers });
  if (response.error) {
    throw Status.ERROR.FAILED_GET_CSRF_TOKEN;
  }

  return response.query.tokens.csrftoken;
}


export async function addItemToLexemeSense({ accessToken, senseId, itemId, csrfToken, ignoreDuplicate = true }){
  const generatedUUID = uuidv4();
  const claim = {
    type: "statement",
    mainsnak: {
      snaktype: "value",
      property: "P5137",
      datavalue: {
        type: "wikibase-entityid",
        value: {
          id: itemId
        }
      }
    },
    id: `${senseId}$${generatedUUID}`,
  }

  const body =  {
    action: 'wbsetclaim',
    format: 'json',
    token: csrfToken,
    claim: JSON.stringify(claim),
    errorformat: 'plaintext',
    ignoreduplicatemainsnak: ignoreDuplicate,
  }

  const headers =  {
    'Content-Type': 'application/x-www-form-urlencoded',
    Authorization: `Bearer ${accessToken}`,
  }

  const response = await Post({ url: Config.wiki.wikidataUrl, data: qs.stringify(body), headers });
  if (response.errors) {
    throw Status.ERROR.FAILED_UPDATE_SENSE_IN_WIKI;
  }
  
  return response;
}