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

      if (params.length === 0) {
        deferred.reject(new Error('Please provide a song.'));
      }

      let that = this;

      // when the parameter is already a track object don't get the track again, just play it
      if (typeof params[0] === 'object') {
        playTrack(params[0]);
        return;
      }

      let isAlbum = /^spotify:album:\w+$/i.test(params[0]);

      if (isAlbum) {
        this.spotifyHelper.get(params[0])
          .then(function (album) {
            let tracks = [];
            album.disc.forEach(function (disc) {
              if (!Array.isArray(disc.track)) {
                return;
              }

              tracks.push.apply(tracks, disc.track);
            });

            playAlbum(tracks.map(function (value) { return value.uri; }));
          })
          .fail(function (err) {
            deferred.reject(new Error(err));
          });
      } else {
        this.spotifyHelper.get(params[0])
          .then(playTrack)
          .fail(function (err) {
            deferred.reject(new Error(err));
          });
      }

      function playAlbum(tracks) {
        if (!that.isPlaying) {
          that.play(message, [tracks.shift()]);
        }

        for (let track in tracks) {
          that.queuedTracks.push(track);
        }

        that.discordClient.reply(message, 'Queued ' + tracks.length + ' tracks.');
      }

      function playTrack(track) {
        if (that.isPlaying) {
          that.queuedTracks.push(track);
          deferred.resolve('Added song "' + that.formatTrack(track) + '" to queue at position ' + that.queuedTracks.length + '.');
          return;
        }

        that.currentTrack = track;

        try {
          let stream = track.play().on('error', handleTrackEvent).on('end', handleTrackEvent).on('finish', handleTrackEvent);
          that.discordClient.voiceConnection.playRawStream(stream, { volume: that.currentVolume });
          deferred.resolve('Playing: ' + that.formatTrack(track));
        } catch (err) {
          handleTrackEvent(err);
          deferred.reject(new Error(err));
        }

        that.isPlaying = true;

        function handleTrackEvent(err) {
          if (err) {
            deferred.reject(new Error(err));
          }

          that.isPlaying = false;
          that.currentTrack = null;
          checkForNextTrack();
        }

        function checkForNextTrack() {
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
              deferred.reject(new Error(error));
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
          that.discordClient.reply(message, result);
        }, function (err) {
          that.discordClient.reply(message, err);
        });
      });
    } else {
      this._play(message, params).then(function (result) {
        that.discordClient.reply(message, result);
      }, function (err) {
        that.discordClient.reply(message, err);
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

    let that = this;
    this.play(message, [this.queuedTracks.pop()]).fail(function (err) {
      that.discordClient.reply(message, err);
    });
  }

  stop(message, params) {
    if (!this.isPlaying) {
      return;
    }

    try {
      this.discordClient.voiceConnection.stopPlaying();
    } catch (err) {
      this.discordClient.reply(message, err);
    }

    this.discordClient.reply(message, 'Playback stopped.');
    this.isPlaying = false;
    this.currentTrack = null;
  }

  np(message, params) {
    if (!this.isPlaying) {
      this.discordClient.reply(message, 'I am not playing anything right now.');
    } else {
      this.discordClient.reply(message, 'Now playing: ' + this.currentTrack.artist[0].name + ' - ' + this.currentTrack.name);
    }
  }
};
