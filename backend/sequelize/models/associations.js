module.exports = (models) => {
    const {
        Role, User, Category, Quiz, Question, Answer,
        GameSession, SessionPlayer, PlayerAnswer,
        Attempt, UserAnswer, UserStatistic
    } = models;

    // =============================================
    // Roles ↔ Users
    // =============================================
    Role.hasMany(User, { foreignKey: 'RoleId', as: 'users' });
    User.belongsTo(Role, { foreignKey: 'RoleId', as: 'role' });

    // =============================================
    // Users ↔ Quizzes (автор)
    // =============================================
    User.hasMany(Quiz, { foreignKey: 'UserId', as: 'quizzes' });
    Quiz.belongsTo(User, { foreignKey: 'UserId', as: 'author' });

    // =============================================
    // Categories ↔ Quizzes
    // =============================================
    Category.hasMany(Quiz, { foreignKey: 'CategoryId', as: 'quizzes' });
    Quiz.belongsTo(Category, { foreignKey: 'CategoryId', as: 'category' });

    // =============================================
    // Categories ↔ UserStatistics (любимая категория)
    // =============================================
    Category.hasMany(UserStatistic, { foreignKey: 'FavoriteCategoryId', as: 'favoriteForUsers' });
    UserStatistic.belongsTo(Category, { foreignKey: 'FavoriteCategoryId', as: 'favoriteCategory' });

    // =============================================
    // Quizzes ↔ Questions
    // =============================================
    Quiz.hasMany(Question, { foreignKey: 'QuizId', as: 'questions', onDelete: 'CASCADE' });
    Question.belongsTo(Quiz, { foreignKey: 'QuizId', as: 'quiz' });

    // =============================================
    // Questions ↔ Answers
    // =============================================
    Question.hasMany(Answer, { foreignKey: 'QuestionId', as: 'answers', onDelete: 'CASCADE' });
    Answer.belongsTo(Question, { foreignKey: 'QuestionId', as: 'question' });

    // =============================================
    // Users ↔ GameSessions (как хост)
    // =============================================
    User.hasMany(GameSession, { foreignKey: 'HostId', as: 'hostedSessions' });
    GameSession.belongsTo(User, { foreignKey: 'HostId', as: 'host' });

    // =============================================
    // Quizzes ↔ GameSessions
    // =============================================
    Quiz.hasMany(GameSession, { foreignKey: 'QuizId', as: 'sessions' });
    GameSession.belongsTo(Quiz, { foreignKey: 'QuizId', as: 'quiz' });

    // =============================================
    // GameSessions ↔ SessionPlayers
    // =============================================
    GameSession.hasMany(SessionPlayer, { foreignKey: 'SessionId', as: 'players', onDelete: 'CASCADE' });
    SessionPlayer.belongsTo(GameSession, { foreignKey: 'SessionId', as: 'session' });

    // =============================================
    // Users ↔ SessionPlayers
    // =============================================
    User.hasMany(SessionPlayer, { foreignKey: 'UserId', as: 'sessionPlayers' });
    SessionPlayer.belongsTo(User, { foreignKey: 'UserId', as: 'user' });

    // =============================================
    // SessionPlayers ↔ PlayerAnswers
    // =============================================
    SessionPlayer.hasMany(PlayerAnswer, { foreignKey: 'SessionPlayerId', as: 'answers', onDelete: 'CASCADE' });
    PlayerAnswer.belongsTo(SessionPlayer, { foreignKey: 'SessionPlayerId', as: 'player' });

    // =============================================
    // Questions ↔ PlayerAnswers
    // =============================================
    Question.hasMany(PlayerAnswer, { foreignKey: 'QuestionId', as: 'playerAnswers' });
    PlayerAnswer.belongsTo(Question, { foreignKey: 'QuestionId', as: 'question' });

    // =============================================
    // Answers ↔ PlayerAnswers
    // =============================================
    Answer.hasMany(PlayerAnswer, { foreignKey: 'AnswerId', as: 'playerAnswers' });
    PlayerAnswer.belongsTo(Answer, { foreignKey: 'AnswerId', as: 'answer' });

    // =============================================
    // Users ↔ Attempts
    // =============================================
    User.hasMany(Attempt, { foreignKey: 'UserId', as: 'attempts' });
    Attempt.belongsTo(User, { foreignKey: 'UserId', as: 'user' });

    // =============================================
    // Quizzes ↔ Attempts
    // =============================================
    Quiz.hasMany(Attempt, { foreignKey: 'QuizId', as: 'attempts' });
    Attempt.belongsTo(Quiz, { foreignKey: 'QuizId', as: 'quiz' });

    // =============================================
    // Attempts ↔ UserAnswers
    // =============================================
    Attempt.hasMany(UserAnswer, { foreignKey: 'AttemptId', as: 'answers', onDelete: 'CASCADE' });
    UserAnswer.belongsTo(Attempt, { foreignKey: 'AttemptId', as: 'attempt' });

    // =============================================
    // Questions ↔ UserAnswers
    // =============================================
    Question.hasMany(UserAnswer, { foreignKey: 'QuestionId', as: 'userAnswers' });
    UserAnswer.belongsTo(Question, { foreignKey: 'QuestionId', as: 'question' });

    // =============================================
    // Answers ↔ UserAnswers
    // =============================================
    Answer.hasMany(UserAnswer, { foreignKey: 'AnswerId', as: 'userAnswers' });
    UserAnswer.belongsTo(Answer, { foreignKey: 'AnswerId', as: 'answer' });

    // =============================================
    // Users ↔ UserStatistics (1:1)
    // =============================================
    User.hasOne(UserStatistic, { foreignKey: 'UserId', as: 'statistics' });
    UserStatistic.belongsTo(User, { foreignKey: 'UserId', as: 'user' });

    // =============================================
    // Многие ко многим через промежуточные таблицы
    // =============================================
    
    // Users ↔ GameSessions (через SessionPlayers)
    User.belongsToMany(GameSession, {
        through: SessionPlayer,
        foreignKey: 'UserId',
        otherKey: 'SessionId',
        as: 'participatedSessions'
    });

    GameSession.belongsToMany(User, {
        through: SessionPlayer,
        foreignKey: 'SessionId',
        otherKey: 'UserId',
        as: 'participants'
    });

    // Users ↔ Quizzes (через Attempts)
    User.belongsToMany(Quiz, {
        through: Attempt,
        foreignKey: 'UserId',
        otherKey: 'QuizId',
        as: 'attemptedQuizzes'
    });

    Quiz.belongsToMany(User, {
        through: Attempt,
        foreignKey: 'QuizId',
        otherKey: 'UserId',
        as: 'attempters'
    });
};