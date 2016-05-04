'use strict';
const SpotifyHelper = require('./helper/spotifyHelper.js');
const DiscordBotModule = require('../discordBotModule.js');
const config = require('./spotifyModule.json');
const Q = require('Q');

module.exports = class SpotifyModule extends DiscordBotModule {
  constructor(discordClient) {
    let commands = ['init', 'play', 'np', 'skip', 'stop', 'volume', 'queue'];
    super('SpotifyModule', commands, discordClient);

    this.isPlaying = false;
    this.isInit = false;
    this.queuedTracks = [];
    this.currentVolume = 0.25;
    this.spotifyHelper = new SpotifyHelper(config.username, config.password);

    this._getTracks = (uri) => {
      let that = this;

      let uriType = this.spotifyHelper.uriType(uri);
      switch (uriType) {
        case 'track':
          return this.spotifyHelper.get(uri).then(function (track) {
            return [track];
          });
        case 'album':
          return this.spotifyHelper.getAlbumTracks(uri).then(function (tracks) {
            return tracks;
          });
        case 'playlist':
          return this.spotifyHelper.getPlaylistTracks(uri).then(function (trackUris) {
            return that.spotifyHelper.get(trackUris);
          }).then(function (tracks) {
            return tracks;
          });
        default:
          return Q.defer().reject('unsupported uri type ' + uriType);
      }
    };

    this._play = (message, params) => {
      let that = this;

      if (params === null || params.length === 0) {
        return that.discordClient.reply(message, 'Please provide a song.');
      }

      // when the parameter is already a track object don't get the track again, just play it
      if (typeof params[0] === 'object') {
        return playOne(params[0]);
      }

      var shuffle = false;
      if (params.length > 1) {
        if (params[1] === 'shuffle') {
          shuffle = true;
        }
      }

      this._getTracks(params[0]).then(function (tracks) {
        if (shuffle) {
          tracks = that.spotifyHelper.shuffle(tracks);
        }

        playMultiple(tracks);
      }).catch(function (err) {
        that.discordClient.reply(message, err);
      });

      function playMultiple(tracks) {
        if (!that.isPlaying) {
          playOne(tracks.shift());
        }

        if (tracks.length === 0) {
          return;
        }

        that.queuedTracks = that.queuedTracks.concat(tracks);
        that.discordClient.reply(message, 'Queued ' + tracks.length + ' tracks.');
      }

      function playOne(track) {
        if (that.isPlaying) {
          that.queuedTracks.push(track);
          return that.discordClient.reply(message, 'Added song "' + that.spotifyHelper.formatTrack(track) + '" to queue at position ' + that.queuedTracks.length + '.');
        }

        that.currentTrack = track;

        try {
          let stream = track.play().on('error', handleTrackEvent).on('end', handleTrackEvent).on('finish', handleTrackEvent);
          that.discordClient.setPlayingGame(that.spotifyHelper.formatTrack(track));
          that.discordClient.reply(message, 'Playing: ' + that.spotifyHelper.formatTrack(track) + (that.queuedTracks.length > 0 ? ' (' + that.queuedTracks.length + ' queued)' : ''));
          that.discordClient.voiceConnection.playRawStream(stream, { volume: that.currentVolume });
          that.isPlaying = true;
        } catch (err) {
          handleTrackEvent(err);
        }

        function handleTrackEvent(err) {
          if (err) {
            that.discordClient.reply(message, err);
          }

          that.isPlaying = false;
          that.currentTrack = null;
          that.discordClient.setPlayingGame(null);

          if (that.queuedTracks.length > 0) {
            that.play(message, [that.queuedTracks.shift()]);
          } else {
            that.spotifyHelper.disconnect();
          }
        }
      }
    };
  }

  init(message, params) {
    var deferred = Q.defer();

    if (this.isInit) {
      return Q.resolve();
    }

    let that = this;
    for (var channel of message.channel.server.channels) {
      if (channel instanceof this.discord.VoiceChannel) {
        if (channel.name === config.voiceChannelName) {
          this.discordClient.joinVoiceChannel(channel)
            .then(() => {
              that.isInit = true;
              return deferred.resolve();
            }).catch(function (error) {
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
    this.init(message, params).then(() => {
      that._play(message, params);
    });
  }

  skip(message, params) {
    if (!this.isPlaying) {
      return;
    }

    if (this.queuedTracks.length === 0) {
      return this.discordClient.sendMessage(message.channel, 'Can\'t skip, no tracks in queue.');
    }

    this.isPlaying = false;
    this.currentTrack = null;
    this._play(message, [this.queuedTracks.pop()]);
  }

  stop(message, params) {
    if (!this.isPlaying) {
      return;
    }

    this.discordClient.voiceConnection.stopPlaying();
    this.discordClient.setPlayingGame(null);
    this.discordClient.reply(message, 'Playback stopped.');
    this.isPlaying = false;
    this.currentTrack = null;
    this.queuedTracks = [];
  }

  np(message, params) {
    if (!this.isPlaying) {
      this.discordClient.reply(message, 'I am not playing anything right now.');
      return;
    }

    this.discordClient.reply(message, 'Now playing: ' + this.spotifyHelper.formatTrack(this.currentTrack) + ' (' + this.queuedTracks.length + ' tracks queued).');
  }

  queue(message, params) {
    if (this.queuedTracks.length === 0) {
      return this.discordClient.reply(message, 'There are no tracks queued at the moment.');
    }

    var reply = 'Currently queued tracks: \n';

    for (let i in this.queuedTracks) {
      if (i > 10) {
        reply += 'And ' + (this.queuedTracks.length - 10) + ' more.';
        break;
      }

      reply += (parseInt(i) + 1) + '. ' + this.spotifyHelper.formatTrack(this.queuedTracks[i]) + '\n';
    }

    return this.discordClient.reply(message, reply);
  }
};
