/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
import Sequelize from 'sequelize';
import Fs from 'fs';
import Path from 'path';
import Config from '../configs/env.config';
import mysql2 from 'mysql2';

const basename = Path.basename(module.filename);
const db = {};

const sequelizeConnection = new Sequelize(Config.db.name,
  Config.db.user,
  Config.db.password,
  {
    host: Config.db.host,
    dialect: Config.db.dialect,
    dialectModule: mysql2,
    operatorsAliases: '0',
    dialectOptions: {
      ssl: Config.db.sslMode === 'true',
    },
    // Request Timeout here in milissecond
    pool: {
      max: 100,
      min: 0,
      acquire: 30000,
      idle: 20000,
    },
    logging: Number(Config.db.logging),
  });

Fs.readdirSync(__dirname)
  .filter(file => (file.indexOf('.') !== 0)
    && (file !== basename)
    && (file.slice(-3) === '.js'))
  .forEach((file) => {
    const model = require(Path.join(__dirname, file))(sequelizeConnection, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelizeConnection;
db.Sequelize = Sequelize;

module.exports = db;

// sequelizeConnection.sync({ force: false });
