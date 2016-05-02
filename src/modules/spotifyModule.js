'use strict';
const SpotifyHelper = require('./helper/spotifyHelper.js');
const DiscordBotModule = require('../discordBotModule.js');
const config = require('./spotifyModule.json');
const Q = require('Q');

module.exports = class SpotifyModule extends DiscordBotModule {
  constructor(discordClient) {
    let commands = ['init', 'play', 'np', 'skip', 'playPreview', 'stop', 'volume'];
    super('SpotifyModule', commands, discordClient);

    this.isPlaying = false;
    this.isInit = false;
    this.queuedTracks = [];
    this.currentVolume = 0.25;
    this.spotifyHelper = new SpotifyHelper(config.username, config.password);

    this.formatTrack = (track) => track.artist[0].name + ' - ' + track.name;

    this._play = (message, params) => {
      var deferred = Q.defer();

      if (params === null || params.length === 0) {
        return deferred.reject(new Error('Please provide a song.'));
      }

      // when the parameter is already a track object don't get the track again, just play it
      if (typeof params[0] === 'object') {
        playTrack(params[0]);
        return;
      }

      let isAlbum = /^spotify:album:\w+$/i.test(params[0]);
      if (isAlbum) {
        this.spotifyHelper.getAlbumTracks(params[0]).then(playAlbum, handleError);
      } else {
        this.spotifyHelper.get(params[0]).then(playTrack, handleError);
      }

      function handleError(err) {
        return deferred.reject(new Error(err));
      }

      let that = this;
      function playAlbum(tracks) {
        if (!that.isPlaying) {
          that.play(message, [tracks.shift()]);
        }

        for (let track of tracks) {
          that.queuedTracks.push(track);
        }

        that.discordClient.reply(message, 'Queued ' + tracks.length + ' tracks.');
      }

      function playTrack(track) {
        if (that.isPlaying) {
          that.queuedTracks.push(track);
          return deferred.resolve('Added song "' + that.formatTrack(track) + '" to queue at position ' + that.queuedTracks.length + '.');
        }

        that.currentTrack = track;

        try {
          let stream = track.play().on('error', handleTrackEvent).on('end', handleTrackEvent).on('finish', handleTrackEvent);
          that.discordClient.voiceConnection.playRawStream(stream, { volume: that.currentVolume });

          that.isPlaying = true;
          that.discordClient.setPlayingGame(that.formatTrack(track));
          return deferred.resolve('Playing: ' + that.formatTrack(track));
        } catch (err) {
          handleTrackEvent(err);
          return deferred.reject(new Error(err));
        }

        function handleTrackEvent(err) {
          if (err) {
            return deferred.reject(new Error(err));
          }

          that.isPlaying = false;
          that.currentTrack = null;
          that.discordClient.setPlayingGame(null);

          if (that.queuedTracks.length > 0) {
            that.play(message, [that.queuedTracks.pop()]);
          }
        }
      }

      return deferred.promise;
    };
  }

  init(message, params) {
    var deferred = Q.defer();

    let that = this;
    for (var channel of message.channel.server.channels) {
      if (channel instanceof this.discord.VoiceChannel) {
        if (channel.name === config.voiceChannelName) {
          this.discordClient.joinVoiceChannel(channel)
            .then(() => {
              that.isInit = true;
              deferred.resolve();
            }).catch(function (error) {
              console.log(error);
              return deferred.reject(new Error(error));
            });
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
      this.currentVolume = parseFloat(params[0]);
    } catch (err) {
      this.discordClient.reply(message, 'Parameter needs to be a float.');
    }

    if (this.discordClient.voiceConnection !== undefined) {
      this.discordClient.voiceConnection.setVolume(this.currentVolume);
    }

    this.discordClient.reply(message, 'Set volume to ' + this.currentVolume);
  }

  play(message, params) {
    let that = this;
    if (!this.isInit) {
      this.init(message, params).then(function () {
        that._play(message, params).then(function (result) {
          that.discordClient.sendMessage(message.channel, result);
        }, function (err) {
          that.discordClient.sendMessage(message.channel, err);
        });
      });
    } else {
      this._play(message, params).then(function (result) {
        that.discordClient.sendMessage(message.channel, result);
      }, function (err) {
        that.discordClient.sendMessage(message.channel, err);
      });
    }
  }

  skip(message, params) {
    if (!this.isPlaying) {
      return;
    }

    if (this.queuedTracks.length === 0) {
      this.discordClient.sendMessage(message.channel, 'Can\'t skip, no tracks in queue.');
      return;
    }

    this.isPlaying = false;
    this.currentTrack = null;

    this.discordClient.sendMessage(message.channel, 'Skipping current track.');

    this.play(message, [this.queuedTracks.pop()]);
  }

  stop(message, params) {
    if (!this.isPlaying) {
      return;
    }

    this.discordClient.voiceConnection.stopPlaying().catch(function () { });
    this.discordClient.setPlayingGame(null);
    this.discordClient.reply(message, 'Playback stopped.');
    this.isPlaying = false;
    this.currentTrack = null;
  }

  np(message, params) {
    if (!this.isPlaying) {
      this.discordClient.reply(message, 'I am not playing anything right now.');
      return;
    }

    this.discordClient.reply(message, 'Now playing: ' + this.currentTrack.artist[0].name + ' - ' + this.currentTrack.name);
  }
};
