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

  return Language;
};
