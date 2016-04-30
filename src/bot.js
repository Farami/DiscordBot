'use strict';
const configFile = require('./config.json');
const Discord = require('discord.js');
const MessageHandler = require('./messageHandler.js');
const SpotifyModule = require('./modules/spotifyModule.js');

const client = new Discord.Client();
const messageHandler = new MessageHandler(client);

messageHandler.registerModule(new SpotifyModule(configFile.spotifyUsername, configFile.spotifyPassword, client));

client.on('message', (message) => messageHandler.handleMessage(message));

exports.init = (email, password) => client.login(email, password).then(success).catch(error);

function success(token) {
  console.log('Connected.');
}

function error(error) {
  console.log('Error: ' + error);
}