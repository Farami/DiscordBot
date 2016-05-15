'use strict';
const DiscordBotModule = require('../discordBotModule.js');
const request = require('request');

module.exports = class JokeModule extends DiscordBotModule {
  constructor(discordClient, config) {
    let commands = ['joke', 'repeatedJokes', 'stopJokes'];
    super('JokeModule', commands, discordClient);
    this.config = config;
  }

  joke(message, params) {
    if (params.length === 0) {
      // gets a random key from the sources
      let keys = Object.keys(this.config.sources);
      params[0] = keys[keys.length * Math.random() << 0];
    }

    try {
      let that = this;
      request(that.config.sources[params[0]], function (error, response, body) {
        if (!error && response.statusCode === 200) {
          that.discordClient.reply(message, JSON.parse(body).joke);
        }
      });
    } catch (err) {
      this.discordClient.reply(message, 'Error: Service down or unknown source.');
    }
  }

  repeatedJokes(message, params) {
    if (this.jokeTimer) {
      return;
    }

    if (params.length === 0) {
      params[0] = 5;
    }

    let that = this;
    this.jokeTimer = setInterval(() => that.joke(message, []), params[0] * 1000);
    this.discordClient.reply(message, 'Posting joke every ' + params[0] + ' seconds');
  }

  stopJokes(message, params) {
    this.discordClient.reply(message, 'Aww.');
    clearInterval(this.jokeTimer);
  }
};
