'use strict';
const Spotify = require('spotify-web');
const DiscordBotModule = require('../discordBotModule.js');
const config = require('./spotifyModule.json');
const Q = require('Q');

module.exports = class SpotifyModule extends DiscordBotModule {
  constructor(discordClient) {
    let commands = ['init', 'play', 'np', 'skip', 'playPreview', 'stop', 'volume'];

    super('SpotifyModule', commands, discordClient);
    this.nowPlaying = false;
    this.isInit = false;
    this.queuedTracks = [];
    this.volume = 0.25;

    let that = this;
    Spotify.login(config.username, config.password, function (err, spotify) {
      if (err) {
        console.log('Error while logging into spotify: ' + err);
        return;
      }

      that.spotifyClient = spotify;
      console.log('Logged into spotify.');
    });

    this.getTrack = (trackUrl, callback) => {
      if (!this.spotifyClient) {
        callback('Not logged into spotify.', null);
      }

      try {
        this.spotifyClient.get(trackUrl, function (err, track) {
          if (err) {
            callback(err, null);
            return;
          }

          callback(null, track);
        });
      } catch (err) {
        callback(err, null);
      }
    };

    this.formatTrack = (track) => track.artist[0].name + ' - ' + track.name;

    this.playSong = (message, params) => {
      if (params.length === 0) {
        params[0] = 'spotify:track:4w6Y6WiZxAsKT9OPJiTlpe';
      }

      let that = this;
      this.getTrack(params[0], function (err, track) {
        if (err) {
          that.discordClient.reply(message, err);
        }

        if (that.nowPlaying) {
          that.queuedTracks.push(params[0]);
          that.discordClient.reply(message, 'Added song "' + that.formatTrack(track) + '" to queue at position ' + that.queuedTracks.length + '.');
          return;
        }

        function checkForNextTrack() {
          if (that.queuedTracks.length > 0) {
            that.play(message, [that.queuedTracks.pop()]);
          }
        }

        that.currentTrack = track;
        that.discordClient.reply(message, 'Playing: ' + that.formatTrack(track));
        let stream = track.play()
          .on('error', function (err) {
            that.discordClient.reply(message, err);

            that.nowPlaying = false;
            checkForNextTrack();
          })
          .on('end', function () {
            that.nowPlaying = false;
            checkForNextTrack();
          });

        try {
          that.discordClient.voiceConnection.playRawStream(stream, { volume: 0.25 });
        } catch (err) {
          that.discordClient.reply(message, err);
        }

        that.nowPlaying = true;
      });
    };
  }

  init(message, params) {
    var deferred = Q.defer();

    let that = this;
    for (var channel of message.channel.server.channels) {
      if (channel instanceof this.discord.VoiceChannel) {
        if (channel.name === 'Noobs') {
          this.discordClient
            .joinVoiceChannel(channel)
            .then(() => {
              that.isInit = true;
              deferred.resolve();
            })
            .catch(function (error) {
              console.log(error);
              deferred.reject;
            });

          this.discordClient.reply(message, 'Joined voice channel ' + channel.name);
          this.voiceChannel = channel;
          break;
        }
      }
    }

    return deferred.promise;
  }

  volume(message, params) {
    if (params.length === 0) {
      this.discordClient.reply(message, 'Parameter needed.');
      return;
    }

    try {
      this.volume = parseInt(params[0]);
    } catch (err) {
      this.discordClient.reply(message, 'Parameter needs to be a float.');
    }
  }

  play(message, params) {
    if (!this.isInit) {
      let that = this;
      this.init(message, params).then(function () {
        that.playSong(message, params);
      }).catch(function (err) {
        that.discordClient.reply(message, err);
      });
    } else {
      this.playSong(message, params);
    }
  }

  skip(message, params) {
    if (!this.nowPlaying) {
      return;
    }

    if (this.queuedTracks.length === 0) {
      return;
    }

    this.nowPlaying = false;
    this.currentTrack = null;

    this.discordClient.sendMessage(message.channel, 'Skipping current track.');
    try {
      this.discordClient.voiceConnection.stopPlaying();
    } catch (err) {
      this.discordClient.reply(message, err);
    }
    this.play(message, [this.queuedTracks.pop()]);
  }

  stop(message, params) {
    if (!this.nowPlaying) {
      return;
    }

    try {
      this.discordClient.voiceConnection.stopPlaying();
    } catch (err) {
      this.discordClient.reply(message, err);
    }

    this.discordClient.reply(message, 'Playback stopped.');
    this.nowPlaying = false;
    this.currentTrack = null;
  }

  np(message, params) {
    if (!this.nowPlaying) {
      this.discordClient.reply(message, 'I am not playing anything right now.');
    } else {
      this.discordClient.reply(message, 'Now playing: ' + this.currentTrack.artist[0].name + ' - ' + this.currentTrack.name);
    }
  }
};
