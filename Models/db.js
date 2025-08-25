const { Sequelize } = require('sequelize');


const sequelize = new Sequelize('NurseConnect', 'postgres', 'fdg5ahee', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false, 
});

module.exports = sequelize;
