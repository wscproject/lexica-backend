module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameTable('user_preferences', 'users');

    await queryInterface.addColumn('users', 'username', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'token', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn('users', 'wiki_access_token', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    
    await queryInterface.addColumn('users', 'wiki_refresh_token', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.renameColumn('users', 'external_user_id', 'external_id');

    await queryInterface.addColumn('contributions', 'user_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users', // name of Target model
        key: 'id', // key in Target model that we're referencing
      },
    });

    await queryInterface.sequelize.query(`
      UPDATE contributions
      SET user_id = (
        SELECT id FROM users WHERE external_id = contributions.external_user_id
      )
    `);

    await queryInterface.changeColumn('contributions', 'user_id', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'users', // name of Target model
        key: 'id', // key in Target model that we're referencing
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn('users', 'external_id', 'external_user_id');
    await queryInterface.removeColumn('contributions', 'user_id');
    await queryInterface.removeColumn('users', 'token');
    await queryInterface.removeColumn('users', 'wiki_access_token');
    await queryInterface.removeColumn('users', 'wiki_refresh_token');
    await queryInterface.removeColumn('users', 'username');
    await queryInterface.renameTable('users', 'user_preferences');
  },
};