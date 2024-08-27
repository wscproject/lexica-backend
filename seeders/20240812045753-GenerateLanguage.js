/* eslint-disable no-unused-expressions */
/* eslint-disable max-len */
require('dotenv').config;
const uuid = require('uuid').v4;
const languages = [
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
  {
    id: uuid(),
    external_id: 'Q33549',
    code: 'jv',
    title: 'Jawa',
    created_at: new Date(),
    updated_at: new Date(),
  },
];

module.exports = {
  up: async (queryInterface) => {
    for (const language of languages) {
      const exists = await queryInterface.rawSelect('languages', {
        where: {
          external_id: language.external_id,
        },
      }, ['id']);

      if (!exists) {
        await queryInterface.bulkInsert('languages', [language]);
      }
    }
  },

  down: async () => {},
};
