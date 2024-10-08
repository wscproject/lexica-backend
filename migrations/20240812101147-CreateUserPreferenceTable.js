module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_preferences', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      languageId: {
        field: 'language_id',
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'languages', // name of Target model
          key: 'id', // key in Target model that we're referencing
        },
      },
      language: {
        field: 'language',
        type: Sequelize.STRING,
        allowNull: true,
      },
      displayLanguage: {
        field: 'display_language',
        type: Sequelize.STRING,
        allowNull: true,
      },
      userId: {
        field: 'user_id',
        type: Sequelize.STRING,
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
    await queryInterface.dropTable('user_preferences');
  },
};
