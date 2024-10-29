module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('language_variants', 'is_rtl', {
      type: Sequelize.DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('language_variants', 'is_rtl');
  },
};