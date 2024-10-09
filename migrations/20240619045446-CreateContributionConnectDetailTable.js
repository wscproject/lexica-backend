module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('contribution_connect_details', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      contributionId: {
        field: 'contribution_id',
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'contributions', // name of Target model
          key: 'id', // key in Target model that we're referencing
        },
      },
      externalLexemeId: {
        field: 'external_lexeme_id',
        type: Sequelize.STRING,
        allowNull: false,
      },
      externalLexemeSenseId: {
        field: 'external_lexeme_sense_id',
        type: Sequelize.STRING,
        allowNull: false,
      },
      externalLanguageId: {
        field: 'external_language_id',
        type: Sequelize.STRING,
        allowNull: false,
      },
      externalCategoryId: {
        field: 'external_category_id',
        type: Sequelize.STRING,
        allowNull: false,
      },
      lemma: {
        field: 'lemma',
        type: Sequelize.STRING,
        allowNull: true,
      },
      category: {
        field: 'category',
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'noItem', 'skipped'),
        allowNull: false,
      },
      order: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      createdAt: {
        field: 'created_at',
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('now'),
        allowNull: false,
      },
      updatedAt: {
        field: 'updated_at',
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('now'),
        allowNull: false,
      },
      deletedAt: {
        field: 'deleted_at',
        type: Sequelize.DATE,
        allowNull: true,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('contribution_connect_details');
  },
};
