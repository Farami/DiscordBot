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
    let that = this;

    if (params.length === 0) {
      // gets a random key from the sources
      let keys = Object.keys(this.config.sources);
      params[0] = keys[keys.length * Math.random() << 0]; // TODO do not modify incoming variable.
    }

    try {
      request(that.config.sources[params[0]], function (error, response, body) {
        if (!error && response.statusCode === 200) {
          that.reply(message, JSON.parse(body).joke);
        }
      });
    } catch (err) {
      this.reply(message, 'Error: Service down or unknown source.');
    }
  }

  repeatedJokes(message, params) {
    if (this.jokeTimer) {
      return;
    }

    var interval = params[0] || 5;

    let that = this;
    this.jokeTimer = setInterval(() => that.joke(message, []), interval * 1000);
    this.reply(message, 'Posting joke every ' + interval + ' seconds');
  }

  stopJokes(message, params) {
    this.reply(message, 'Aww.');
    clearInterval(this.jokeTimer);
  }
};