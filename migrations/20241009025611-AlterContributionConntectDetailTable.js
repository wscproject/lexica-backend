module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('contribution_connect_details', 'external_item_id', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('contribution_connect_details', 'external_item_id');
  },
};