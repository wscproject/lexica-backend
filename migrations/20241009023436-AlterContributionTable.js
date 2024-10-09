module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('contributions', 'activity_type', {
      type: Sequelize.ENUM('connect', 'script', 'match', 'hyphenate'),
      allowNull: false,
      defaultValue: 'connect',
    });

    await queryInterface.addColumn('contributions', 'language_activity_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'language_activities', // name of Target model
        key: 'id', // key in Target model that we're referencing
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('contributions', 'activity_type');
  },
};