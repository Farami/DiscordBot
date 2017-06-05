'use strict';
const configFile = require('../config.json');
const inArray = require('in-array');
const whitelist = require('../whitelist.json');

module.exports = class MessageHandler {
  constructor(client) {
    this.client = client;
    this.modules = [];
  }

  registerModule(m) {
    console.log('module ' + m.name + ' registered.');
    this.modules.push(m);
  }

  handleMessage(message) {
    function extractCommand(params) { return params.shift().substring(1); }

    if (!message.content.startsWith(configFile.messagePrefix)) {
      return;
    }

    console.log('handleMessage got called with: ' + message);

    // dont answer my own messages
    if (message.author === this.client.user) {
      return;
    }

    // ignore message from people that are not in whitelist
    // TODO: Rewrite this as a proper rights system
    if (!inArray(whitelist, message.author.username)) {
      return;
    }

    let params = message.content.split(' ');
    let command = extractCommand(params);

    if (command === 'modules') {
      this.handleModulesCommand(message);
      return;
    }

    for (let m of this.modules) {
      if (inArray(m.commands, command)) {
        m[command](message, params);
      }
    }
  }

  handleModulesCommand(message) {
    let text = '\nCurrently installed modules: \n';

    for (let m of this.modules) {
      text += `- ${m.name}\n`;
    }

    this.client.reply(message, text);
  }
};
