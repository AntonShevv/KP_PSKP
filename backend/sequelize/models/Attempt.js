const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('Attempt', {
        AttemptId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        UserId: { type: DataTypes.INTEGER, allowNull: false },
        QuizId: { type: DataTypes.INTEGER, allowNull: false },
        StartedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        FinishedAt: { type: DataTypes.DATE, allowNull: true },
        Status: { type: DataTypes.ENUM('in_progress', 'completed', 'abandoned'), defaultValue: 'in_progress' },
        Score: { type: DataTypes.INTEGER, defaultValue: 0 }
    }, { tableName: 'Attempts', timestamps: false });
};