module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('languages', 'is_rtl', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('languages', 'is_rtl');
  },
};