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

    this._play = (message, params) => {
      let that = this;
      if (params === null || params.length === 0) {
        return this.reply(message, 'Please provide a song.', true);
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

      this.spotifyHelper.get(params[0]).then((tracks) => {
        if (shuffle) {
          tracks = that.spotifyHelper.shuffle(tracks);
        }

        playMultiple(tracks);
      }).catch((err) => {
        that.reply(message, err);
      });

      function playMultiple(tracks) {
        if (!that.isPlaying) {
          playOne(tracks.shift());
        }

        if (tracks.length === 0) {
          return;
        }

        that.queuedTracks = that.queuedTracks.concat(tracks);
        that.reply(message, 'Queued ' + tracks.length + ' tracks.', true);
      }

      function playOne(track) {
        if (that.isPlaying) {
          that.queuedTracks.push(track);
          that.reply(message, 'Added song "' + that.spotifyHelper.formatTrack(track) + '" to queue at position ' + that.queuedTracks.length + '.', true);
        }

        that.currentTrack = track;

        try {
          let stream = track.play().on('error', handleTrackEvent).on('finish', handleTrackEvent);
          that.discordClient.setPlayingGame(that.spotifyHelper.formatTrack(track));
          that.reply(message, 'Playing: ' + that.spotifyHelper.formatTrack(track) + (that.queuedTracks.length > 0 ? ' (' + that.queuedTracks.length + ' queued)' : ''), true);
          that.discordClient.voiceConnection.playRawStream(stream, { volume: that.currentVolume });
          that.isPlaying = true;
        } catch (err) {
          handleTrackEvent(err);
        }

        function handleTrackEvent(err) {
          if (err) {
            that.reply(message, err);
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
      this.reply(message, 'Parameter needed.', true);
      return;
    }

    try {
      this.currentVolume = parseFloat(params[0]);
    } catch (err) {
      this.reply(message, 'Parameter needs to be a float.', true);
    }

    if (this.discordClient.voiceConnection !== undefined) {
      this.discordClient.voiceConnection.setVolume(this.currentVolume);
    }

    this.reply(message, 'Set volume to ' + this.currentVolume, true);
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
      return this.sendMessage(message.channel, 'Can\'t skip, no tracks in queue.', true);
    }

    this.isPlaying = false;
    this.currentTrack = null;
    this._play(message, [this.queuedTracks.shift()]);
  }

  stop(message, params) {
    if (!this.isPlaying) {
      return;
    }

    this.discordClient.voiceConnection.stopPlaying();
    this.discordClient.setPlayingGame(null);
    this.reply(message, 'Playback stopped.', true);
    this.isPlaying = false;
    this.currentTrack = null;
    this.queuedTracks = [];
  }

  np(message, params) {
    if (!this.isPlaying) {
      this.reply(message, 'I am not playing anything right now.', true);
      return;
    }

    this.reply(message, 'Now playing: ' + this.spotifyHelper.formatTrack(this.currentTrack) + ' (' + this.queuedTracks.length + ' tracks queued).', true);
  }

  queue(message, params) {
    if (this.queuedTracks.length === 0) {
      return this.reply(message, 'There are no tracks queued at the moment.', true);
    }

    var reply = 'Currently queued tracks: \n';
    for (let i in this.queuedTracks) {
      if (i > 10) {
        reply += 'And ' + (this.queuedTracks.length - 10) + ' more.';
        break;
      }

      reply += (parseInt(i) + 1) + '. ' + this.spotifyHelper.formatTrack(this.queuedTracks[i]) + '\n';
    }

    return this.discordClient.reply(message, reply, true);
  }
};
