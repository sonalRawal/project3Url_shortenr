const mongoose = require('mongoose')
const UrlModel = require('../models/UrlModel')
const validation = require("../validator/validator");
const validUrl = require('valid-url')
const shortid = require('shortid')
const redis = require("redis");
const { promisify } = require("util");

//Connect to redis
const redisClient = redis.createClient(
    18002,
    "redis-18002.c232.us-east-1-2.ec2.cloud.redislabs.com",
    { no_ready_check: true }
);
redisClient.auth("EuHfBYDwlIvlZNWtdqfyR7CjJV7d5bPy", function (err) {
    if (err) throw err;
});

redisClient.on("connect", async function () {
    console.log("Connected to Redis..");
});

//1. connect to the server
//2. use the commands :

//Connection setup for redis
const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);


//------------------------------------------create url-----------------------------------------------//
const createUrl = async function (req, res) {
    try {

        const requestBody = req.body
        const LongURL = requestBody.longUrl;
        const baseUrl = 'http://localhost:3000'
        // validation start
        if (!validation.isValidRequestBody(requestBody)) {
            res.status(400).send({ status: false, message: 'Invalid request parameters. Please provide url details' })
            return
        }

        if (!validation.isValid(LongURL)) {

            res.status(400).send({ status: false, msg: 'longUrl is required' })
            return
        }
        if (typeof (LongURL) != 'string') {
            return res.status(400).send({ status: false, message: "Numbers are not allowed" })
        }
        //if valid then trim it
        const trimUrl = LongURL.trim()

        if (validation.validhttpsLower(trimUrl)) {
            const regex = /^https?:\/\//
           const  newTrim = trimUrl.replace(regex, "https://")
        }
        if (validation.validhttpsUpper(trimUrl)) {
            const regex = /^HTTPS?:\/\//
           const newTrim = trimUrl.replace(regex, "https://")
        }
        if (!validation.validateUrl(trimUrl)) {
            return res.status(400).send({ status: false, message: "Please provide valid URL" })
        }

        // if valid, we create the url code
        const URLCode = shortid.generate()
        if (validUrl.isUri(trimUrl)) {

            const urlData = await GET_ASYNC(`${trimUrl}`)

            if (urlData) {
                return res.status(200).send({ status: true, message: `Data for ${trimUrl} from the cache`, data: JSON.parse(urlData) })

            }
            else {
                const url = await UrlModel.findOne({ longUrl: trimUrl }).select({ _id: 0, longUrl: 1, shortUrl: 1, urlCode: 1 })
                if (url) {
                    await SET_ASYNC(`${trimUrl}`, JSON.stringify(url))

                    res.status(200).send({ status: true, msg: "fetch from db", data: url })
                    return
                } else {

                    const ShortUrl = baseUrl + '/' + URLCode

                    const urlDetails = { longUrl: trimUrl, shortUrl: ShortUrl, urlCode: URLCode }

                    const details = await UrlModel.create(urlDetails);
                    res.status(201).json({ status: true, msg: "New Url create", data: urlDetails })
                    return
                }
            }
        } else {
            return res.status(400).send({ status: false, msg: 'Invalid longUrl' })
        }

    } catch (error) {
        console.log(error)
        res.status(500).send({ status: false, msg: error.message })
    }
}


// -------------------------getAPI : redirect-----------------------------------------------//
const getUrl = async function (req, res) {
    try {

        const URLCode = req.params.urlcode

        let urlcache = await GET_ASYNC(`${req.params.urlcode}`)
        if (urlcache) {

            return res.status(302).redirect(JSON.parse(urlcache))

        } else {
            const getUrl = await UrlModel.findOne({ urlCode: URLCode });

            if (getUrl) {
                await SET_ASYNC(`${URLCode}`, JSON.stringify(getUrl.longUrl))

                return res.status(302).redirect(getUrl.longUrl);
            }

            else {
                return res.status(404).send({ status: false, err: 'Invalid urlcode' })
            }
        }
    } catch (err) {

        res.status(500).send({ status: false, err: err.message })
    }


}


module.exports.createUrl = createUrl;
module.exports.getUrl = getUrl;