module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('user_preferences', 'display_theme', {
      type: Sequelize.ENUM('default', 'light', 'dark'),
      allowNull: false,
      defaultValue: 'default',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('user_preferences', 'display_theme');
  },
};