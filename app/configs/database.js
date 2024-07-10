require('dotenv').config();

process.env.NODE_ENV = 'prodExt';

module.exports = {
  prodExt: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT,
    connectionTimeout: 0,
    pool: {
      max: 1,
      min: 1,
      idle: 200000,
      acquire: 200000,
    },
    logging: false,
  },
  staging: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT,
    connectionTimeout: 0,
    pool: {
      max: 1,
      min: 1,
      idle: 200000,
      acquire: 200000,
    },
    logging: false,
  },
};
