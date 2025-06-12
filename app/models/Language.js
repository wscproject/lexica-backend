import Sequelize from 'sequelize';

module.exports = (sequelizeConnection) => {
  const Language = sequelizeConnection.define('Language', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    externalId: {
      field: 'external_id',
      type: Sequelize.STRING,
      allowNull: false,
    },
    code: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    title: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    isRtl: {
      field: 'is_rtl',
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    createdAt: {
      field: 'created_at',
      type: Sequelize.DATE,
      defaultValue: Sequelize.fn('now'),
      allowNull: false,
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
    tableName: 'languages',
    paranoid: true,
  });

  Language.associate = (models) => {
    Language.belongsToMany(models.Language, {
      through: models.LanguageActivity,
      as: 'activities', // Alias for User
      foreignKey: 'languageId', // Custom foreign key in the through table
      otherKey: 'activityId', // Custom other key in the through table
    });
    
    Language.hasOne(models.LanguageVariant, {
      as: 'languageVariant',
      foreignKey: 'languageId',
    });
  };

  return Language;
};
