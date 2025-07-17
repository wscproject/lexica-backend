/* eslint-disable no-unused-expressions */
/* eslint-disable max-len */
require('dotenv').config;
const uuid = require('uuid').v4;
const languageActivities = [
  {
    code: 'id',
    activities: ['connect', 'hyphenation']
  },
  {
    code: 'ms',
    activities: ['connect', 'script', 'hyphenation']
  },
  {
    code: 'bjn',
    activities: ['connect', 'hyphenation']
  },
  {
    code: 'de',
    activities: ['connect', 'hyphenation']
  },
  {
    code: 'en',
    activities: ['connect', 'hyphenation']
  },
  {
    code: 'jv',
    activities: ['connect', 'script', 'hyphenation']
  },
  {
    code: 'min',
    activities: ['connect', 'hyphenation']
  },
  {
    code: 'su',
    activities: ['connect', 'script', 'hyphenation']
  },
  {
    code: 'dag',
    activities: ['connect']
  },
  {
    code: 'es',
    activities: ['connect', 'hyphenation']
  },
  {
    code: 'ban',
    activities: ['connect', 'script', 'hyphenation']
  },
  {
    code: 'ru',
    activities: ['connect']
  },
  {
    code: 'ig',
    activities: ['connect']
  },
  {
    code: 'mad',
    activities: ['connect']
  },
  {
    code: 'dtp',
    activities: ['connect']
  },
  {
    code: 'nl',
    activities: ['connect', 'hyphenation']
  },
  {
    code: 'pt',
    activities: ['connect', 'hyphenation']
  },
  {
    code: 'ha',
    activities: ['connect']
  },
  {
    code: 'bcl',
    activities: ['connect']
  },
  {
    code: 'uk',
    activities: ['connect']
  },
  {
    code: 'fr',
    activities: ['connect']
  },
  {
    code: 'lv',
    activities: ['connect', 'hyphenation']
  },
  {
    code: 'hr',
    activities: ['connect', 'hyphenation']
  },
  {
    code: 'ar',
    activities: ['connect']
  },
  {
    code: 'fa',
    activities: ['connect']
  },
  {
    code: 'yi',
    activities: ['connect']
  },
  {
    code: 'he',
    activities: ['connect']
  },
  {
    code: 'ja',
    activities: ['connect']
  },
  {
    code: 'ko',
    activities: ['connect']
  },
  {
    code: 'th',
    activities: ['connect']
  },
  {
    code: 'vi',
    activities: ['connect']
  },
  {
    code: 'tl',
    activities: ['connect']
  },
  {
    code: 'sw',
    activities: ['connect']
  },
  {
    code: 'yo',
    activities: ['connect']
  },
  {
    code: 'so',
    activities: ['connect']
  },
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const languageActivity of languageActivities) {
      const { code, activities } = languageActivity;

      // Fetch language ID by code
      const language = await queryInterface.sequelize.query(
        `SELECT id FROM languages WHERE code = :code`,
        {
          replacements: { code },
          type: Sequelize.QueryTypes.SELECT
        }
      );

      if (!language || !language[0]) {
        console.log(`Language with code ${code} not found!`);
        continue;
      }

      const languageId = language[0].id;

      // Fetch activity IDs by their titles
      const activityRecords = await queryInterface.sequelize.query(
        `SELECT id, type FROM activities WHERE type IN (:type)`,
        {
          replacements: { type: activities },
          type: Sequelize.QueryTypes.SELECT
        }
      );

      if (!activityRecords.length) {
        console.log(`No activities found for title: ${activities}`);
        continue;
      }

      for (const activity of activityRecords) {
        const existingEntry = await queryInterface.sequelize.query(
          `SELECT id FROM language_activities WHERE language_id = :languageId AND activity_id = :activityId`,
          {
            replacements: { languageId, activityId: activity.id },
            type: Sequelize.QueryTypes.SELECT
          }
        );

        if (existingEntry.length > 0) {
          console.log(`Entry for language ${code} and activity ${activity.type} already exists. Skipping...`);
          continue;
        }

        // Insert into language_activities if not existing
        await queryInterface.bulkInsert('language_activities', [
          {
            id: uuid(), // Automatically generate UUID
            language_id: languageId,
            activity_id: activity.id,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null
          }
        ]);
        console.log(`Inserted entry for language ${code} and activity ${activity.type}`);
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove inserted data
    await queryInterface.bulkDelete('language_activities', null, {});
  },
};
