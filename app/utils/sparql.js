import { v4 as uuidv4 } from 'uuid';
import { Get } from './axios';
import Config from '../configs/env.config'
import Constant from './constants';

export async function generateRandomLexemeQuery ({ languageId, languageCode, exclude = '', displayLanguage = Constant.DISPLAY_LANGUAGE.ID.ISO }) {
  // generate uuid for query
  const generatedUUID = uuidv4();

  // generate exclude data query
  const excludeQuery = exclude ? `FILTER(?sense NOT IN (${exclude}))` : '';
  
  // generate get random lexeme query
  const query = `SELECT ?lexemeLabel ?lemma ?senseLabel ?categoryLabel ?gloss ?categoryQID WHERE {
    ?lexeme dct:language wd:${languageId};
      wikibase:lexicalCategory wd:Q1084;
      wikibase:lexicalCategory ?category;
      wikibase:lemma ?lemma;
      ontolex:sense ?sense.
    FILTER(LANG(?lemma) = "${languageCode}")
    OPTIONAL { ?sense skos:definition ?gloss. FILTER(LANG(?gloss) = "${languageCode}")}
    MINUS { ?sense wdt:P5137 ?senseItem. }
    BIND(STRAFTER(STR(?category), "http://www.wikidata.org/entity/") AS ?categoryQID)
    ${excludeQuery}
    SERVICE wikibase:label { 
      bd:serviceParam wikibase:language "${displayLanguage}, [AUTO_LANGUAGE]".
    }
    BIND(UUID() AS ?uuid)
  }
  ORDER BY ?uuid
  LIMIT ${Config.lexeme.total}
  #${generatedUUID}`

  return query;
}

export async function generateGetLexemeQuery ({ languageId, languageCode, include = '', displayLanguage = Constant.DISPLAY_LANGUAGE.ID.ISO }) {
  // generate exclude data query
  const includeQuery = include ? `FILTER(?sense IN (${include}))` : '';
  
  // generate get random lexeme query
  const query = `SELECT ?lexemeLabel ?lemma ?senseLabel ?categoryLabel ?gloss ?categoryQID WHERE {
    ?lexeme dct:language wd:${languageId};
      wikibase:lexicalCategory wd:Q1084;
      wikibase:lexicalCategory ?category;
      wikibase:lemma ?lemma;
      ontolex:sense ?sense.
    FILTER(LANG(?lemma) = "${languageCode}")
    OPTIONAL { ?sense skos:definition ?gloss. FILTER(LANG(?gloss) = "${languageCode}")}
    BIND(STRAFTER(STR(?category), "http://www.wikidata.org/entity/") AS ?categoryQID)
    ${includeQuery}
    SERVICE wikibase:label { 
      bd:serviceParam wikibase:language "${displayLanguage}, [AUTO_LANGUAGE]".
    }
  }`

  return query;
}

export async function simpleQuery(query, accessToken = ''){
  const fullUrl = `${Config.wiki.sparqlQueryUrl}?query=${encodeURIComponent( query )}`;
  const headers = { 
    'Accept': 'application/sparql-results+json',
    'Authorization': `Bearer ${accessToken}`,
  };

  const response = await Get({
    url: fullUrl,
    headers
  });

  return response;
}