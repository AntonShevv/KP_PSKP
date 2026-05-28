const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('UserAnswer', {
        UserAnswerId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        AttemptId: { type: DataTypes.INTEGER, allowNull: false },
        QuestionId: { type: DataTypes.INTEGER, allowNull: false },
        AnswerId: { type: DataTypes.INTEGER, allowNull: false },
        PointsEarned: { type: DataTypes.INTEGER, defaultValue: 0 },
        IsCorrect: { type: DataTypes.BOOLEAN, defaultValue: false },
        AnswerTimeMs: { type: DataTypes.INTEGER, allowNull: true },
        CreatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    }, { tableName: 'UserAnswers', timestamps: false });
};