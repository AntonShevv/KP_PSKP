const { Sequelize, DataTypes, Op } = require('sequelize');


const isDocker = process.env.NODE_ENV === 'production' || process.env.DB_HOST === 'sqlserver';

const sequelize = new Sequelize(
    process.env.DB_NAME || 'OnlineQuiz',
    process.env.DB_USER || 'sa',
    process.env.DB_PASSWORD || 'Qwerty0987!',
    {
        host: isDocker ? 'sqlserver' : (process.env.DB_HOST || 'DESKTOP-QO6K9KT'),
        dialect: 'mssql',
        dialectOptions: {
            options: {
                ...(isDocker ? {} : { instanceName: 'MSSQLSERVER01' }),
                encrypt: false,
                trustServerCertificate: true
            }
        },
        pool: {
            max: 10,
            min: 0,
            idle: 30000
        },
        logging: false
    }
);

const Role = require('./Role')(sequelize, DataTypes);
const User = require('./User')(sequelize, DataTypes);
const Category = require('./Category')(sequelize, DataTypes);
const Quiz = require('./Quiz')(sequelize, DataTypes);
const Question = require('./Question')(sequelize, DataTypes);
const Answer = require('./Answer')(sequelize, DataTypes);
const GameSession = require('./GameSession')(sequelize, DataTypes);
const SessionPlayer = require('./SessionPlayer')(sequelize, DataTypes);
const PlayerAnswer = require('./PlayerAnswer')(sequelize, DataTypes);
const Attempt = require('./Attempt')(sequelize, DataTypes);
const UserAnswer = require('./UserAnswer')(sequelize, DataTypes);
const UserStatistic = require('./UserStatistic')(sequelize, DataTypes);

const models = {
    Role,
    Op,
    User,
    Category,
    Quiz,
    Question,
    Answer,
    GameSession,
    SessionPlayer,
    PlayerAnswer,
    Attempt,
    UserAnswer,
    UserStatistic
};

const setupAssociations = require('./associations.js');
setupAssociations(models);

module.exports = {
    sequelize,
    ...models
};