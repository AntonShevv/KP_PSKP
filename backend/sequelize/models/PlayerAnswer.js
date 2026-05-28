const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('PlayerAnswer', {
        PlayerAnswerId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        SessionPlayerId: { type: DataTypes.INTEGER, allowNull: false },
        QuestionId: { type: DataTypes.INTEGER, allowNull: false },
        AnswerId: { type: DataTypes.INTEGER, allowNull: true },
        AnswerText: { type: DataTypes.TEXT, allowNull: true },
        ResponseTimeMs: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0 } },
        IsCorrect: { type: DataTypes.BOOLEAN, allowNull: false },
        PointsEarned: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0 } },
        AnsweredAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    }, { tableName: 'PlayerAnswers', timestamps: false });
};