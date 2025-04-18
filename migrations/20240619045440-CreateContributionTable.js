module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('contributions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      externalUserId: {
        field: 'external_user_id',
        type: Sequelize.STRING,
        allowNull: false,
      },
      startTime: {
        field: 'start_time',
        type: Sequelize.DATE,
        allowNull: false,
      },
      externalLanguageId: {
        field: 'external_language_id',
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed'),
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
    await queryInterface.dropTable('contributions');
  },
};
