const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const Student = sequelize.define('Student', { 
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
    },
    razred: {
        type: DataTypes.STRING, 
        allowNull: false
    }
}, {
    tableName: 'students',  
    freezeTableName: true,  
    timestamps: false
});

module.exports = Student;
