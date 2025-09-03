const { DataTypes } = require('sequelize');
const sequelize = require('./db');
const Student = require('./student');

const Material = sequelize.define('Material', {
  naziv: {
    type: DataTypes.STRING,
    allowNull: false
  },
  opis: {
    type: DataTypes.STRING,
    allowNull: false
  },
  datumkreiranja: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'datumkreiranja'
  },
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  subject: { 
    type: DataTypes.STRING,
    allowNull: false
  },
  razred: {
    type: DataTypes.STRING,
    allowNull: false
  },
   isHidden: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
}, 
{
  tableName: 'materials',
  timestamps: false
});

module.exports = Material;

