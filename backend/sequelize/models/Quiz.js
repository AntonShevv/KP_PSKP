const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('Quiz', {
        QuizId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        UserId: { type: DataTypes.INTEGER, allowNull: false },
        CategoryId: { type: DataTypes.INTEGER, allowNull: false },
        Title: { type: DataTypes.STRING(200), allowNull: false, validate: { len: [3, 200] } },
        FullDescription: { type: DataTypes.STRING(1000), allowNull: true },
        ImageUrl: { type: DataTypes.STRING(500), allowNull: true },
        Difficulty: { type: DataTypes.ENUM('easy', 'medium', 'hard'), defaultValue: 'medium' },
        DefaultQuestionTime: { type: DataTypes.INTEGER, defaultValue: 30, validate: { min: 5, max: 300 } },
        PointsPerQuestion: { type: DataTypes.INTEGER, defaultValue: 100, validate: { min: 10, max: 1000 } },
        IsPublished: { type: DataTypes.BOOLEAN, defaultValue: false },
        CreatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        UpdatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    }, { tableName: 'Quizzes', timestamps: false });
};