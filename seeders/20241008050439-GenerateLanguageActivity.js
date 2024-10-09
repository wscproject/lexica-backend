/* eslint-disable no-unused-expressions */
/* eslint-disable max-len */
require('dotenv').config;
const uuid = require('uuid').v4;
const languageActivities = [
  {
    code: 'id',
    activities: ['Leksem ke Butir']
  },
  {
    code: 'ms',
    activities: ['Leksem ke Butir', 'Aksara non-Latin']
  },
  {
    code: 'bjn',
    activities: ['Leksem ke Butir']
  },
  {
    code: 'de',
    activities: ['Leksem ke Butir']
  },
  {
    code: 'en',
    activities: ['Leksem ke Butir']
  },
  {
    code: 'jv',
    activities: ['Leksem ke Butir', 'Aksara non-Latin']
  },
  {
    code: 'min',
    activities: ['Leksem ke Butir']
  },
  {
    code: 'su',
    activities: ['Leksem ke Butir', 'Aksara non-Latin']
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
        `SELECT id, title FROM activities WHERE title IN (:title)`,
        {
          replacements: { title: activities },
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
          console.log(`Entry for language ${code} and activity ${activity.title} already exists. Skipping...`);
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
        console.log(`Inserted entry for language ${code} and activity ${activity.title}`);
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove inserted data
    await queryInterface.bulkDelete('language_activities', null, {});
  },
};
