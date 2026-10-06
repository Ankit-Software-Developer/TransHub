// src/config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'transporter_master',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || 'Ankit@6980',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? (msg) => {
      // Suppress noisy logs, log only queries if needed or errors
      if (process.env.DB_DEBUG === 'true') console.log(msg);
    } : false,
    pool: {
      max: 20,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      decimalNumbers: true, // Returns DECIMAL as string or float with full accuracy
      charset: 'utf8mb4',
    },
    define: {
      underscored: true,
      timestamps: true,
      paranoid: true, // Soft-delete (deleted_at) by default for critical data protection
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
    },
  }
);

const testDbConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL Database connected successfully with Sequelize.');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to MySQL database:', error.message);
    return false;
  }
};

module.exports = {
  sequelize,
  testDbConnection,
};
