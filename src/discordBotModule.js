'use strict';
const Discord = require('discord.js');
const Q = require('Q');

module.exports = class DiscordBotModule {
  /**
   * Creates an instance of DiscordBotModule.
   *
   * @param name The name of the module.
   * @param commandList An array with the commands the module will implement.
   * @param discordClient the discord client object.
   */
  constructor(name, commandList, discordClient) {
    this.discord = Discord;
    this.commandList = commandList;
    this.discordClient = discordClient;
    this.name = name;
  }

  /**
   * Returns the name of the module.
   *
   * @returns The name of the module.
   */
  name() {
    return this.name;
  }

  /**
   * Returns the list of implemented commands.
   *
   * @returns The list of implemented commands.
   */
  commands() {
    return this.commandList;
  }

  /**
   * Queues the given message to be removed in the given time.
   *
   * @param message The discordjs message object to remove.
   * @param time The time after when the message should be removed in milliseconds. Defaults to 10 seconds.
   * @returns true when it deleted the message successfully.
   */
  queueMessageForRemoval(message, time) {
    time = time || 10000;

    let q = Q.defer();
    this.discordClient.deleteMessage(message, { wait: time }, () => { q.resolve(true); });
    return q.promise;
  }

  /**
   * Sends a message to a channel.
   *
   * @param channel The channel to send to.
   * @param text The text to send.
   * @param removeAfter when true removes the message after a certain period of time.
   */
  sendMessage(channel, text, removeAfter) {
    removeAfter = removeAfter || false;

    let that = this;
    this.discordClient.sendMessage(channel, text, (err, sentMessage) => {
      if (err) {
        return;
      }

      if (removeAfter) {
        that.queueMessageForRemoval(sentMessage);
      }
    });
  }

  /**
   * Reply to the given message.
   *
   * @param message the message.
   * @param text The text to write as a reply.
   * @param removeAfter removeAfter when true removes the message after a certain period of time.
   */
  reply(message, text, removeAfter) {
    removeAfter = removeAfter || false;

    let that = this;
    this.discordClient.reply(message, text, (err, sentMessage) => {
      if (err) {
        return;
      }

      if (removeAfter) {
        that.queueMessageForRemoval(sentMessage);
      }
    });
  }
};
