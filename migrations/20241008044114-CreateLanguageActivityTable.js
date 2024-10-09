module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('language_activities', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      languageId: {
        field: 'language_id',
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'languages', // name of Target model
          key: 'id', // key in Target model that we're referencing
        },
      },
      activityId: {
        field: 'activity_id',
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'activities', // name of Target model
          key: 'id', // key in Target model that we're referencing
        },
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
    await queryInterface.dropTable('language_activities');
  },
};
