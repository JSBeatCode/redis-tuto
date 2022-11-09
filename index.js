const express = require('express');

const redis = require('redis');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5100
const REDIS_PORT = process.env.REDIS_PORT || 6379;

//redis 연결
const redisClient = redis.createClient({
    host: 'localhost',
    port: REDIS_PORT
})
redisClient.on('error', err => console.log('Redis Loading Err: '+err))
redisClient.connect()

// api 에서 데이터를 가져오고 redis에 세팅한다.
async function getData(req, res, next) {
    try {
        const { count } = req.params;
        const response = await axios.get(`https://official-joke-api.appspot.com/jokes/${count}`)
        const resData = response.data
        let punchline = '';
        resData.forEach((a,i)=>{
            punchline += ('\'' + a.punchline + '\'' + (i === resData.length - 1 ? '' : ','))
        })
        console.log(punchline)

        //redis에 데이터 입력
        await redisSetEx(count, 3600, punchline)

        //웹창에 뿌려줄 데이터 
        const show = await showData(count, punchline)

        await res.send(show)

    } catch (err) {
        console.error(err);
        await res.status(500)
    }
}

// 가져온 데이터를 html로 뿌려준다.
async function showData(count, punchLine) {
    let html = '<h1>' 
    html += 'id: ['
    html += punchLine
    html += ']'
    html += '</h1>'

    return html;
}

// Middleware: api로 신호 받고 비즈니스 서비스를 구현하기 전에 미들웨어에서 검증 할 수 있다.
async function apiMiddleware(req, res, next) {
    const { count } = req.params;
    try {
        const data = await redisGet(count);

        (data !== null) ? await res.send(await showData(count, data)) : await next();
    } catch (err) {
        throw (err) ? err : undefined;
    }
}

async function redisGet(count) { 
    return await redisClient.get(count);
}

async function redisSetEx(count, timer, punchLine) {
    return await redisClient.setEx(count, timer, punchLine)
}

app.get('/get/:count', apiMiddleware, getData);

// https://official-joke-api.appspot.com/jokes/ten 
// 여기 접속 되는지 확인 

app.listen(PORT, () => {
    console.log('App listening on port:' + PORT)
})
