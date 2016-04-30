'use strict';
var bot = require('./bot.js');
var fs = require('fs');

var config = JSON.parse(fs.readFileSync('./config.json'), 'utf8');
bot.init(config.email, config.password);