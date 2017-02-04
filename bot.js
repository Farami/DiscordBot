'use strict';
const configFile = require('./config.json');
const client = new (require('discord.js')).Client();
const MessageHandler = require('./src/messageHandler.js');
const modulesPath = require('path').join(__dirname, './src/modules');
const messageHandler = new MessageHandler(client);

require('fs').readdirSync(modulesPath).forEach(function (file) {
  let moduleSplit = file.split('.');

  if (moduleSplit[1] !== 'js') {
    return;
  }

  let configObjekt = configFile[moduleSplit[0]];
  let DiscordModule = require('./src/modules/' + file);
  let newModule = new DiscordModule(client, configObjekt);
  messageHandler.registerModule(newModule);
});

client.on('message', (message) => messageHandler.handleMessage(message));

client.login(configFile.discordToken).then(function (token) {
  console.log('Connected.');
}).catch(function (error) {
  console.log('Error: ' + error);
});
