'use strict';
const configFile = require('./config.json');
const Discord = require('discord.js');
const inArray = require('in-array');

module.exports = class MessageHandler {
    constructor(client) {
        this.client = client;
        this.modules = [];
    }

    registerModule(mod) {
        console.log('module ' + mod.name + ' registered.');
        this.modules.push(mod);
    }

    handleMessage(message) {
        console.log('handledMessage got called with: ' + message);
        var that = this;

        // dont answer my own messages
        if (message.author === that.client.user) {
            return;
        }

        if (!message.content.startsWith(configFile.messagePrefix)) {
            return;
        }

        var command = message.content.split(' ')[0].substring(1);
        var params = message.content.split(' ');

        if (command === 'modules') {
            var text = '\nCurrently installed modules: \n';

            for (let m of this.modules) {
                text += '- ' + m.name + "\n";
            }

            this.client.reply(message, text);
            return;
        }

        // remove command from params
        params.shift();

        for (let m of this.modules) {
            if (inArray(m.commands(), command)) {
                m[command](message, params);
            }
        }
    }
};