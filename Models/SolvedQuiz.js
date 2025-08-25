const { DataTypes } = require('sequelize');
const sequelize = require('./db');
const Student = require('./student');

const SolvedQuiz = sequelize.define('SolvedQuiz', {
  studentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'studentid'
  },
  quizId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'quizid'
  },
  result: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'result'
  },
  total: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  solvedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'solvedat'
  }
}, {
  tableName: 'SolvedQuizzes',
  timestamps: false,
  defaultScope: {
    attributes: {
      exclude: ['StudentId', 'QuizId']  
    }
  }
});

SolvedQuiz.belongsTo(Student, {
  foreignKey: {
    name: 'studentid',
    field: 'studentid'
  },
  targetKey: 'id',
  as: 'student',
  constraints: false
});

module.exports = SolvedQuiz;
