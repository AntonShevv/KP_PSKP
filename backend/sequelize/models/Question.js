const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('Question', {
        QuestionId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        QuizId: { type: DataTypes.INTEGER, allowNull: false },
        Text: { type: DataTypes.STRING(500), allowNull: false, validate: { notEmpty: true } },
        Type: { type: DataTypes.ENUM('single', 'multiple', 'text'), defaultValue: 'single' },
        Points: { type: DataTypes.INTEGER, defaultValue: 100, validate: { min: 10, max: 1000 } },
        OrderNum: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0 } },
        TimeLimit: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 5, max: 300 } },
        MediaUrl: { type: DataTypes.STRING(500), allowNull: true },
        MediaType: { type: DataTypes.STRING(20), allowNull: true, validate: { isIn: [['image', 'video', 'audio']] } },
        CreatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        UpdatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    }, { tableName: 'Questions', timestamps: false });
};