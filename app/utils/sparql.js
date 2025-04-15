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
  const query = `
  SELECT ?lexemeLabel ?senseLabel ?categoryLabel ?categoryQID ?gloss (GROUP_CONCAT(DISTINCT ?lemmaString; SEPARATOR = " / ") AS ?lemma) (GROUP_CONCAT(DISTINCT ?imageString; SEPARATOR = ", ") AS ?image) WHERE {
    {
      SELECT ?lexeme ?sense ?lemmaString ?category (UUID() AS ?uuid) WHERE {
        ?lexeme dct:language wd:${languageId};
          wikibase:lexicalCategory wd:Q1084, ?category;
          wikibase:lemma ?lemmaString;
          ontolex:sense ?sense.
        MINUS { ?sense wdt:P5137 ?senseItem. }
        MINUS {
          ?lexeme ontolex:sense ?senseWithItem.
          ?senseWithItem (wdt:P5137|wdt:P6271|wdt:P6593) [].
        }
        ${excludeQuery}
      }
      ORDER BY (?uuid)
      LIMIT ${Config.activity.totalConnectLexemeSense}
    }
    OPTIONAL {
      ?sense skos:definition ?gloss.
      FILTER((LANG(?gloss)) = "${languageCode}")
    }
    OPTIONAL { ?sense wdt:P18 ?imageString. }
    BIND(STRAFTER(STR(?category), "http://www.wikidata.org/entity/") AS ?categoryQID)
    SERVICE SILENT wikibase:label { bd:serviceParam wikibase:language "${displayLanguage}, [AUTO_LANGUAGE]". }
  }
  GROUP BY ?lexemeLabel ?senseLabel ?categoryLabel ?categoryQID ?gloss
  #${generatedUUID}`;

  return query;
}

export async function generateGetConnectLexemeSenseQuery ({ languageId, languageCode, include = '', displayLanguage = Constant.DISPLAY_LANGUAGE.EN.ISO }) {
  // generate include data query
  const includeQuery = include ? `FILTER(?sense IN (${include}))` : '';
  
  // generate get random lexeme query
  const query = `
  SELECT ?lexemeLabel ?senseLabel ?categoryLabel ?categoryQID ?gloss (GROUP_CONCAT(DISTINCT ?lemmaString; SEPARATOR = " / ") AS ?lemma) (GROUP_CONCAT(DISTINCT ?imageString; SEPARATOR = ", ") AS ?image) WHERE {
    {
      SELECT ?lexeme ?sense ?lemmaString ?category (UUID() AS ?uuid) WHERE {
        ?lexeme dct:language wd:${languageId};
          wikibase:lexicalCategory wd:Q1084, ?category;
          wikibase:lemma ?lemmaString;
          ontolex:sense ?sense.
        MINUS { ?sense wdt:P5137 ?senseItem. }
        MINUS {
          ?lexeme ontolex:sense ?senseWithItem.
          ?senseWithItem (wdt:P5137|wdt:P6271|wdt:P6593) [].
        }
        ${includeQuery}
      }
    }
    OPTIONAL {
      ?sense skos:definition ?gloss.
      FILTER((LANG(?gloss)) = "${languageCode}")
    }
    OPTIONAL { ?sense wdt:P18 ?imageString. }
    BIND(STRAFTER(STR(?category), "http://www.wikidata.org/entity/") AS ?categoryQID)
    SERVICE SILENT wikibase:label { bd:serviceParam wikibase:language "${displayLanguage}, [AUTO_LANGUAGE]". }
  }
  GROUP BY ?lexemeLabel ?senseLabel ?categoryLabel ?categoryQID ?gloss`;

  return query;
}

