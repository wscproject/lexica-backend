/* eslint-disable no-unused-expressions */
/* eslint-disable max-len */
require('dotenv').config;
const uuid = require('uuid').v4;
const languageActivities = [
  {
    code: 'ms',
    variants: [
      {
        code: 'ms-arab',
        codePreview: 'ms-arab',
        title: 'Tulisan Jawi / توليسن جاوي',
        isRtl: true,
      },
    ],
  },
  {
    code: 'jv',
    variants: [
      {
        code: 'jv-x-q879704',
        codePreview: 'jv-x-Q879704',
        title: 'Hanacaraka / ꦲꦤꦕꦫꦏ',
        isRtl: false,
      },
    ],
  },
  {
    code: 'su',
    variants: [
      {
        code: 'su-x-q51589',
        codePreview: 'su-x-Q51589',
        title: 'Aksara Sunda Baku / ᮃᮊ᮪ᮞᮛ ᮞᮥᮔ᮪ᮓ ᮘᮊᮥ',
        isRtl: false,
      },
    ],
  },
  {
    code: 'ban',
    variants: [
      {
        code: 'ban-bali',
        codePreview: 'ban-bali',
        title: 'Aksara Bali / ᬅᬓ᭄ᬱᬭᬩᬮᬶ',
        isRtl: false,
      },
    ],
  },
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const languageActivity of languageActivities) {
      const { code, variants } = languageActivity;

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

      for (const variant of variants) {
        const existingEntry = await queryInterface.sequelize.query(
          `SELECT id FROM language_variants WHERE language_id = :languageId AND code = :code`,
          {
            replacements: { languageId, code: variant.code },
            type: Sequelize.QueryTypes.SELECT
          }
        );

        if (existingEntry.length > 0) {
          console.log(`Entry for language ${code} and variant ${variant.code} already exists. Skipping...`);
          continue;
        }

        // Insert into language_variants if not existing
        await queryInterface.bulkInsert('language_variants', [
          {
            id: uuid(), // Automatically generate UUID
            language_id: languageId,
            code: variant.code,
            code_preview: variant.codePreview,
            title: variant.title,
            is_rtl: variant.isRtl,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null
          }
        ]);
        console.log(`Inserted entry for language ${code} and activity ${variant.code}`);
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove inserted data
    await queryInterface.bulkDelete('language_variants', null, {});
  },
};
