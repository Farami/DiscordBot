'use strict';
const Spotify = require('spotify-web');
const DiscordBotModule = require('../discordBotModule.js');
const config = require('./spotifyModule.json');

module.exports = class SpotifyModule extends DiscordBotModule {
  constructor(discordClient) {
    let commands = ['init', 'play', 'np', 'playPreview', 'stop'];

    super('SpotifyModule', commands, discordClient);
    this.username = config.username;
    this.password = config.password;
    this.nowPlaying = false;
    this.isInit = false;
    this.queuedTracks = [];
  }

  init(message, params) {
    for (var channel of message.channel.server.channels) {
      if (channel instanceof this.discord.VoiceChannel) {
        if (channel.name === 'Noobs') {
          this.discordClient.joinVoiceChannel(channel).catch(function (error) { console.log(error); });
          this.discordClient.reply(message, 'Joined voice channel ' + channel.name);
          this.voiceChannel = channel;
          break;
        }
      }
    }

    this.isInit = true;
  }

  play(message, params) {
    if (!this.isInit) {
      this.init(message, params);
    }

    if (params.length === 0) {
      params[0] = 'spotify:track:4w6Y6WiZxAsKT9OPJiTlpe';
    }

    if (this.nowPlaying) {
      this.queuedTracks.push(params[0]);
      this.discordClient.reply(message, 'Already playing. Added song to queue at position ' + this.queuedTracks.length) + '.';
      return;
    }

    let that = this;
    Spotify.login(this.username, this.password, function (err, spotify) {
      if (err) {
        that.discordClient.reply(message, err);
        return;
      }

      try {
        spotify.get(params[0], function (err, track) {
          if (err) {
            that.client.reply(message, err);
            return;
          }



          that.currentTrack = track;
          that.discordClient.reply(message, 'Playing: ' + track.artist[0].name + ' - ' + track.name);
          let stream = track.play()
            .on('error', function (err) {
              that.discordClient.reply(message, err);
              that.nowPlaying = false;
              if (that.queuedTracks.length > 0) {
                that.play(message, [that.queuedTracks.pop()]);
              }
            })
            .on('end', function () {
              that.nowPlaying = false;
              if (that.queuedTracks.length > 0) {
                that.play(message, [that.queuedTracks.pop()]);
              }
            });

          that.discordClient.voiceConnection.playRawStream(stream, { volume: 0.25 });
          that.nowPlaying = true;
        });
      } catch (err) {
        that.discordClient.reply(message, err);
      }
    });
  }

  stop(message, params) {
    if (!this.nowPlaying) {
      return;
    }

    try {
      this.discordClient.voiceConnection.stopPlaying();
      this.discordClient.reply(message, 'Playback stopped.');
      this.nowPlaying = false;
    } catch (err) {

    }
  }

  np(message, params) {
    if (!this.nowPlaying) {
      this.discordClient.reply(message, 'I am not playing anything right now.');
    } else {
      this.discordClient.reply(message, 'Now playing: ' + this.currentTrack.artist[0].name + ' - ' + this.currentTrack.name);
    }
  }
};
