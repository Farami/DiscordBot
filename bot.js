'use strict';
var Discord = require('discord.js');
var MessageHandler = require('./messageHandler.js');

var client = new Discord.Client();
var messageHandler = new MessageHandler(client);

client.on('message', (message) => messageHandler.handleMessage(message));

exports.init = (email, password) => client.login(email, password).then(success).catch(error);

function success(token) {
  console.log('Connected.');
}

function error(error) {
  console.log('Error: ' + error);
}