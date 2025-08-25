
const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const Subject = sequelize.define('Subject', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  naziv: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'subjects',
  timestamps: false
});

Subject.associate = (models) => {
  Subject.belongsToMany(models.Profesor, {
    through: {
      model: 'ProfessorSubjects',
      unique: false,
      timestamps: false 
    },
    foreignKey: 'subjectId',
  });
};

module.exports = Subject;
