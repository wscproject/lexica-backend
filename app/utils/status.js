module.exports = {
  ERROR: {
    MISSING_PARAMETERS: {
      CODE: 1000,
      MESSAGE: 'Missing parameter.',
    },
    FORBIDDEN: {
      CODE: 40300,
      MESSAGE: 'Forbidden.',
    },
    TOKEN_EXPIRED: {
      CODE: 44001,
      MESSAGE: 'Token expired.',
    },
    TOKEN_REQUIRED: {
      CODE: 44002,
      MESSAGE: 'Token required.',
    },
    TOKEN_INVALID: {
      CODE: 44004,
      MESSAGE: 'Token invalid.',
    },
    REFRESH_TOKEN_INVALID: {
      CODE: 44005,
      MESSAGE: 'Refresh token invalid.',
    },
    API_KEY_INVALID: {
      CODE: 44006,
      MESSAGE: 'API key invalid.',
    },
    FAILED_GET_CSRF_TOKEN: {
      CODE: 44007,
      MESSAGE: 'Failed to get csrf token.',
    },

    // LEXEME
    LEXEMES_NOT_FOUND: {
      CODE: 500200,
      MESSAGE: 'Lexemes not found.',
    },
    LEXEME_ALREADY_EXIST: {
      CODE: 500201,
      MESSAGE: 'Lexeme already exist.',
    },

    // ENTITY
    ENTITY_NOT_FOUND: (entityId = '') => {
      return {
        CODE: 500300,
        MESSAGE: `Entity with id ${entityId} not found.`,
      };
    },
    SEARCH_ENTITY_ERROR: {
      CODE: 500301,
      MESSAGE: 'Failed when searching entities.',
    },

    // CONTRIBUTION DETAIL
    CONTRIBUTION_DETAIL_NOT_FOUND: {
      CODE: 500400,
      MESSAGE: 'Contribution detail not found.',
    },
    FAILED_UPDATE_SENSE_IN_WIKI: {
      CODE: 500401,
      MESSAGE: 'Failed update lexeme sense with wikidata API.',
    },
    ON_GOING_CONTRIBUTION_NOT_FOUND: {
      CODE: 500402,
      MESSAGE: 'Ongoing contribution not found.',
    },

    // LEXEME LANGUAGE
    LANGUAGE_NOT_FOUND: {
      CODE: 500500,
      MESSAGE: 'Language not found.',
    },
    LANGUAGE_ALREADY_EXIST: {
      CODE: 500501,
      MESSAGE: 'Language already exist.',
    },
    LANGUAGE_ACTIVITY_NOT_FOUND: {
      CODE: 500502,
      MESSAGE: 'Language activity not found.',
    },
    LANGUAGE_ACTIVITY_ALREADY_EXIST: {
      CODE: 500503,
      MESSAGE: 'Language activity already exist.',
    },

    // ACTIVITY
    ACTIVITY_NOT_FOUND: {
      CODE: 500600,
      MESSAGE: 'Activity not found for this language.',
    },
    PENDING_ACTIVITY: {
      CODE: 500601,
      MESSAGE: 'Another pending activity still on progress.',
    },

    // WIKIDATA LANGUAGE
    WIKIDATA_LANGUAGE_NOT_FOUND: {
      CODE: 500700,
      MESSAGE: 'Wikidata language not found.',
    },

    // GENERAL ERROR
    SOMETHING_WENT_WRONG: {
      CODE: 60001,
      MESSAGE: 'Something Went Wrong, Please Try Again Later.',
    },
  },
};
