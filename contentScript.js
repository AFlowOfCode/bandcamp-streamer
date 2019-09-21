(function(window, document) {

    const bcplayer = window.playerview;

    let feedPlaylist = [],
        feedPlaylistLength,
        releasePlaylist = [],
        releasePlaylistLength,
        currentList = 'feed',
        pausedTrack;

    // get track ids for feed or releases playlists
    function getTrackIds(list) {
      console.log(`getting track ids for ${list} list`);
      let listSelector = list === 'feed' ? '#story-list .track_play_hilite' : '#new-releases-vm .collection-grid > li',
          entries = document.querySelectorAll(listSelector),
          trackCollection = [];
      for (let i = 0; i < entries.length; i++) {
        let track = entries[i].getAttribute('data-trackid');
        if (track !== '') {
            trackCollection.push(track);
            console.log(track);
        } 
      }
      return trackCollection;
    }

    // determine which list was clicked & switch playlists as needed
    function bindPlayButtons() {
      let playButtons = document.getElementsByClassName('play-button');
      for (let i = 0; i < playButtons.length; i++) {
        playButtons[i].closest('.track_play_auxiliary').addEventListener('click', playButtonHandler);
      } 
    }

    function playButtonHandler(e) {
      let isFeed = e.target.closest('.story-innards') !== null,
          trackId = e.target.closest('.track_play_auxiliary').getAttribute('data-trackid'),
          listTarget = isFeed ? 'feed' : 'release';
      
      switchLists(listTarget);
      let playlistLength = bcplayer._playlist.length();

      console.log(`about to play ${trackId}, #${bcplayer._playlist._track} in playlist`);

      for (let t = 0; t < playlistLength; t++) {
        if (bcplayer._playlist._playlist[t].id.toString() === trackId) {
          // check if user is pausing a track, unpausing, or playing a new one
          if (bcplayer.currently_playing_track() !== null && 
              bcplayer._playing_state === 'PLAYING' &&
              bcplayer.currently_playing_track().id.toString() === trackId) {
            pausedTrack = trackId;
            console.log('pausing');
            newFeedPlaylist.playpause();
          } else {
            console.log('found track, playing now');
            if (pausedTrack === trackId) {
              console.log("unpausing");
              newFeedPlaylist.playpause();
              pausedTrack = '';
            } else {                  
              bcplayer._playlist.play_track(bcplayer._playlist._playlist[t].tracknum);
            }
          }
        }
      }
    }

    function switchLists(list) {
      if (list === currentList) {
        return;
      } else if (list === 'release') {
        // save the current feed playlist (it's possible new tracks were added by scrolling)
        currentList = 'release';
        feedPlaylist = bcplayer._playlist._playlist;
        // .load calls .unload, which kills the whole playlist        
        bcplayer._playlist.load(releasePlaylist);
        // note: if release playlist ends, any scroll-added tracks will play automatically
        // (they are appended dynamically to the list)
      } else {
        // check for scroll-added tracks
        console.log(`release playlist length start: ${releasePlaylistLength} & end: ${bcplayer._playlist.length()}`);
        if (bcplayer._playlist.length() > releasePlaylistLength) {
          console.log(`${bcplayer._playlist.length() - releasePlaylistLength} tracks added by scrolling`);
          for (let i = releasePlaylistLength; i < bcplayer._playlist.length(); i++) {
            feedPlaylist.push(bcplayer._playlist._playlist[i]);
          }
        }        
        currentList = 'feed';
        bcplayer._playlist.load(feedPlaylist);
        console.log(bcplayer._playlist._playlist);
      }
      console.log(`switched list to ${list}`);
      bcplayer._handle_playlistchange();
    }

    function FeedPlaylist() {
        if (!bcplayer) {
            console.error('[bandcampFeedPlaylist] player is not found.');
            return null;
        }

        // build playlists
        let feedTracks = getTrackIds('feed'),
            releaseTracks = getTrackIds('releases'),
            originalPlaylist = bcplayer._playlist._playlist,
            addedToFeed = [],
            feedDuplicates = {};

        // going to replace default playlist with filtered playlist
        bcplayer._playlist._playlist = [];

        function countInArray(array, value) {
          return array.reduce((n, x) => n + (x === value), 0);
        }

        // sort all tracks into appropriate playlists
        // if track shows up in both feed and new release, it messes up the order of the original playlist
        // so we need to create separate playlists
        for (let i = 0; i < originalPlaylist.length; i++) {
          let origId = originalPlaylist[i].id.toString();
          if (feedTracks.indexOf(origId) != -1) {
            let dupes = false,
                timesInArray = countInArray(feedTracks, origId),
                timesAdded = 0;
            if (timesInArray > 1) {
              console.log(`${origId} appears ${timesInArray} times in feed`);
              if (!(origId in feedDuplicates)) {
                feedDuplicates[origId] = {"times": timesInArray, "timesAdded": 0};
              } else {
                timesAdded = feedDuplicates[origId].timesAdded;
              }
              dupes = true;
            }
            // tracks can appear in both feed and new release
            // if this occurs they will show up twice in the feed playlist too
            // we only want it once in each list. Only add it to feed if not already added
            // BUT if it actually shows up because multiple people bought it, we want it there again
            // If a dupe gets loaded via scrolling, it is not added for some reason
            // But that's bandcamp doing that...
            // Clicking on the 2nd occurrence puts the playlist location back to the 1st occurrence
            // then clicking on other tracks does nothing
            // TODO: FIX THAT
            if (addedToFeed.indexOf(originalPlaylist[i].id) == -1 || (dupes && timesAdded < timesInArray)) {
              bcplayer._playlist._playlist.push(originalPlaylist[i]);
              addedToFeed.push(originalPlaylist[i].id);
              if (dupes) {
                feedDuplicates[origId].timesAdded++;
              }
            }
            // add it to release 
            if (releaseTracks.indexOf(origId) != -1) {
              releasePlaylist.push(originalPlaylist[i]);
            }
          } else if (releaseTracks.indexOf(origId) != -1) {
            releasePlaylist.push(originalPlaylist[i]);
          }
        }
        // 10 loaded by default, but could change on whims of bandcamp
        // reference this to determine when tracks are added by scrolling
        feedPlaylistLength = bcplayer._playlist.length();
        // reference this in case any tracks added via scrolling while release list is playing
        releasePlaylistLength = releasePlaylist.length;
        
        bindPlayButtons();        
        // this needs to be done every time new tracks are loaded at bottom 
        // or won't be able to click on newly added tracks (they'd still work via the player prev/next buttons)
        let storyList = document.getElementById('story-list'),
            options = {
              childList: true
            },
            observer = new MutationObserver((mutations) => {
              let numStories = document.querySelectorAll('.story-innards').length;
              if (numStories > feedPlaylistLength) {
                console.log(`there are now ${numStories} items in feed`);
                bindPlayButtons();
              }
            });
        observer.observe(storyList, options);

        // Observable
        this.playlist = bcplayer._playlist;
        this._state = this.playlist._state;
        this._track = this.playlist._track;
        this._position = this.playlist._position;
        this._duration = this.playlist._duration;
        this.handlerNextTrack = function() { return this.next() }.bind(this);

        this.$trackPlayWaypoint = bcplayer._waypoints[0];

        if (this.$trackPlayWaypoint) {
            this.$el = this.injectHtml();
            this.$position = this.$el.querySelector('#track_play_waypoints_controls_position');
            this.$duration = this.$el.querySelector('#track_play_waypoints_controls_duration');
             this.observe();
            console.debug('[bandcampFeedPlaylist] injected');
        }
    }

    // Observe changes
    FeedPlaylist.prototype.observe = function(e) {
        const self = this;
        const observers = [
            { 'obj': this.playlist, prop: '_track' },
            { 'obj': this.playlist, prop: '_state', callback: this.onStateUpdate.bind(this) },
            { 'obj': this.playlist, prop: '_duration', callback: this.updateDuration.bind(this) },
            { 'obj': this.playlist, prop: '_position', callback: this.updatePosition.bind(this) },
        ]

        observers.map(observer => {
            Object.defineProperty(observer.obj, observer.prop, {
                get: function() { return self[observer.prop]; },
                set: function(newValue) {
                    if (newValue === self[observer.prop]) { return }
                    self[observer.prop] = newValue;
                    if (typeof observer.callback == 'function') {
                        return observer.callback(newValue);
                    }
                    return newValue;
                }
            })
        })
    }


    // Methods
    FeedPlaylist.prototype.playpause = function(e) {
        if (e) {
            e.preventDefault();
        }
        return this.playlist.playpause();
    }

    FeedPlaylist.prototype.next = function(e) {
        if (e) {
            e.preventDefault();
        }
        return this.playlist.next_track()
    }

    FeedPlaylist.prototype.previous = function(e) {
        if (e) {
            e.preventDefault();
        }
        return this.playlist.prev_track();
    }

    FeedPlaylist.prototype.onStateUpdate = function(state) {
        // TODO: replace setTimeout
        if (state === "COMPLETED") {
            let timer = setTimeout(this.handlerNextTrack, 1000);
            timer = undefined;
        }
        return;
    }

    // DOM
    FeedPlaylist.prototype.updatePosition = function() {
        return this.$position.innerText = window.Time.timeStr(this._position)
    }

    FeedPlaylist.prototype.updateDuration = function() {
        return this.$duration.innerText = window.Time.timeStr(this._duration)
    }

    FeedPlaylist.prototype.injectHtml = function() {
        const container = document.createElement('div');
        container.id = "track_play_waypoint_controls";
        const infos = [
            { text: "0:00", id: "track_play_waypoints_controls_position" },
            { text: "/" },
            { text: "0:00", id: "track_play_waypoints_controls_duration" },
        ];
        const controls = [
            { text: 'Previous', action: this.previous.bind(this) },
            { text: 'Play/Pause', action: this.playpause.bind(this) },
            { text: 'Next', action: this.next.bind(this) }
        ];

        infos.map(info => {
            let element = document.createElement('span');
            if (info.id) {
                element.id = info.id;
            }
            element.innerText = info.text;
            container.appendChild(element);
        });

        controls.map(control => {
            let element = document.createElement('a');
            element.href = "#";
            element.innerText = control.text;
            element.addEventListener('click', control.action)
            container.appendChild(element);
        });

        return this.$trackPlayWaypoint.parentElement.appendChild(container);
    }

    console.debug('[bandcampFeedPlaylist] loaded');
    let newFeedPlaylist = new FeedPlaylist();
})(window, document);