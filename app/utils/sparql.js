import { v4 as uuidv4 } from 'uuid';
import { Get } from './axios';
import Config from '../configs/env.config'
import Constant from './constants';

export async function generateRandomConnectLexemeSenseQuery ({ languageId, languageCode, exclude = '', displayLanguage = Constant.DISPLAY_LANGUAGE.EN.ISO }) {
  // generate uuid for query
  const generatedUUID = uuidv4();

  // generate exclude data query
  const excludeQuery = exclude ? `FILTER(?sense NOT IN (${exclude}))` : '';
  
  // generate get random lexeme query
  const query = `SELECT ?senseLabel ?lexemeLabel (GROUP_CONCAT(DISTINCT ?lemmaString; separator=" / ") AS ?lemma) ?categoryLabel ?gloss ?categoryQID (GROUP_CONCAT(DISTINCT ?uuidString; separator=" / ") AS ?uuid) WHERE {
    ?lexeme dct:language wd:${languageId};
      wikibase:lexicalCategory wd:Q1084;
      wikibase:lexicalCategory ?category;
      wikibase:lemma ?lemmaString;
      ontolex:sense ?sense.
    OPTIONAL { ?sense skos:definition ?gloss. FILTER(LANG(?gloss) = "${languageCode}")}
    MINUS { ?sense wdt:P5137 ?senseItem. }
    BIND(STRAFTER(STR(?category), "http://www.wikidata.org/entity/") AS ?categoryQID)
    ${excludeQuery}
    SERVICE wikibase:label { 
      bd:serviceParam wikibase:language "${displayLanguage}, [AUTO_LANGUAGE]".
    }
    BIND(UUID() AS ?uuidString)
  }
  GROUP BY ?senseLabel ?lexemeLabel ?categoryLabel ?gloss ?categoryQID ?uuid
  ORDER BY ?uuid
  LIMIT ${Config.activity.totalConnectLexemeSense}
  #${generatedUUID}`

  return query;
}

export async function generateGetConnectLexemeSenseQuery ({ languageId, languageCode, include = '', displayLanguage = Constant.DISPLAY_LANGUAGE.EN.ISO }) {
  // generate exclude data query
  const includeQuery = include ? `FILTER(?sense IN (${include}))` : '';
  
  // generate get random lexeme query
  const query = `SELECT ?senseLabel ?lexemeLabel (GROUP_CONCAT(DISTINCT ?lemmaString; separator=" / ") AS ?lemma) ?categoryLabel ?gloss ?categoryQID WHERE {
    ?lexeme dct:language wd:${languageId};
      wikibase:lexicalCategory wd:Q1084;
      wikibase:lexicalCategory ?category;
      wikibase:lemma ?lemmaString;
      ontolex:sense ?sense.
    OPTIONAL { ?sense skos:definition ?gloss. FILTER(LANG(?gloss) = "${languageCode}")}
    BIND(STRAFTER(STR(?category), "http://www.wikidata.org/entity/") AS ?categoryQID)
    ${includeQuery}
    SERVICE wikibase:label { 
      bd:serviceParam wikibase:language "${displayLanguage}, [AUTO_LANGUAGE]".
    }
  }
  GROUP BY ?senseLabel ?lexemeLabel ?categoryLabel ?gloss ?categoryQID`

  return query;
}

export async function generateRandomScriptLexemeQuery ({ languageId, variantCode, exclude = '', displayLanguage = Constant.DISPLAY_LANGUAGE.EN.ISO }) {
  // generate uuid for query
  const generatedUUID = uuidv4();

  // generate exclude data query
  const excludeQuery = exclude ? `FILTER(?l NOT IN (${exclude}))` : '';
  
  // generate get random lexeme query
  const query = `
  SELECT ?lLabel ?categoryLabel ?lemma ?categoryQID (GROUP_CONCAT(DISTINCT ?glossString; separator=", ") AS ?gloss) (GROUP_CONCAT(DISTINCT ?uuidString; separator=" / ") AS ?uuid) WHERE {
    ?l rdf:type ontolex:LexicalEntry;
      dct:language wd:${languageId};
      wikibase:lexicalCategory ?category;
      wikibase:lemma ?lemma.
    OPTIONAL {
      ?l ontolex:sense ?sense.
      ?sense skos:definition ?glossString.
    }
    BIND(STRAFTER(STR(?category), "http://www.wikidata.org/entity/") AS ?categoryQID)
    FILTER(NOT EXISTS {
      ?l wikibase:lemma ?variant.
      FILTER((LANG(?variant)) = "${variantCode}")
    })
    ${excludeQuery}
    SERVICE wikibase:label { bd:serviceParam wikibase:language "${displayLanguage}, [AUTO_LANGUAGE]". }
    BIND(UUID() AS ?uuidString)
  }
  
  GROUP BY ?lLabel ?categoryLabel ?lemma ?categoryQID ?gloss ?uuid
  ORDER BY ?uuid
  LIMIT ${Config.activity.totalScriptLexeme}
  #${generatedUUID}`

  return query;
}

export async function generateGetScriptLexemeQuery ({ languageId, include = '', displayLanguage = Constant.DISPLAY_LANGUAGE.EN.ISO }) {
  // generate exclude data query
  const includeQuery = include ? `FILTER(?l IN (${include}))` : '';
  
  // generate get random lexeme query
  const query = `SELECT ?lLabel ?categoryLabel ?lemma ?categoryQID (GROUP_CONCAT(DISTINCT ?glossString; separator=", ") AS ?gloss) (GROUP_CONCAT(DISTINCT ?uuidString; separator=" / ") AS ?uuid) WHERE {
    ?l rdf:type ontolex:LexicalEntry;
      dct:language wd:${languageId};
      wikibase:lexicalCategory ?category;
      wikibase:lemma ?lemma.
    OPTIONAL {
      ?l ontolex:sense ?sense.
      ?sense skos:definition ?glossString.
    }
    BIND(STRAFTER(STR(?category), "http://www.wikidata.org/entity/") AS ?categoryQID)
    ${includeQuery}
    SERVICE wikibase:label { bd:serviceParam wikibase:language "${displayLanguage}, [AUTO_LANGUAGE]". }
    BIND(UUID() AS ?uuidString)
  }
  GROUP BY ?lLabel ?categoryLabel ?lemma ?categoryQID ?gloss ?uuid
  ORDER BY ?uuid`

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