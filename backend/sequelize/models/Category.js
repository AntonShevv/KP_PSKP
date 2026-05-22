const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('Category', {
        CategoryId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        Name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        Description: { type: DataTypes.STRING(300), allowNull: true },
        CreatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    }, { tableName: 'Categories', timestamps: false });
};