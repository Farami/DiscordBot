'use strict';
const configFile = require('./config.json');
const client = new (require('discord.js')).Client();
const MessageHandler = require('./src/messageHandler.js');
const modulesPath = require('path').join(__dirname, './src/modules');
const messageHandler = new MessageHandler(client);


require('fs').readdirSync(modulesPath).forEach(function (file) {
  if (file.split('.')[1] !== 'js') {
    return;
  }

  let DiscordModule = require('./src/modules/' + file);
  let newModule = new DiscordModule(client);
  messageHandler.registerModule(newModule);
});

client.on('message', (message) => messageHandler.handleMessage(message));

client.loginWithToken(configFile.discordToken).then(function (token) {
  console.log('Connected.');
}).catch(function (error) {
  console.log('Error: ' + error);
});



