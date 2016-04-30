'use strict';
const config = require('./jokeModule.json');
const DiscordBotModule = require('../discordBotModule.js');
const request = require('request');

module.exports = class JokeModule extends DiscordBotModule {
    constructor(discordClient) {
        let commands = ['joke'];
        super("JokeModule", commands, discordClient);
    }

    joke(message, params) {
        if (params.length === 0) {
            params[0] = randomKey(config.sources);
        }

        try {
            let that = this;
            request(config.sources[params[0]], function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    that.discordClient.reply(message, JSON.parse(body).joke);
                }
            });
        } catch (err) {
            this.discordClient.reply(message, "Error: Service down or unknown source.");
        }
    }
};


var randomKey = function (obj) {
    var keys = Object.keys(obj);
    return keys[keys.length * Math.random() << 0];
};