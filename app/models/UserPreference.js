import Sequelize from 'sequelize';

module.exports = (sequelizeConnection) => {
  const UserPreference = sequelizeConnection.define('UserPreference', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    languageId: {
      field: 'language_id',
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'languages', // name of Target model
        key: 'id', // key in Target model that we're referencing
      },
    },
    language: {
      field: 'language',
      type: Sequelize.STRING,
      allowNull: true,
    },
    displayLanguage: {
      field: 'display_language',
      type: Sequelize.STRING,
      allowNull: true,
    },
    displayTheme: {
      field: 'display_theme',
      type: Sequelize.ENUM('dark', 'light'),
      allowNull: false,
      defaultValue: 'light',
    },
    userId: {
      field: 'user_id',
      type: Sequelize.STRING,
      allowNull: false,
    },
    createdAt: {
      field: 'created_at',
      type: Sequelize.DATE,
      allowNull: true,
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
  }, {
    freezeTableName: true,
    tableName: 'user_preferences',
    paranoid: true,
  });

  return UserPreference;
};
