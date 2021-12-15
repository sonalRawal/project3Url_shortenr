const mongoose = require("mongoose");

const UrlSchema = new mongoose.Schema({

    longUrl: {
        type: String,
        trim: true,
        required: "longUrl is mandatory ",
        lowercase: true
    },

    shortUrl: {
        type: String,
        required: "shortUrl is mandatory",
        unique: true
    },

    urlCode: {
        type: String,
        required: "urlCode is mandatory",
        trim: true,
        unique: true,
        lowercase: true
    },

}, { timestamps: true })

module.exports = mongoose.model('Url', UrlSchema)
