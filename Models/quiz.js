const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const Quiz = sequelize.define('Quiz', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  naziv: {
    type: DataTypes.STRING,
    allowNull: false
  },
  pitanja: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  predmet: {  
    type: DataTypes.STRING,
    allowNull: false
  },
  razred: {
    type: DataTypes.STRING,
    allowNull: false
  },
  maxPokusaja: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  profesorId: {
  type: DataTypes.INTEGER,
  allowNull: false,
},

   isHidden: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
}, {
  tableName: 'quizzes',
  timestamps: false
});

module.exports = Quiz;

