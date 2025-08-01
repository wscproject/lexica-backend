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
  
  const response = await Get({ url: `${Config.wiki.wikidataUrl}/w/api.php`, params });

  return response;
};

export async function searchRecommendationEntities({ search = '', language = Constant.DISPLAY_LANGUAGE.ID.ISO, uselang = Constant.DISPLAY_LANGUAGE.ID.ISO, limit, offset = 0 }) {
  const params = {
      action: 'query',
      format: 'json',
      generator: 'search',
      converttitles: 1,
      formatversion: 2,
      errorformat: 'plaintext',
      prop: 'entityterms|images|cirrusdoc',
      wbetterms: 'alias|label|description',
      wbetlanguage: language,
      cdincludes: `descriptions.${Constant.DISPLAY_LANGUAGE.EN.ISO}|labels.${Constant.DISPLAY_LANGUAGE.EN.ISO}|descriptions.${uselang}|labels.${uselang}`,
      // uselang: language,
      gsrsearch: `${search} -haswbstatement:P31=Q5|P31=Q5633421|P31=Q737498|P31=Q16024164|P31=Q13442814|P31=Q4167410`,
      gsrlimit: limit,
      gsroffset: offset,
      gsrqiprofile: 'classic',
      gsrinfo: 'totalhits',
  };
  
  const response = await Get({ url: `${Config.wiki.wikidataUrl}/w/api.php`, params });

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
  
  const response = await Get({ url: `${Config.wiki.wikidataUrl}/w/api.php`, params });
  if (!response || response.error) {
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

  const response = await Get({ url: `${Config.wiki.wikidataUrl}/w/api.php`, params, headers });
  if (!response || response.error) {
    throw Status.ERROR.FAILED_GET_CSRF_TOKEN;
  }

  return response.query.tokens.csrftoken;
}

export async function getLanguageList() {
  const params = {
    action: 'query',
    meta: 'wbcontentlanguages',
    wbclcontext: 'monolingualtext',
    wbclprop: 'code|autonym|name',
    format: 'json',
  };

  const response = await Get({ url: `${Config.wiki.wikidataUrl}/w/api.php`, params });
  if (!response || response.error) {
    throw Status.ERROR.WIKIDATA_LANGUAGE_NOT_FOUND;
  }

  return response.query.wbcontentlanguages;
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

  const response = await Post({ url: `${Config.wiki.wikidataUrl}/w/api.php`, data: qs.stringify(body), headers });
  if (!response || response.errors) {
    throw Status.ERROR.FAILED_UPDATE_SENSE_IN_WIKI;
  }
  
  return response;
}

export async function addLemmaToLexeme({ accessToken, lexemeId, variantCode, csrfToken, lemma }){
  const entity = {
    lemmas: {
      [variantCode]: {
        value: lemma,
        language: variantCode
      },
    },
  };

  const body =  {
    id: lexemeId,
    action: 'wbeditentity',
    format: 'json',
    token: csrfToken,
    data: JSON.stringify(entity),
    errorformat: 'plaintext',
  }

  const headers =  {
    'Content-Type': 'application/x-www-form-urlencoded',
    Authorization: `Bearer ${accessToken}`,
  }

  const response = await Post({ url: `${Config.wiki.wikidataUrl}/w/api.php`, data: qs.stringify(body), headers });
  if (response.errors) {
    throw Status.ERROR.FAILED_UPDATE_SENSE_IN_WIKI;
  }
  
  return response;
}

export async function addHyphenationToLexemeForm({ accessToken, formId, hyphenation, csrfToken, ignoreDuplicate = true }){
  const generatedUUID = uuidv4();
  const claim = {
    type: "statement",
    mainsnak: {
      snaktype: "value",
      property: "P5279",
      datavalue: {
        type: "string",
        value: hyphenation,
      }
    },
    id: `${formId}$${generatedUUID}`,
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

  const response = await Post({ url: `${Config.wiki.wikidataUrl}/w/api.php`, data: qs.stringify(body), headers });
  if (!response || response.errors) {
    throw Status.ERROR.FAILED_UPDATE_SENSE_IN_WIKI;
  }
  
  return response;
}
