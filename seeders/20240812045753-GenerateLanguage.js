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
        title: 'Bahasa Indonesia',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuid(),
        external_id: 'Q1860',
        code: 'en',
        title: 'English',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuid(),
        external_id: 'Q9237',
        code: 'ms',
        title: 'Bahasa Melayu',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuid(),
        external_id: 'Q13324',
        code: 'min',
        title: 'Minangkabau',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuid(),
        external_id: 'Q33151',
        code: 'bjn',
        title: 'Banjar',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  down: async () => {},
};
