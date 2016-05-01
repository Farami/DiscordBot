'use strict';
const configFile = require('./config.json');
const inArray = require('in-array');

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
    console.log('handledMessage got called with: ' + message);

    // dont answer my own messages
    if (message.author === this.client.user) {
      return;
    }

    if (!message.content.startsWith(configFile.messagePrefix)) {
      return;
    }

    let params = message.content.split(' ');
    let command = params.shift();

    if (command === 'modules') {
      this.handleModulesCommand(message);
      return;
    }

    for (let m of this.modules) {
      if (inArray(m.commands(), command)) {
        m[command](message, params);
      }
    }
  }

  handleModulesCommand(message) {
    let text = '\nCurrently installed modules: \n';

    for (let m of this.modules) {
      text += '- ' + m.name + '\n';
    }

    this.client.reply(message, text);
  }
};
