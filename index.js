// import fetch from 'node-fetch'
const express = require('express');

// const fetch = require('node-fetch')
const redis = require('redis');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5009;
const REDIS_PORT = process.env.REDIS_PORT || 6379;


// redis 연결
const redisClient = redis.createClient({
    host: 'localhost',
    port: REDIS_PORT
});
redisClient.on('error', (err) => console.log('Error on loading Redis', err));
redisClient.connect()


// api 에서 데이터을 가져오고 redis에 세팅한다.
async function getRepos(req, res, next) {
    try {
        const { username } = req.params;
        const response = await axios.get(`https://api.github.com/users/${username}`)
        console.log(response.data)
        const id = response.data.id

        // Redis 에 데이터 입력
        await redisSetEx(username, 3600, id)
        const show = await showData(username, id)
        await res.send(show)
    } catch (err) {
        console.error(err)
        await res.status(500)
    }
}


// 가져온 데이터를 html로 뿌려준다.
async function showData(username, id) {
    return `<h1>name: ${username}, id: ${id}</h1>`
}

// Middleware: api로 신호를 받고 비즈니스 서비스 구현하기 전에 미들웨어에서 검증 할 수 있다.
async function apiMiddleware(req, res, next) {
    const { username } = req.params;
    try {
        const data = await redisGet();

            (data !== null) ?
                await res.send(await showData(username, data))
            :
                await next();
            

    } catch (err) {
        throw (err) ? err : undefined
    }
}

async function redisGet(username) {
    return await redisClient.get(username)
}

async function redisSetEx(username, timer, id) {
    return await redisClient.setEx(username, timer, id)
}

app.get('/get/:username', apiMiddleware, getRepos);

// https://api.github.com/users
// 여기에 접속해서 api 데이터 확인

app.listen(5009, () => {
    console.log(`App listening on port ${PORT}`);
});