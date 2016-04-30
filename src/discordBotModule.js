'use strict';
const Discord = require('discord.js');
const MessageHandler = require('./messageHandler.js');

module.exports = class DiscordBotModule {
    constructor(name, commandList, discordClient) {
        this.discord = Discord;
        this.commandList = commandList;
        this.discordClient = discordClient;
        this.name = name;
    }

    name() { return this.name; }

    commands() {
        return this.commandList;
    }
};