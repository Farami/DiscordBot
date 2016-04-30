'use strict';
const lame = require('lame');
const Spotify = require('spotify-web');
const DiscordBotModule = require('../discordBotModule.js');
const config = require('./spotifyModule.json');

module.exports = class SpotifyModule extends DiscordBotModule {
    constructor(discordClient) {
        let commands = ['init', 'play', 'pause'];

        super("SpotifyModule", commands, discordClient);
        this.username = config.username;
        this.password = config.password;
    }

    init(message, params) {
        for (var channel of message.channel.server.channels) {
            if (channel instanceof this.discord.VoiceChannel) {
                if (channel.name === 'Noobs') {
                    this.discordClient.joinVoiceChannel(channel).catch(function (error) { console.log(error); });
                    this.discordClient.reply(message, 'Joined voice channel ' + channel.name);
                    break;
                }
            }
        }
    }

    play(message, params) {
        let that = this;
        this.discordClient.reply(message, 'Called play.');
        if (params === undefined) {
            params = new Array('spotify:track:4w6Y6WiZxAsKT9OPJiTlpe');
        }

        Spotify.login(this.username, this.password, function (err, spotify) {
            if (err) {
                that.discordClient.reply(message, err);
                return;
            }

            // first get a "Track" instance from the track URI
            try {
                spotify.get(parameter, function (err, track) {
                    if (err) {
                        that.client.reply(message, err);
                        return;
                    }

                    that.discordClient.reply(message, 'Playing: ' + track.artist[0].name + ' - ' + track.name);
                    that.discordClient.voiceConnection.playRawStream(track
                        .play()
                        .on('error', function (err) {
                            that.client.reply(message, err);
                        })
                        .pipe(new lame.Decoder()));
                });
            } catch (err) {
                that.discordClient.reply(message, err);
            }
        });
    }

    pause(message, params) {

    }
};