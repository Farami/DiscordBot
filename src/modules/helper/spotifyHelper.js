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
        return deferred.reject(err);
      }

      return deferred.resolve(spotify);
    }

    return deferred.promise;
  };

  getAlbumTracks(albumUri) {
    var deferred = Q.defer();
    this.get(albumUri).then(function (album) {
      let tracks = [];
      album.disc.forEach(function (disc) {
        if (!Array.isArray(disc.track)) {
          return;
        }

        tracks.push.apply(tracks, disc.track);
      });

      let trackUris = tracks.map(function (value) { return value.uri; });
      return deferred.resolve(trackUris);
    });

    return deferred.promise;
  }

  getPlaylistTracks(playlistUri) {
    var deferred = Q.defer();
    this.login().then(function (spotify) {
      spotify.playlist(playlistUri, function (err, playlist) {
        if (err) {
          return deferred.reject(new Error(err));
        }

        var trackUris = playlist.contents.items.map(function (value) { return value.uri; });
        return deferred.resolve(trackUris);
      });
    }, function (err) {
      return deferred.reject(new Error(err));
    });

    return deferred.promise;
  }

  get(trackUrl) {
    var deferred = Q.defer();

    this.login().then(get, deferred.reject);

    function get(spotify) {
      spotify.get(trackUrl, resolve);
    }

    function resolve(err, track) {
      if (err) {
        return deferred.reject(err);
      }

      return deferred.resolve(track);
    };

    return deferred.promise;
  };

  uriType(uri) {
    return Spotify.uriType(uri);
  }

  shuffle(trackUris) {
    let currentIndex = trackUris.length;
    let temporaryValue;
    let randomIndex;

    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = trackUris[currentIndex];
      trackUris[currentIndex] = trackUris[randomIndex];
      trackUris[randomIndex] = temporaryValue;
    }

    return trackUris;
  }
};
