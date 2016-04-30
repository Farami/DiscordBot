'use strict';
var bot = require('./src/bot.js');
var fs = require('fs');
var configFile = require('./src/config.json');

bot.init(configFile.discordEmail, configFile.discordPassword);