const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ALUNO = 0
const ORIENTADOR = 1
const ADMINISTRADOR = 2

const SECRET_KEY = 'chave_secreta';

async function login(req, res) {
    try {
        const { login, senha } = req.body;
        const user = await prisma.usuario.findFirst({ where: { login } });
        if (!user || !bcrypt.compareSync(senha, user.senha)) {
            console.log("Usuário ou senha inválido.")
            return res.status(500).render('login.ejs', { error: 'Erro ao fazer login' });
        }

        const token = jwt.sign({ userId: user.id, userType: user.tipo }, SECRET_KEY, { expiresIn: '12h' });
        res.cookie.auth = token

        res.status(200).redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).render('login.ejs', { error: 'Erro ao fazer login' });
    }
};


async function logout(req, res) {
    res.cookie.auth = null;
    res.cookie.decodedInfo = null;
    res.redirect('/login');
};

async function checkToken(req, res, next) {
    const token = res.cookie.auth
    jwt.verify(token, SECRET_KEY, function (err, decoded) {
        if (err || !decoded) {
            console.log("Usuário não autorizado, redirecionando para a página de login.")
            console.log("UserID -> " + res.locals.userId)
            return res.status(500).render('login.ejs', { error: 'Erro de autorização.' })
        }

        res.cookie.decodedInfo = decoded;
        res.status(200);
        return next();
    })
}

async function isStudent(req, res, next) {
    if (res.cookie.decodedInfo.userType == ALUNO) {
        return next()
    }

    res.status(401).send('Acesso negado.')
}

async function isOrienter(req, res, next) {
    if (res.cookie.decodedInfo.userType == ORIENTADOR) {
        return next()
    }

    res.status(401).send('Acesso negado.')
}

async function isAdmin(req, res, next) {
    if (res.cookie.decodedInfo.userType == ADMINISTRADOR) {
        return next()
    }

    res.status(401).send('Acesso negado.')
}

async function encryptPassword(password) {
    return bcrypt.hash(password, 10);
}

async function novaSenha(nome, ra, email) {
    const nomePart = nome.slice(0, 5).toUpperCase();
    const raPart = ra.slice(-3);
    const emailPart = email.slice(0, 3);
    const senha = `${nomePart}${raPart}${emailPart}`;

    console.log(senha)
    return enviarEmail(senha, email);
}

async function enviarEmail(senha, email) {
    var mailTransport = nodemailer.createTransport({
        service: 'outlook',
        auth: {
            user: 'gradmate.suporte@outlook.com',
            pass: '!grad1234'
        }
    });

    mailTransport.sendMail({
        from: 'gradmate.suporte@outlook.com',
        to: email,
        subject: 'Senha do GradMate',
        text: 'Sua senha do GradMate é: ' + senha
    }, (error, info) => {
        if (error) {
            console.log(error);
        } else {
            console.log('Email enviado: ' + info.response);
        }
    });

    mailTransport.close();

    return senha;
}

module.exports = { login, logout, checkToken, isStudent, isOrienter, isAdmin, encryptPassword, novaSenha, enviarEmail }