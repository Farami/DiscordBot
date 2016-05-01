'use strict';
const bot = require('./src/bot.js');
const configFile = require('./src/config.json');

bot.init(configFile.discordEmail, configFile.discordPassword);
