/* eslint-disable no-unused-expressions */
/* eslint-disable max-len */
require('dotenv').config;
const uuid = require('uuid').v4;
const activities = [
  {
    id: uuid(),
    title: 'Leksem ke Butir',
    description: 'Hubungkan Leksem ke Butir dengan konsep yang sepadan',
    image_url: 'images/activity/Connect.svg',
    order: 1,
    type: 'connect',
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: uuid(),
    title: 'Aksara non-Latin',
    description: 'Masukan aksara non-Latin dari sebuah Leksem',
    image_url: 'images/activity/Script.svg',
    order: 2,
    type: 'script',
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: uuid(),
    title: 'Hifenasi',
    description: 'Membagi leksem menjadi suku kata',
    image_url: 'images/activity/Hyphenate.svg',
    order: 3,
    type: 'hyphenation',
    created_at: new Date(),
    updated_at: new Date(),
  },
];

module.exports = {
  up: async (queryInterface) => {
    for (const activity of activities) {
      const exists = await queryInterface.rawSelect('activities', {
        where: {
          title: activity.title,
        },
      }, ['id']);

      if (!exists) {
        await queryInterface.bulkInsert('activities', [activity]);
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove inserted data
    await queryInterface.bulkDelete('activities', null, {});
  },
};
