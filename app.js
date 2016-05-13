'use strict';
const bot = require('./src/bot.js');
const configFile = require('./src/config.json');

bot.init(configFile.discordEmail, configFile.discordPassword);


process.on('exit', exitHandler.bind(null));
process.on('SIGINT', exitHandler.bind(null));

function exitHandler() {
  bot.disconnect(() => {
    process.exit();
  });
};
