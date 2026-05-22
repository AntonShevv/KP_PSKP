const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('UserStatistic', {
        StatId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        UserId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
        TotalGamesPlayed: { type: DataTypes.INTEGER, defaultValue: 0 },
        TotalWins: { type: DataTypes.INTEGER, defaultValue: 0 },
        AverageScore: { type: DataTypes.FLOAT, defaultValue: 0 },
        TotalQuizzesCreated: { type: DataTypes.INTEGER, defaultValue: 0 },
        FavoriteCategoryId: { type: DataTypes.INTEGER, allowNull: true },
        UpdatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    }, { 
        tableName: 'UserStatistics', 
        timestamps: false,
        hooks: { beforeUpdate: (stats) => { stats.UpdatedAt = new Date(); } }
    });
};