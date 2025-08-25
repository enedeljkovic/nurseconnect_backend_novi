
const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const ReadMaterial = sequelize.define('ReadMaterial', {
  studentid: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  materialid: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  readat: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'ReadMaterials',  
  timestamps: false
});

module.exports = ReadMaterial;
