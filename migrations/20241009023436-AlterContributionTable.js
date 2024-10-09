module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('contributions', 'activity_type', {
      type: Sequelize.ENUM('connect', 'script', 'match', 'hyphenate'),
      allowNull: false,
      defaultValue: 'connect',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('contributions', 'activity_type');
  },
};