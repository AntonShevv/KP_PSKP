const express = require('express');
const http = require('http');
const path = require('path');
const morgan = require('morgan');
const session = require('express-session');
require('dotenv').config();

const { sequelize } = require('./sequelize/models');
const router = require("./routes/index.js");
const { notFoundHandler, errorHandler, sequelizeErrorHandler, jwtErrorHandler } = require('./middleware/errorHandler');
const { initSocket } = require('./socketserver');
const passport = require('./config/passport');

const app = express();
const server = http.createServer(app);

app.use(session({
    secret: process.env.SESSION_SECRET || 'qwewqeqws33q2s',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', 
        maxAge: 24 * 60 * 60 * 1000
    }
}));
app.use(passport.initialize());
app.use(passport.session());

const cors = require('cors');


app.use(cors({
    origin: ['http://localhost:3000', 'https://localhost'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use("/api", router);

app.use(jwtErrorHandler);
app.use(sequelizeErrorHandler);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

if (require.main === module) {
    const PORT = process.env.PORT || 5000;

    const startServer = async () => {
        try {
            await sequelize.authenticate();
            initSocket(server);

            server.listen(PORT, () => {
                console.log(`Сервер запущен: http://localhost:${PORT}`);
                console.log(`WebSocket сервер запущен на порту ${PORT}`);
            });
        } catch (err) {
            console.error('Ошибка подключения к БД:', err);
            process.exit(1);
        }
    };

    startServer();
}