module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('user_preferences', 'activity_type', {
      type: Sequelize.ENUM('connect', 'script', 'match', 'hyphenate'),
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('user_preferences', 'activity_type');
  },
};