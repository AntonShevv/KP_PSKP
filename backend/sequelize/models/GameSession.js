const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('GameSession', {
        SessionId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        QuizId: { type: DataTypes.INTEGER, allowNull: false },
        HostId: { type: DataTypes.INTEGER, allowNull: false },
        JoinCode: { type: DataTypes.STRING(10), allowNull: false, unique: true, validate: { len: [6, 10] } },
        Status: { type: DataTypes.ENUM('waiting', 'active', 'finished'), defaultValue: 'waiting' },
        QuestionStartedAt: { type: DataTypes.DATE, allowNull: true },
        CurrentQuestionIndex: { type: DataTypes.INTEGER, defaultValue: 0 },
        CreatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        StartedAt: { type: DataTypes.DATE, allowNull: true },
        EndedAt: { type: DataTypes.DATE, allowNull: true }
    }, { tableName: 'GameSessions', timestamps: false });
};