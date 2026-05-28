const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('SessionPlayer', {
        SessionPlayerId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        SessionId: { type: DataTypes.INTEGER, allowNull: false },
        UserId: { type: DataTypes.INTEGER, allowNull: false },
        Score: { type: DataTypes.INTEGER, defaultValue: 0 },
        CorrectAnswers: { type: DataTypes.INTEGER, defaultValue: 0 },
        JoinedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    }, { 
        tableName: 'SessionPlayers', 
        timestamps: false,
        indexes: [{ unique: true, fields: ['SessionId', 'UserId'] }]
    });
};