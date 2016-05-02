'use strict';
const Spotify = require('spotify-web');
const Q = require('Q');

module.exports = class SpotifyHelper {
  constructor(username, password) {
    this.username = username;
    this.password = password;
  }

  login() {
    var deferred = Q.defer();
    Spotify.login(this.username, this.password, resolve);

    function resolve(err, spotify) {
      if (err) {
        deferred.reject(err);
        return;
      }

      deferred.resolve(spotify);
    }

    return deferred.promise;
  };

  get(trackUrl) {
    var deferred = Q.defer();

    this.login().then(get).fail(deferred.reject);

    function get(spotify) {
      spotify.get(trackUrl, resolve);
    }

    function resolve(err, track) {
      if (err) {
        deferred.reject(err);
        return;
      }

      deferred.resolve(track);
    };

    return deferred.promise;
  };
};
