'use strict';
const Discord = require('discord.js');
const MessageHandler = require('./messageHandler.js');
const modulesPath = require('path').join(__dirname, 'modules');
const client = new Discord.Client();
const messageHandler = new MessageHandler(client);

require('fs').readdirSync(modulesPath).forEach(function (file) {
  if (file.split('.')[1] !== 'js') {
    return;
  }

  let DiscordModule = require('./modules/' + file);
  let newModule = new DiscordModule(client);
  messageHandler.registerModule(newModule);
});

client.on('message', (message) => messageHandler.handleMessage(message));

exports.init = (email, password) => client.login(email, password).then(success).catch(error);

function success(token) {
  console.log('Connected.');
}

function error(error) {
  console.log('Error: ' + error);
}
