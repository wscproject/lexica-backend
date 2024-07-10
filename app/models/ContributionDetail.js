import Sequelize from 'sequelize';

module.exports = (sequelizeConnection) => {
  const ContributionDetail = sequelizeConnection.define('ContributionDetail', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    contributionId: {
      field: 'contribution_id',
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'contributions', // name of Target model
        key: 'id', // key in Target model that we're referencing
      },
    },
    lexemeId: {
      field: 'lexeme_id',
      type: Sequelize.STRING,
      allowNull: false,
    },
    lexemeSenseId: {
      field: 'lexeme_sense_id',
      type: Sequelize.STRING,
      allowNull: false,
    },
    languageId: {
      field: 'language_id',
      type: Sequelize.STRING,
      allowNull: false,
    },
    categoryId: {
      field: 'category_id',
      type: Sequelize.STRING,
      allowNull: false,
    },
    lemma: {
      field: 'lemma',
      type: Sequelize.STRING,
      allowNull: true,
    },
    category: {
      field: 'category',
      type: Sequelize.STRING,
      allowNull: true,
    },
    status: {
      type: Sequelize.ENUM('pending', 'completed', 'noItem', 'skipped'),
      allowNull: false,
    },
    order: {
      type: Sequelize.INTEGER,
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
    tableName: 'contribution_details',
    paranoid: true,
  });

  ContributionDetail.associate = (models) => {
    ContributionDetail.belongsTo(models.Contribution, {
      as: 'contribution',
      foreignKey: 'contributionId',
    });
  };

  return ContributionDetail;
};
