'use strict';
const DiscordBotModule = require('../discordBotModule.js');
const ytdl = require('ytdl-core');
const Q = require('Q');

module.exports = class YoutubeModule extends DiscordBotModule {
  constructor(discordClient, config) {
    let commands = ['play', 'np', 'skip', 'stop', 'volume', 'queue'];
    super('YoutubeModule', commands, discordClient);
    this.config = config;
    this.isPlaying = false;
    this.currentTrackInfo = {};
    this.queuedTracks = [];
    this.currentVolume = 0.25;
  }

  init(message, params) {
    let that = this;
    let deferred = Q.defer();

    if (this.voiceConnection) {
      return Q.resolve(this.voiceConnection);
    }

    console.log("Trying to join voice channel: " + this.config.voiceChannelName);
    var channel = this.discordClient.channels.filter((item) => item.type === 'voice' && item.name === this.config.voiceChannelName).values().next().value;
    if (channel === undefined) {
      return deferred.reject(null); // TODO send proper error up the chain, this will just fail with a .then undefined
    }

    channel.join().then((connection) => {
      that.voiceConnection = connection;
      return deferred.resolve(that.voiceConnection);
    }).catch(function (error) {
      return deferred.reject(new Error(error));
    });

    return deferred.promise;
  }

  volume(message, params) {
    if (params.length === 0) {
      return this.reply(message, 'Current volume: ' + this.currentVolume, true);
    }

    try {
      this.currentVolume = parseFloat(params[0]);
    } catch (err) {
      this.reply(message, 'Volume needs to be a number.', true);
    }

    if (this.dispatcher !== undefined) {
      this.dispatcher.setVolume(this.currentVolume);
    }

    this.reply(message, 'Set volume to ' + this.currentVolume, true);
  }

  play(message, params) {
    let that = this;

    let track = params[0];
    if (track === undefined) {
      return this.reply(message, 'Please provide a song.', true);
    }


    if (this.isPlaying) {
      this.queuedTracks.push(track);
      this.reply(message, 'Added song "' + this.formatTrack(track) + '" to queue at position ' + this.queuedTracks.length + '.', true);
      return;
    }

    this.currentTrack = track;

    try {
      let stream = ytdl(track, {
        filter: 'audioonly'
      });
      this.discordClient.user.setGame(track);
      this.reply(message, 'Playing: ' + track + (this.queuedTracks.length > 0 ? ' (' + this.queuedTracks.length + ' queued)' : ''), true);
      this.init().then((connection) => {
        that.dispatcher = connection.playStream(stream, {
          volume: that.currentVolume
        });

        that.dispatcher.once('start', () => {
          that.currentTrackInfo.startedAt = new Date().getTime();
        });

        stream.on('info', (info) => {
          that.setSongInfo(info);
          that.discordClient.user.setGame(info.title);
        });

        stream.on('response', (res) => {
          res.on('end', handleTrackEvent);
        });

        that.isPlaying = true;
      })
    } catch (err) {
      handleTrackEvent(err);
    }

    function handleTrackEvent(err) {
      if (err && err !== 'stream') {
        that.reply(message, err);
      }

      that.isPlaying = false;
      that.currentTrack = null;
      that.discordClient.user.setGame(null);

      if (that.queuedTracks.length > 0) {
        that.play(message, [that.queuedTracks.shift()]);
      }
    }
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
    this.play(message, [this.queuedTracks.shift()]);
  }

  stop(message, params) {
    if (!this.isPlaying) {
      return;
    }

    this.dispatcher.end();
    this.discordClient.user.setGame(null);
    this.reply(message, 'Playback stopped.', true);
    this.isPlaying = false;
    this.currentTrack = null;
    this.dispatcher = undefined;
    this.queuedTracks = [];
  }

  np(message, params) {
    if (!this.isPlaying) {
      this.reply(message, 'I am not playing anything right now.', true);
      return;
    }

    this.reply(message, 'Now playing: (' + this.getCurrentPlayTime() + '/' + this.getTotalPlayTime() + ') ' + (this.currentTrackInfo.title || this.currentTrack) + ' (' + this.queuedTracks.length + ' tracks queued).', true);
  }

  queue(message, params) {
    if (this.queuedTracks.length === 0) {
      return this.reply(message, 'There are no tracks queued at the moment.', true);
    }

    let reply = 'Currently queued tracks: \n';
    for (let i in this.queuedTracks) {
      if (i > 10) {
        reply += 'And ' + (this.queuedTracks.length - 10) + ' more.';
        break;
      }

      reply += (parseInt(i) + 1) + '. ' + this.formatTrack(this.queuedTracks[i]) + '\n';
    }

    return this.discordClient.reply(message, reply, true);
  }

  formatTrack(track) {
    return track;
  }

  setSongInfo(info) {
    this.currentTrackInfo = {
      duration: info.length_seconds,
      title: info.title
    }
  }

  getCurrentPlayTime() {
    let playTime = (new Date().getTime() - this.currentTrackInfo.startedAt);
    return this.formatTicksAsTime(playTime);
  }

  getTotalPlayTime() {
    return this.formatTicksAsTime(this.currentTrackInfo.duration * 1000);
  }

  formatTicksAsTime(ticks) {
    var ticksAsSeconds = ticks / 1000;

    var hours = Math.floor(ticksAsSeconds / 3600);
    var minutes = Math.floor((ticksAsSeconds - (hours * 3600)) / 60);
    var seconds = Math.floor(ticksAsSeconds - (hours * 3600) - (minutes * 60));

    if (hours < 10) {
      hours = "0" + hours;
    }

    if (minutes < 10) {
      minutes = "0" + minutes;
    }

    if (seconds < 10) {
      seconds = "0" + seconds;
    }

    return hours + ':' + minutes + ':' + seconds;
  }
};