import Sequelize from 'sequelize';
import Config from '../configs/env.config';

module.exports = (sequelizeConnection) => {
  const Activity = sequelizeConnection.define('Activity', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    title: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    type: {
      type: Sequelize.ENUM('connect', 'script', 'match', 'hyphenation'),
      allowNull: false,
      unique: true,
    },
    imageUrl: {
      field: 'image_url',
      type: Sequelize.TEXT,
      allowNull: false,
      get() {
        return this.getDataValue('imageUrl') ? `${Config.app.baseImageUrl}/${this.getDataValue('imageUrl')}` : this.getDataValue('imageUrl');
      }
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
    tableName: 'activities',
    paranoid: true,
  });

  Activity.associate = (models) => {
    Activity.belongsToMany(models.Language, {
      through: models.LanguageActivity,
      as: 'languages', // Alias for User
      foreignKey: 'activityId', // Custom foreign key in the through table
      otherKey: 'languageId', // Custom other key in the through table
    });
  };

  return Activity;
};
