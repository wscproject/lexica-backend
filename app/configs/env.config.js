require('dotenv').config();

const env = process.env.NODE_ENV || 'prodExt';

const prodExt = {
  app: {
    host: process.env.APP_HOST,
    port: Number(process.env.APP_PORT),
    isStaging: process.env.IS_STAGING,
    baseImageUrl: process.env.BASE_IMAGE_URL,
  },
  jwt: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpirationInSeconds: process.env.JWT_EXPIRY,
  },
  activity: {
    totalConnectLexemeSense: process.env.TOTAL_CONNECT_LEXEME_SENSE,
    totalScriptLexeme: process.env.TOTAL_SCRIPT_LEXEME,
    totalHyphenationLexeme: process.env.TOTAL_HYPHENATION_LEXEME,
  },
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    name: process.env.DB_NAME,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    dialect: process.env.DB_DIALECT,
    sslMode: process.env.DB_SSL_MODE,
    operatorsAliases: false,
    logging: process.env.DB_LOGGING,
  },
  bcrypt: {
    saltFactor: Number(process.env.BCRYPT_SALT_FACTOR),
  },
  wiki: {
    clientId: process.env.WIKI_CLIENT_ID,
    clientSecret: process.env.WIKI_CLIENT_SECRET,
    sparqlQueryUrl: process.env.WIKI_SPARQL_QUERY_URL,
    wikimetaUrl: process.env.WIKI_META_URL,
    wikidataUrl: process.env.WIKI_DATA_URL,
    wikicommonsImageUrl: process.env.WIKI_COMMONS_IMAGE_URL,
  },
};

const production = {
  app: {
    host: process.env.APP_HOST,
    port: Number(process.env.APP_PORT),
    isStaging: process.env.IS_STAGING,
    baseImageUrl: process.env.BASE_IMAGE_URL,
  },
  jwt: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpirationInSeconds: process.env.JWT_EXPIRY,
  },
  activity: {
    totalConnectLexemeSense: process.env.TOTAL_CONNECT_LEXEME_SENSE,
    totalScriptLexeme: process.env.TOTAL_SCRIPT_LEXEME,
    totalHyphenationLexeme: process.env.TOTAL_HYPHENATION_LEXEME,
  },
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    name: process.env.DB_NAME,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    dialect: process.env.DB_DIALECT,
    sslMode: process.env.DB_SSL_MODE,
    operatorsAliases: false,
    logging: process.env.DB_LOGGING,
  },
  bcrypt: {
    saltFactor: Number(process.env.BCRYPT_SALT_FACTOR),
  },
  wiki: {
    clientId: process.env.WIKI_CLIENT_ID,
    clientSecret: process.env.WIKI_CLIENT_SECRET,
    sparqlQueryUrl: process.env.WIKI_SPARQL_QUERY_URL,
    wikimetaUrl: process.env.WIKI_META_URL,
    wikidataUrl: process.env.WIKI_DATA_URL,
    wikicommonsImageUrl: process.env.WIKI_COMMONS_IMAGE_URL,
  },
};

const config = {
  prodExt,
  production,
};

console.log('App is running on', env, 'environment');
module.exports = config[env];