export async function generateRandomScriptLexemeQuery ({ languageId, variantCode, languageCode, exclude = '', displayLanguage = Constant.DISPLAY_LANGUAGE.EN.ISO }) {
  // generate uuid for query
  const generatedUUID = uuidv4();

  // generate exclude data query
  const excludeQuery = exclude ? `FILTER(?lexeme NOT IN (${exclude}))` : '';
  
  // generate get random lexeme query
  const query = `
  SELECT ?lexemeLabel (GROUP_CONCAT(DISTINCT ?lemmaString; SEPARATOR = " / ") AS ?lemma) ?categoryLabel ?categoryQID (GROUP_CONCAT(DISTINCT ?glossString; SEPARATOR = " ; ") AS ?gloss) (GROUP_CONCAT(DISTINCT ?imageString; SEPARATOR = ", ") AS ?image) (GROUP_CONCAT(DISTINCT ?uuidString; SEPARATOR = " / ") AS ?uuid) WHERE {
    ?lexeme dct:language wd:${languageId};
      wikibase:lexicalCategory ?category;
      wikibase:lemma ?lemmaString.
    FILTER(NOT EXISTS {
      ?lexeme wikibase:lemma ?variant.
      FILTER(LANGMATCHES(LANG(?variant), "${variantCode}"))
    })
    OPTIONAL {
      ?lexeme ontolex:sense ?sense.
      OPTIONAL {
        ?sense skos:definition ?glossString.
        FILTER(LANGMATCHES(LANG(?glossString), "${languageCode}"))
      }
      OPTIONAL { ?sense wdt:P18 ?imageString. }
    }
    ${excludeQuery}
    BIND(STRAFTER(STR(?category), "http://www.wikidata.org/entity/") AS ?categoryQID)
    SERVICE SILENT wikibase:label { bd:serviceParam wikibase:language "${displayLanguage}, [AUTO_LANGUAGE]". }
    BIND(UUID() AS ?uuidString)
  }
  GROUP BY ?lexemeLabel ?categoryLabel ?categoryQID
  ORDER BY (?uuid)
  LIMIT ${Config.activity.totalScriptLexeme}
  #${generatedUUID}`;

  return query;
}

export async function generateGetScriptLexemeQuery ({ languageId, languageCode, include = '', displayLanguage = Constant.DISPLAY_LANGUAGE.EN.ISO }) {
  // generate include data query
  const includeQuery = include ? `FILTER(?lexeme IN (${include}))` : '';
  
  // generate get random lexeme query
  const query = `
  SELECT ?lexemeLabel (GROUP_CONCAT(DISTINCT ?lemmaString; SEPARATOR = " / ") AS ?lemma) ?categoryLabel ?categoryQID (GROUP_CONCAT(DISTINCT ?glossString; SEPARATOR = " ; ") AS ?gloss) (GROUP_CONCAT(DISTINCT ?imageString; SEPARATOR = ", ") AS ?image) (GROUP_CONCAT(DISTINCT ?uuidString; SEPARATOR = " / ") AS ?uuid) WHERE {
    ?lexeme dct:language wd:${languageId};
      wikibase:lexicalCategory ?category;
      wikibase:lemma ?lemmaString.
    OPTIONAL {
      ?lexeme ontolex:sense ?sense.
      OPTIONAL {
        ?sense skos:definition ?glossString.
        FILTER(LANGMATCHES(LANG(?glossString), "${languageCode}"))
      }
      OPTIONAL { ?sense wdt:P18 ?imageString. }
    }
    ${includeQuery}
    BIND(STRAFTER(STR(?category), "http://www.wikidata.org/entity/") AS ?categoryQID)
    SERVICE SILENT wikibase:label { bd:serviceParam wikibase:language "${displayLanguage}, [AUTO_LANGUAGE]". }
    BIND(UUID() AS ?uuidString)
  }
  GROUP BY ?lexemeLabel ?categoryLabel ?categoryQID
  ORDER BY (?uuid)`;

  return query;
}

