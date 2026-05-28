const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('Role', {
        RoleId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        Name: { type: DataTypes.STRING(50), allowNull: false, unique: true, validate: { isIn: [['guest', 'player', 'admin']] } },
        Description: { type: DataTypes.STRING(200), allowNull: true }
    }, { tableName: 'Roles', timestamps: false });
};