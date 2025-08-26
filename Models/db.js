
require('dotenv').config();
const { Sequelize } = require('sequelize');

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres.cpyihbhumjsuedrratmr:fdg5ahee@aws-1-eu-central-2.pooler.supabase.com:6543/postgres';

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  pool: { max: 15, min: 0, acquire: 30000, idle: 10000 },
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
});

module.exports = sequelize;
