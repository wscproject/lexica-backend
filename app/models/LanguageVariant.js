import Sequelize from 'sequelize';

module.exports = (sequelizeConnection) => {
  const LanguageVariant = sequelizeConnection.define('LanguageVariant', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    languageId: {
      field: 'language_id',
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'languages', // name of Target model
        key: 'id', // key in Target model that we're referencing
      },
    },
    code: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    codePreview: {
      field: 'code_preview',
      type: Sequelize.STRING,
      allowNull: false,
    },
    title: {
      type: Sequelize.STRING,
      allowNull: false,
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
    tableName: 'language_variants',
    paranoid: true,
  });

  LanguageVariant.associate = (models) => {
    LanguageVariant.belongsTo(models.Language, {
      as: 'language',
      foreignKey: 'languageId',
    });

    LanguageVariant.hasMany(models.ContributionScriptDetail, {
      as: 'contributionScriptDetails',
      foreignKey: 'languageVariantId',
    });    
  };

  return LanguageVariant;
};
