const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('User', {
        UserId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        RoleId: { type: DataTypes.INTEGER, allowNull: false },
        Login: { type: DataTypes.STRING(50), allowNull: false, unique: true, validate: { len: [3, 50] } },
        PasswordHash: { type: DataTypes.STRING(255), allowNull: false },
        Email: { type: DataTypes.STRING(100), allowNull: false, unique: true, validate: { isEmail: true } },
        Phone: { type: DataTypes.STRING(20), allowNull: true },
        AvatarUrl: { type: DataTypes.STRING(500), allowNull: true },
        IsActive: { type: DataTypes.BOOLEAN, defaultValue: true },
        CanCreate: { type: DataTypes.BOOLEAN, defaultValue: true },
        Rating: { type: DataTypes.INTEGER, defaultValue: 0 },
        CreatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        UpdatedAt: { type: DataTypes.DATE, allowNull: true }
    }, { 
        tableName: 'Users', 
        timestamps: false,
        hooks: { beforeUpdate: (user) => { user.UpdatedAt = new Date(); } }
    });
};