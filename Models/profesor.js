
const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const Profesor = sequelize.define('Profesor', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ime: {
    type: DataTypes.STRING,
    allowNull: false
  },
  prezime: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  kod: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'profesori',
  timestamps: false
});

Profesor.associate = (models) => {
  Profesor.belongsToMany(models.Subject, {
    through: {
      model: 'ProfessorSubjects',
      unique: false,
      timestamps: false 
    },
    foreignKey: 'profesorId',
  });
};

module.exports = Profesor;
