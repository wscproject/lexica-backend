/* eslint-disable no-unused-expressions */
/* eslint-disable max-len */
require('dotenv').config;
const uuid = require('uuid').v4;

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('languages', [
      {
        id: uuid(),
        external_id: 'Q9240',
        code: 'id',
        title_id: 'Bahasa Indonesia',
        title_en: 'Indonesian',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuid(),
        external_id: 'Q1860',
        code: 'en',
        title_id: 'Bahasa Inggris',
        title_en: 'English',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuid(),
        external_id: 'Q9237',
        code: 'ms',
        title_id: 'Bahasa Melayu',
        title_en: 'Malay',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuid(),
        external_id: 'Q13324',
        code: 'min',
        title_id: 'Bahasa Minangkabau',
        title_en: 'Minangkabau',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuid(),
        external_id: 'Q33151',
        code: 'bjn',
        title_id: 'Bahasa Banjar',
        title_en: 'Banjar',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  down: async () => {},
};
