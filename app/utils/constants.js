module.exports = {
  PAGINATION: {
    LIMIT: 10,
    PAGE: 1,
  },
  CONTRIBUTION_STATUS: {
    PENDING: 'pending',
    COMPLETED: 'completed',
  },
  CONTRIBUTION_DETAIL_STATUS: {
    PENDING: 'pending',
    COMPLETED: 'completed',
    NO_ITEM: 'noItem',
    SKIPPED: 'skipped',
  },
  DISPLAY_LANGUAGE: {
    ID: {
      ISO: 'id',
    },
    EN: {
      ISO: 'en',
    }
  },
  WIKI_ERROR_CODE: {
    INVALID_AUTH: 'mwoauth-invalid-authorization',
  },
  WIKIDATA_PROPERTY_CODE: {
    IMAGE: 'P18',
    ANTONYM: 'P5974',
    SYNONYM: 'P5973',
    TRANSLATION: 'P5972',
    LOCATION_OF_SENSE_USAGE: 'P6084',
    LANGUAGE_STYLE: 'P6191',
    DESCRIBED_AT_URL: 'P973',
    INSTANCE_OF: 'P31',
    SUBCLASS: 'P279',
    PART_OF: 'P361',
    FOLLOWS: 'P155',
    TEXT_AUDIO: 'P989',
    TAXON_NAME: 'P225',
    HAS_PARTS: 'P527',
    HAS_CHARACTERISTICS: 'P1552',
    USAGE_EXAMPLE: 'P5831',
    COMBINES_LEXEMES: 'P5238',
    FIELD_OF_USAGE: 'P9488',
    SEMANTIC_GENDER: 'P10339',
    GLOSS_QUOTE: 'P8394',
    ITEM_FOR_THIS_SENSE: 'P5137',
    SUBJECT_SENSE: 'P6072',
  },
  CONTRIBUTION_DETAIL_ACTION: {
    ADD: 'add',
    SKIP: 'skip',
    NO_ITEM: 'noItem',
  },
  DISPLAY_THEME: {
    DEFAULT: 'default',
    DARK: 'dark',
    LIGHT: 'light',
  },
  ACTIVITY: {
    CONNECT: 'connect',
    SCRIPT: 'script',
    HYPHENATION: 'hyphenation',
  }
};
