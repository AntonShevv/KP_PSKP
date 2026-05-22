CREATE DATABASE OnlineQuiz;
GO

USE OnlineQuiz;
GO

CREATE TABLE Roles (
    RoleId INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(50) NOT NULL UNIQUE,
    Description NVARCHAR(200)
);
GO

CREATE TABLE Users (
    UserId INT PRIMARY KEY IDENTITY(1,1),
    RoleId INT NOT NULL REFERENCES Roles(RoleId),
    Login NVARCHAR(50) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    Email NVARCHAR(100) NOT NULL UNIQUE,
    Phone NVARCHAR(20),
    AvatarUrl NVARCHAR(500),
    IsActive BIT DEFAULT 1,
    CanCreate BIT DEFAULT 1,
    Rating INT DEFAULT 0,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2
);
GO

CREATE TABLE Categories (
    CategoryId INT PRIMARY KEY IDENTITY(1,1),
    Name NVARCHAR(100) NOT NULL UNIQUE,
    Description NVARCHAR(300),
    CreatedAt DATETIME2 DEFAULT GETDATE()
);
GO

CREATE TABLE Quizzes (
    QuizId INT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL REFERENCES Users(UserId),
    CategoryId INT NOT NULL REFERENCES Categories(CategoryId),
    Title NVARCHAR(200) NOT NULL,
    FullDescription TEXT,
    ImageUrl NVARCHAR(500),
    Difficulty NVARCHAR(20) CHECK (Difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
    DefaultQuestionTime INT DEFAULT 30,
    PointsPerQuestion INT DEFAULT 100,
    IsPublished BIT DEFAULT 0,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);
GO

CREATE TABLE Questions (
    QuestionId INT PRIMARY KEY IDENTITY(1,1),
    QuizId INT NOT NULL REFERENCES Quizzes(QuizId) ON DELETE CASCADE,
    Text NVARCHAR(500) NOT NULL,
    Type NVARCHAR(20) CHECK (Type IN ('single', 'multiple', 'text')) DEFAULT 'single',
    Points INT DEFAULT 100,
    OrderNum INT NOT NULL,
    TimeLimit INT,
    MediaUrl NVARCHAR(500),
    MediaType NVARCHAR(20),
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);
GO

CREATE TABLE Answers (
    AnswerId INT PRIMARY KEY IDENTITY(1,1),
    QuestionId INT NOT NULL REFERENCES Questions(QuestionId) ON DELETE CASCADE,
    Text NVARCHAR(300) NOT NULL,
    IsCorrect BIT DEFAULT 0,
    OrderNum INT NOT NULL,
    MediaUrl NVARCHAR(500),
    MediaType NVARCHAR(20),
    CreatedAt DATETIME2 DEFAULT GETDATE()
);
GO

CREATE TABLE GameSessions (
    SessionId INT PRIMARY KEY IDENTITY(1,1),
    QuizId INT NOT NULL REFERENCES Quizzes(QuizId),
    HostId INT NOT NULL REFERENCES Users(UserId),
    JoinCode NVARCHAR(10) NOT NULL UNIQUE,
    Status NVARCHAR(20) CHECK (Status IN ('waiting', 'active', 'finished')) DEFAULT 'waiting',
    QuestionStartedAt DATETIME2,
    CurrentQuestionIndex INT DEFAULT 0,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    StartedAt DATETIME2,
    EndedAt DATETIME2
);
GO

CREATE TABLE SessionPlayers (
    SessionPlayerId INT PRIMARY KEY IDENTITY(1,1),
    SessionId INT NOT NULL REFERENCES GameSessions(SessionId) ON DELETE CASCADE,
    UserId INT NOT NULL REFERENCES Users(UserId),
    Score INT DEFAULT 0,
    CorrectAnswers INT DEFAULT 0,
    JoinedAt DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT UQ_SessionPlayer_Unique UNIQUE (SessionId, UserId)
);
GO

CREATE TABLE PlayerAnswers (
    PlayerAnswerId INT PRIMARY KEY IDENTITY(1,1),
    SessionPlayerId INT NOT NULL REFERENCES SessionPlayers(SessionPlayerId) ON DELETE CASCADE,
    QuestionId INT NOT NULL REFERENCES Questions(QuestionId),
    AnswerId INT,
    AnswerText TEXT,
    ResponseTimeMs INT NOT NULL,
    IsCorrect BIT NOT NULL,
    PointsEarned INT NOT NULL,
    AnsweredAt DATETIME2 DEFAULT GETDATE()
);
GO

CREATE TABLE Attempts (
    AttemptId INT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL REFERENCES Users(UserId),
    QuizId INT NOT NULL REFERENCES Quizzes(QuizId),
    StartedAt DATETIME2 DEFAULT GETDATE(),
    FinishedAt DATETIME2,
    Status NVARCHAR(20) CHECK (Status IN ('in_progress', 'completed', 'abandoned')) DEFAULT 'in_progress',
    Score INT DEFAULT 0
);
GO

CREATE TABLE UserAnswers (
    UserAnswerId INT PRIMARY KEY IDENTITY(1,1),
    AttemptId INT NOT NULL REFERENCES Attempts(AttemptId) ON DELETE CASCADE,
    QuestionId INT NOT NULL REFERENCES Questions(QuestionId),
    AnswerId INT NOT NULL REFERENCES Answers(AnswerId),
    PointsEarned INT DEFAULT 0,
    IsCorrect BIT DEFAULT 0,
    AnswerTimeMs INT,
    CreatedAt DATETIME2 DEFAULT GETDATE()
);
GO

CREATE TABLE UserStatistics (
    StatId INT PRIMARY KEY IDENTITY(1,1),
    UserId INT NOT NULL UNIQUE REFERENCES Users(UserId),
    TotalGamesPlayed INT DEFAULT 0,
    TotalWins INT DEFAULT 0,
    AverageScore FLOAT DEFAULT 0,
    TotalQuizzesCreated INT DEFAULT 0,
    FavoriteCategoryId INT REFERENCES Categories(CategoryId),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);
GO

CREATE INDEX IX_Users_Login ON Users(Login);
CREATE INDEX IX_Users_Email ON Users(Email);
CREATE INDEX IX_Quizzes_UserId ON Quizzes(UserId);
CREATE INDEX IX_Quizzes_CategoryId ON Quizzes(CategoryId);
CREATE INDEX IX_Quizzes_IsPublished ON Quizzes(IsPublished);
CREATE INDEX IX_Questions_QuizId ON Questions(QuizId);
CREATE INDEX IX_Answers_QuestionId ON Answers(QuestionId);
CREATE INDEX IX_GameSessions_JoinCode ON GameSessions(JoinCode);
CREATE INDEX IX_GameSessions_Status ON GameSessions(Status);
CREATE INDEX IX_SessionPlayers_SessionId ON SessionPlayers(SessionId);
CREATE INDEX IX_PlayerAnswers_SessionPlayerId ON PlayerAnswers(SessionPlayerId);
CREATE INDEX IX_Attempts_UserId ON Attempts(UserId);
GO



INSERT INTO Roles (Name, Description) VALUES 
    ('guest', '���������������� ������������, ����� ������ ������������� ���������'),
    ('player', '�����, ����� ����������� � ���������� � ��������� ����'),
    ('admin', '�������������, ��������� �������������� � �����������');
GO

-- 2. ���������
INSERT INTO Categories (Name, Description) VALUES 
    ('�����', '��������� �� ����� ����'),
    ('�����', '������� ��������� �� ������, �����, �������� � ��.'),
    ('�����', '���������� ���������'),
    ('����', '��������� ��� ������������ ����'),
    ('����', '��������� ��� ������ � �������'),
    ('������', '��������� ��� ������ � ������������'),
    ('�������', '������������ ���������'),
    ('���������', '��������� ��� ������ � ������'),
    ('IT', '��������� ��� �������������� ����������'),
    ('����������', '��������� ��� ����� � ���������');
GO

-- 3. �������� ��������� ������ (������: admin123)
-- (bcrypt hash ��� 'admin123' - ����� �������� �� ��������)
INSERT INTO Users (RoleId, Login, PasswordHash, Email, IsActive, CanCreate) VALUES 
    (3, 'admin', '$2a$10$rV0iKp7cZqR0eLqXyZxYfO8jR8cQ5sX7mN9pL3kF6hJ2wE4tY6uI8', 'admin@quiz.com', 1, 1);
GO

-- 4. �������� ���������
DECLARE @QuizId INT;
DECLARE @Q1 INT, @Q2 INT, @Q3 INT;

INSERT INTO Quizzes (UserId, CategoryId, Title, FullDescription, Difficulty, IsPublished) VALUES 
    (1, 1, '�������� ���������', '��� �������� ��������� ��� �������� ������ �������', 'medium', 1);
SET @QuizId = SCOPE_IDENTITY();

-- ������ 1: ��������� �����
INSERT INTO Questions (QuizId, Text, Type, Points, OrderNum, TimeLimit) VALUES 
    (@QuizId, '������� ������ � ��������� �������?', 'single', 100, 1, 30);
SET @Q1 = SCOPE_IDENTITY();

INSERT INTO Answers (QuestionId, Text, IsCorrect, OrderNum) VALUES 
    (@Q1, '7', 0, 1),
    (@Q1, '8', 1, 2),
    (@Q1, '9', 0, 3),
    (@Q1, '10', 0, 4);

-- ������ 2: ������������� �����
INSERT INTO Questions (QuizId, Text, Type, Points, OrderNum, TimeLimit) VALUES 
    (@QuizId, '����� �� ���� ������ �������� ������� ����������������?', 'multiple', 150, 2, 45);
SET @Q2 = SCOPE_IDENTITY();

INSERT INTO Answers (QuestionId, Text, IsCorrect, OrderNum) VALUES 
    (@Q2, 'Python', 1, 1),
    (@Q2, 'HTML', 0, 2),
    (@Q2, 'Java', 1, 3),
    (@Q2, 'CSS', 0, 4),
    (@Q2, 'JavaScript', 1, 5);

-- ������ 3: ��������� �����
INSERT INTO Questions (QuizId, Text, Type, Points, OrderNum, TimeLimit) VALUES 
    (@QuizId, '��� ���������� ������� �������?', 'text', 100, 3, 20);
SET @Q3 = SCOPE_IDENTITY();

INSERT INTO Answers (QuestionId, Text, IsCorrect, OrderNum) VALUES 
    (@Q3, '�����', 1, 1);
GO

-- =============================================
-- �������� �������� ������
-- =============================================
SELECT 
    TABLE_NAME AS 'Table Name',
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = t.TABLE_NAME) AS 'Columns Count'
FROM INFORMATION_SCHEMA.TABLES t
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
GO

-- =============================================
-- �������� ���������� �������
-- =============================================
SELECT 'Roles' AS TableName, COUNT(*) FROM Roles
UNION ALL SELECT 'Categories', COUNT(*) FROM Categories
UNION ALL SELECT 'Users', COUNT(*) FROM Users
UNION ALL SELECT 'Quizzes', COUNT(*) FROM Quizzes
UNION ALL SELECT 'Questions', COUNT(*) FROM Questions
UNION ALL SELECT 'Answers', COUNT(*) FROM Answers;
GO

-- ����� ����������� �����
SELECT * FROM Roles;
GO

-- ����� ����������� ���������
SELECT * FROM Categories;
GO