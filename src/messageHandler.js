'use strict';
const configFile = require('./config.json');
const Discord = require('discord.js');
const inArray = require('in-array');

module.exports = class MessageHandler {
    constructor(client) {
        this.client = client;
        this.modules = [];
    }

    registerModule(module) {
        console.log('module ' + module.name() + ' registered.');
        this.modules.push(module);
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

        // remove command from params
        params.shift();

        for (let m of this.modules) {
            if (inArray(m.commands(), command)) {
                m[command](message, params);
            }
        }
    }

};