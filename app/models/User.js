import Sequelize from 'sequelize';

module.exports = (sequelizeConnection) => {
  const User = sequelizeConnection.define('User', {
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
    languageCode: {
      field: 'language_code',
      type: Sequelize.STRING,
      allowNull: true,
    },
    displayLanguageCode: {
      field: 'display_language_code',
      type: Sequelize.STRING,
      allowNull: true,
    },
    displayTheme: {
      field: 'display_theme',
      type: Sequelize.ENUM('dark', 'light'),
      allowNull: false,
      defaultValue: 'light',
    },
    activityType: {
      field: 'activity_type',
      type: Sequelize.ENUM('connect', 'script', 'match', 'hyphenate'),
      allowNull: true,
    },
    externalId: {
      field: 'external_id',
      type: Sequelize.STRING,
      allowNull: false,
    },
    username: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    token: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    wikiAccessToken: {
      field: 'wiki_access_token',
      type: Sequelize.TEXT,
      allowNull: true,
    },
    wikiRefreshToken: {
      field: 'wiki_refresh_token',
      type: Sequelize.TEXT,
      allowNull: true,
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
    tableName: 'users',
    paranoid: true,
  });

  return User;
};
