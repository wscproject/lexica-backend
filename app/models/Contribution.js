import Sequelize from 'sequelize';

module.exports = (sequelizeConnection) => {
  const Contribution = sequelizeConnection.define('Contribution', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    externalUserId: {
      field: 'external_user_id',
      type: Sequelize.STRING,
      allowNull: false,
    },
    startTime: {
      field: 'start_time',
      type: Sequelize.DATE,
      allowNull: false,
    },
    externalLanguageId: {
      field: 'external_language_id',
      type: Sequelize.STRING,
      allowNull: false,
    },
    status: {
      type: Sequelize.ENUM('pending', 'completed'),
      allowNull: false,
    },
    activityType: {
      field: 'activity_type',
      type: Sequelize.ENUM('connect', 'script', 'match', 'hyphenate'),
      allowNull: false,
      defaultValue: 'connect',
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
    tableName: 'contributions',
    paranoid: true,
  });

  Contribution.associate = (models) => {
    Contribution.hasMany(models.ContributionConnectDetail, {
      as: 'contributionConnectDetails',
      foreignKey: 'contributionId',
    });
  };

  return Contribution;
};
