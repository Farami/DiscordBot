'use strict';
var Discord = require('discord.js');
var lame = require('lame');
var Spotify = require('spotify-web');

class MessageHandler {
    constructor(client) {
        this.client = client;
    }

    handleMessage(message) {
        console.log('handledMessage got called with: ' + message);
        var that = this;
        if (message.content === 'ping') {
            this.client.reply(message, 'pong');
            return;
        }

        // dont answer my own messages
        if (message.author == this.client.user) {
            return;
        }

        if (!message.content.startsWith('!')) {
            return;
        }

        switch (message.content.split(' ')[0]) {
            case '!init':
                for (var channel of message.channel.server.channels) {
                    if (channel instanceof Discord.VoiceChannel) {
                        if (channel.name === 'Noobs') {
                            this.client.joinVoiceChannel(channel).catch(function (error) { console.log(error); });
                            this.client.reply(message, 'Joined voice channel ' + channel.name);
                            break;
                        }
                    }
                }
                break;
            case '!play':
                that.client.reply(message, 'Called play.');
                var parameter = message.content.split(' ')[1];
                if (parameter === undefined) {
                    parameter = 'spotify:track:4w6Y6WiZxAsKT9OPJiTlpe';
                }
                // Spotify credentials...
                var username = 'Deine';
                var password = 'Mudda';

                Spotify.login(username, password, function (err, spotify) {
                    if (err) {
                        that.client.reply(message, err);
                        return;
                    }

                    // first get a "Track" instance from the track URI
                    try {
                        spotify.get(parameter, function (err, track) {
                            if (err) {
                                that.client.reply(message, err);
                                return;
                            }

                            that.client.reply(message, 'Playing: ' + track.artist[0].name + ' - ' + track.name);
                            that.client.voiceConnection.playRawStream(track
                                .play()
                                .on('error', function (err) {
                                    that.client.reply(message, err);
                                })
                                .pipe(new lame.Decoder()));
                        });
                    } catch (err) {
                        that.client.reply(message, err);
                    }
                });
                break;
            case '!stop':
                break;
            default:
                break;
        }
    }

}

module.exports = MessageHandler;