module.exports = (sequelize, DataTypes) => sequelize.define('Answer', {
    AnswerId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    QuestionId: { type: DataTypes.INTEGER, allowNull: false },
    Text: { type: DataTypes.STRING(300), allowNull: false, validate: { notEmpty: true } },
    IsCorrect: { type: DataTypes.BOOLEAN, defaultValue: false },
    OrderNum: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0 } },
    MediaUrl: DataTypes.STRING(500),
    MediaType: { type: DataTypes.STRING(20), validate: { isIn: [['image', 'video', 'audio']] } },
    CreatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { tableName: 'Answers', timestamps: false });