export async function generateRandomHyphenationLexemeQuery ({ languageId, languageCode, exclude = '', displayLanguage = Constant.DISPLAY_LANGUAGE.EN.ISO }) {
  // generate uuid for query
  const generatedUUID = uuidv4();

  // generate exclude data query
  const excludeQuery = exclude ? `FILTER(?lexeme NOT IN (${exclude}))` : '';
  
  // generate get random lexeme query
  const query = `
  SELECT ?lexemeLabel ?formLabel ?lemma ?categoryLabel ?categoryQID (GROUP_CONCAT(DISTINCT ?glossString; SEPARATOR = " ; ") AS ?gloss) (GROUP_CONCAT(DISTINCT ?imageString; SEPARATOR = ", ") AS ?image) WHERE {
    {
      SELECT ?lexeme ?form ?lemma ?category (UUID() AS ?uuid) WHERE {
        ?lexeme dct:language wd:${languageId};
          wikibase:lexicalCategory ?category;
          wikibase:lemma ?lemma;
          ontolex:lexicalForm ?form.
        ?form ontolex:representation ?lemma.
        FILTER(((STRLEN(?lemma)) >= 5 ) && (!(CONTAINS(?lemma, " "))))
        FILTER(REGEX(?lemma, "^[A-Za-zÀ-ÿ]+$", "i"))
        FILTER(NOT EXISTS { ?form p:P5279 ?stmt. })
        ${excludeQuery}
      }
      ORDER BY (?uuid)
      LIMIT ${Config.activity.totalHyphenationLexeme}
    }
    OPTIONAL {
      ?lexeme ontolex:sense ?sense.
      OPTIONAL {
        ?sense skos:definition ?glossString.
        FILTER(LANGMATCHES(LANG(?glossString), "${languageCode}"))
      }
      OPTIONAL { ?sense wdt:P18 ?imageString. }
    }
    SERVICE SILENT wikibase:label { bd:serviceParam wikibase:language "${displayLanguage}, [AUTO_LANGUAGE]". }
    BIND(STRAFTER(STR(?category), "http://www.wikidata.org/entity/") AS ?categoryQID)
  }
  GROUP BY ?lexemeLabel ?formLabel ?lemma ?categoryLabel ?categoryQID
  #${generatedUUID}`;

  return query;
}

export async function generateGetHyphenationLexemeQuery ({ languageId, languageCode, include = '', displayLanguage = Constant.DISPLAY_LANGUAGE.EN.ISO }) {
  // generate uuid for query
  const generatedUUID = uuidv4();

  // generate include data query
  const includeQuery = include ? `FILTER(?lexeme IN (${include}))` : '';
  
  // generate get random lexeme query
  const query = `
  SELECT ?lexemeLabel ?formLabel ?lemma ?categoryLabel ?categoryQID (GROUP_CONCAT(DISTINCT ?glossString; SEPARATOR = " ; ") AS ?gloss) (GROUP_CONCAT(DISTINCT ?imageString; SEPARATOR = ", ") AS ?image) WHERE {
    {
      SELECT ?lexeme ?form ?lemma ?category (UUID() AS ?uuid) WHERE {
        ?lexeme dct:language wd:${languageId};
          wikibase:lexicalCategory ?category;
          wikibase:lemma ?lemma;
          ontolex:lexicalForm ?form.
        ?form ontolex:representation ?lemma.
        FILTER(((STRLEN(?lemma)) >= 5 ) && (!(CONTAINS(?lemma, " "))))
        FILTER(REGEX(?lemma, "^[A-Za-zÀ-ÿ]+$", "i"))
        FILTER(NOT EXISTS { ?form p:P5279 ?stmt. })
        ${includeQuery}
      }
      ORDER BY (?uuid)
    }
    OPTIONAL {
      ?lexeme ontolex:sense ?sense.
      OPTIONAL {
        ?sense skos:definition ?glossString.
        FILTER(LANGMATCHES(LANG(?glossString), "${languageCode}"))
      }
      OPTIONAL { ?sense wdt:P18 ?imageString. }
    }
    SERVICE SILENT wikibase:label { bd:serviceParam wikibase:language "${displayLanguage}, [AUTO_LANGUAGE]". }
    BIND(STRAFTER(STR(?category), "http://www.wikidata.org/entity/") AS ?categoryQID)
  }
  GROUP BY ?lexemeLabel ?formLabel ?lemma ?categoryLabel ?categoryQID`;

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