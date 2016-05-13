'use strict';
const Spotify = require('spotify-web');
const Q = require('Q');

/**
 * Offers helper functions for spotify.
 * @constructor
 *  @param {string} username - the username.
 *  @param {string} password - the password.
 */
module.exports = class SpotifyHelper {
  constructor(username, password) {
    this.username = username;
    this.password = password;
  }


  /**
   * Disconnects from spotify when connected.
   */
  disconnect() {
    if (this.spotify) {
      this.spotify.disconnect();
    }
  }

  /**
   * Logs in to spotify.
   *
   * @returns the spotify instance.
   */
  login() {
    var deferred = Q.defer();
    this.spotify = Spotify.login(this.username, this.password, resolve);

    function resolve(err, spotify) {
      if (err) {
        return deferred.reject(err);
      }

      return deferred.resolve(spotify);
    }

    return deferred.promise;
  };

  /**
   * Formats the track as 'Artist - Track'
   *
   * @param track The spotify track instance
   * @returns the formatted string
   */
  formatTrack(track) {
    return track.artist[0].name + ' - ' + track.name;
  }

  /**
   * Gets the given uri from spotify.
   *
   * @param uri the spotify uri.
   * @returns the given spotify object (track, album...).
   */
  get(uri) {
    let that = this;

    let uriType = this.uriType(uri);
    return this.login().then((spotify) => {
      switch (uriType) {
        case 'track':
          return spotifyGet(spotify, uri).then((track) => { return [track]; });
        case 'album':
          return spotifyGet(spotify, uri).then((album) => {
            let tracks = [];
            album.disc.forEach((disc) => {
              if (!Array.isArray(disc.track)) {
                return;
              }

              tracks.push.apply(tracks, disc.track);
            });

            return tracks.map((value) => { return value.uri; });
          }).then((trackUris) => {
            return spotifyGet(that.spotify, trackUris);
          });
        case 'playlist':
          let defer = Q.defer();
          spotify.playlist(uri, (err, playlist) => {
            if (err) {
              return defer.reject(new Error(err));
            }

            let uris = playlist.contents.items.map((value) => { return value.uri; });
            spotifyGet(that.spotify, uris).then((tracks) => { return defer.resolve(tracks); });
          });

          return defer.promise;
        default:
          return Q.defer().reject('unsupported uri type ' + uriType);
      }
    });

    /**
     * Wraps spotify.webs get with a promise.
     *
     * @param spotify the spotify instance to use
     * @param uri the uri to pass to spotifys get
     * @returns the object returned by spotifys get
     */
    function spotifyGet(spotify, uri) {
      let defer = Q.defer();
      spotify.get(uri, (err, result) => {
        if (err) {
          defer.reject(new Error(err));
        }

        return defer.resolve(result);
      });

      return defer.promise;
    }
  };

  /**
   * Returns the uri-type for the given uri-string
   *
   * @param uri the uri.
   * @returns the uri type.
   */
  uriType(uri) {
    return Spotify.uriType(uri);
  };

  /**
   * Shuffles the given array.
   *
   * @param trackUris the track uris to shuffle.
   * @returns a shuffled array of the given track uris.
   */
  shuffle(trackUris) {
    let currentIndex = trackUris.length;
    let temporaryValue;
    let randomIndex;

    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
      temporaryValue = trackUris[currentIndex];
      trackUris[currentIndex] = trackUris[randomIndex];
      trackUris[randomIndex] = temporaryValue;
    }

    return trackUris;
  }
};
