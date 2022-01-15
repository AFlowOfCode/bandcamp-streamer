import { countInArray, observeTotal } from './shared.js';

export function FeedPlaylist(bcplayer, originalPlaylist) {
    
  // build playlists
  let feed_track_ids = get_track_ids('feed'),
      releaseTracks = get_track_ids('releases'),
      addedToFeed = [],
      feedDuplicates = {};

  console.log('feed track ids:', feed_track_ids);
  console.log('release track ids:', releaseTracks);


  // going to replace default playlist with filtered playlist
  bcplayer._playlist.unload();

  // sort all tracks into appropriate playlists because
  // if track shows up in both feed and new release, it messes up the order of the original playlist
  // by default, after 7 or 8 tracks it jumps to new releases 
  // (since they did not intend this to play through automatically)
  console.log('Sorting playlists');
  for (let i = 0; i < originalPlaylist.length; i++) {
    let origId = originalPlaylist[i].id.toString();
    // console.log(`index ${i} origId ${origId}`);
    if (feed_track_ids.indexOf(origId) != -1) {
      let dupes = false,
          timesInArray = countInArray(feed_track_ids, origId),
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
      if (addedToFeed.indexOf(originalPlaylist[i].id) == -1 || (dupes && timesAdded < timesInArray)) {
        // sometimes tracks in the beginning of the playlist are not on the page yet
        // make sure the tracknum matches index num 
        originalPlaylist[i].tracknum = bcplayer._playlist._playlist.length;
        setPrice(originalPlaylist[i].id);
        bcplayer._playlist._playlist.push(originalPlaylist[i]);
        addedToFeed.push(originalPlaylist[i].id);
        // console.log(`feed: added ${originalPlaylist[i].title}, tracknum ${originalPlaylist[i].tracknum} to slot ${bcplayer._playlist._playlist.length - 1}`);
        if (dupes) feedDuplicates[origId].timesAdded++;
      }
      // add it to release 
      if (releaseTracks.indexOf(origId) != -1) {
        console.log('track in both feed & release');
        addToReleasePlaylist(releaseTracks.indexOf(origId), originalPlaylist[i]);
      }
    } else if (releaseTracks.indexOf(origId) != -1) {
      addToReleasePlaylist(releaseTracks.indexOf(origId), originalPlaylist[i]);
    } else {
      // track is in playlist but not yet on page, so we don't need it right now
    }
  }

  // ensure release list is in the right order
  function addToReleasePlaylist(index, track) {
    releasePlaylist[index] = track;
    // console.log(`release: added ${track.title}, tracknum ${track.tracknum} to slot ${index}`);
    setPrice(track.id);
  }
  // 10 feed stories loaded by default, but could change on whims of bandcamp
  // reference this to determine when tracks are added by scrolling
  bcplayer.feed_playlist_length = bcplayer._playlist.length();
  console.log(`Feed has ${bcplayer.feed_playlist_length} tracks to start with`);
  console.log('initial feed playlist:', bcplayer._playlist._playlist);

  // reference this in case any tracks added via scrolling while release list is playing
  releasePlaylistLength = releasePlaylist.length;
  console.log('initial release playlist:', releasePlaylist, releasePlaylistLength);

  // this needs to be done every time new tracks are loaded at bottom 
  // or won't be able to click on newly added tracks (they'd still work via the player prev/next buttons)
  bind_play_buttons();     
  set_track_numbers();

  observeTotal('feed', document.getElementById('story-list'));  

  // Observable
  this.playlist = bcplayer._playlist;
  this._state = this.playlist._state;
  // _track sometimes is a string & is tracknum property of TrackInfo object (index val of playlist + 1)
  this._track = this.playlist._track;      
  this._position = this.playlist._position;
  this._duration = this.playlist._duration;
  this._volume = this.playlist._player._html5player._volume;
  // evade bc's auto-reset & ensure correct track gets played
  this._nextTrack = false;                  
  this.handlerNextTrack = function() { return this.next() }.bind(this);

  this.$trackPlayWaypoint = bcplayer._waypoints[0];
  // set initial volume
  this.playlist._player.setvol(0.7);
  
  if (this.$trackPlayWaypoint) {
    this.$el = this.injectHtml();
    this.$position = this.$el.querySelector('#track_play_waypoints_controls_position');
    this.$duration = this.$el.querySelector('#track_play_waypoints_controls_duration');
    this.$volume = this.$el.querySelector('#volume-value');
    this.observe();
    console.debug('[bandcampFeedPlaylist] injected');
  }
} // FeedPlaylist()

export function initFeedPlaylist(FeedPlaylist) {
  // Observe changes
  FeedPlaylist.prototype.observe = function(e) {
    const self = this;
    const observers = [
      { obj: this.playlist, prop: '_track' },
      { obj: this.playlist, prop: '_state', callback: this.onStateUpdate.bind(this) },
      { obj: this.playlist, prop: '_duration', callback: this.updateDuration.bind(this) },
      { obj: this.playlist, prop: '_position', callback: this.updatePosition.bind(this) },
      { obj: this.playlist._player._html5player, prop: '_volume', callback:this.updateVolume.bind(this) }
    ];

    observers.map(observer => {
      Object.defineProperty(observer.obj, observer.prop, {
        get: function() { return self[observer.prop]; },
        set: function(newValue) {
          if (newValue === self[observer.prop]) return; 
          self[observer.prop] = newValue;
          if (typeof observer.callback == 'function') {
              return observer.callback(newValue);
          }
          return newValue;
        }
      });
    });
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

  FeedPlaylist.prototype.vol_down = function(e) {
    if (e) e.preventDefault();
    if (this._volume === 0) {
      return;
    } else {
      return this.playlist._player.setvol(this._volume - 0.1);
    }
  }

  FeedPlaylist.prototype.vol_up = function(e) {
    if (e) e.preventDefault();
    if (this._volume === 1) {
      return;
    } else {
      return this.playlist._player.setvol(this._volume + 0.1);
    }
  }

  FeedPlaylist.prototype.onStateUpdate = function(state) {
    console.log("onStateUpdate:", state, "track:", this._track);
    if (state === 'PLAYING') this.updateTitle();
    // on very first play (which will be first state update) set the "now playing / last played" visible permanently
    // if set before first play, appears broken (has no img until something is loaded)
    if (!nowPlaying.classList.contains('stream-activated')) nowPlaying.classList.add('stream-activated');

    if ((state === 'PLAYING' || state === 'PAUSED') 
         && this._nextTrack 
         && +this._track !== this._nextTrack) {
      // problem - if trying to pause the same track that was playing when feed was expanded
      // instead player switches to the first of the new set & starts playing that
      // so on expansion we set _stillPlaying & here we check if the indexes still match
      // & don't force next track yet
      if (this._stillPlaying === +this.playlist._loadedtrack) {
        return;
      } else {
        this._stillPlaying = false;
        console.log('force playing correct track', this._nextTrack);
        this.playlist.play_track(this._nextTrack);
      }
    } else if ((state === 'IDLE' || state === 'PAUSED') && +this._track === this._nextTrack) {
      console.log('force playing correct track (again)', this._nextTrack);
      this.playlist.play_track(this._nextTrack);
    } else if (state === 'PLAYING' && +this._track === this._nextTrack) {
      console.log('Jeez, finally');
      this._nextTrack = false;
    }

    if (state === "COMPLETED") {
      // bc sends an automatic stop about .5 - 1s after track ends, then resets the track, hence the above forcing
      // console shows: Cookie comm channel playlist sending message stop ["stop"]
      // not sure but it might come from _stop_other_players which is potentially for other tabs open w/ bc in them?
      // this ALWAYS happens, so it's safe to always force the next track when one ends and the list is playing through
      // if by momentary chance a user clicks a different track in between the switch, it might break order w/out 
      // resetting _nextTrack to false on click
      // TODO: deal with that later if it seems to be an issue
      this._nextTrack = +this._track + 1;
      console.log('set force track:',+this._nextTrack);
      this.playlist.play_track(+this._track + 1);
    }
    return;
  }; // FeedPlaylist.prototype.onStateUpdate

  FeedPlaylist.prototype.updateTitle = function() {
    // make sure correct track has time to show up first
    setTimeout(() => {
      // console.log('updating tab title');
      const trackTitle = document.querySelector('#track_play_waypoint .waypoint-item-title').textContent,
            trackArtist = document.querySelector('#track_play_waypoint .waypoint-artist-title').textContent;
      window.document.title = `${trackTitle} ${trackArtist} | ${window.originalTitle}`;
    }, 100);
  }

  // DOM
  FeedPlaylist.prototype.updatePosition = function() {
      return this.$position.innerText = window.Time.timeStr(this._position);
  };

  FeedPlaylist.prototype.updateDuration = function() {
      return this.$duration.innerText = window.Time.timeStr(this._duration);
  };

  FeedPlaylist.prototype.updateVolume = function() {
    let vol = Math.round(this.playlist._player._html5player._volume * 100);
    return this.$volume.innerText = `Volume: ${vol}%`;
  };

  FeedPlaylist.prototype.injectHtml = function() {
    const container = document.createElement('div'),
          wayContainer = document.createElement('div'),
          posContainer = document.createElement('div'),
          volContainer = document.createElement('div');
    container.id = 'player-controls-container';
    wayContainer.id = "track_play_waypoint_controls";
    wayContainer.classList.add('player-controls');
    posContainer.id = 'position-container';
    volContainer.id = 'volume-container';
    volContainer.classList.add('player-controls');

    const infos = [
        { text: "0:00", id: "track_play_waypoints_controls_position" },
        { text: "/" },
        { text: "0:00", id: "track_play_waypoints_controls_duration" },
        { text: `Volume: ${Math.round(this.playlist._player._html5player._volume * 100)}%`, id: "volume-value", vol: true }
    ];
    const controls = [
        { text: 'Previous', action: this.previous.bind(this) },
        { text: 'Play/Pause', action: this.playpause.bind(this) },
        { text: 'Next', action: this.next.bind(this) },
        { text: 'Decrease', action: this.vol_down.bind(this), vol: true },
        { text: '/', noaction: true, vol: true },
        { text: 'Increase', action: this.vol_up.bind(this), vol: true }
    ];

    infos.map(info => {
      let element = document.createElement('span');
      if (info.id) {
          element.id = info.id;
      }
      element.innerText = info.text;
      if (info.vol) {
        volContainer.appendChild(element);
      } else {
        posContainer.appendChild(element);
      }
    });

    wayContainer.appendChild(posContainer);

    controls.map(control => {
      let element;
      if (control.noaction) {
        element = document.createElement('span');
      } else {
        element = document.createElement('a');
        element.href = "#";
        element.innerText = control.text;
        element.addEventListener('click', control.action)
      }        
      if (control.vol) {
        volContainer.appendChild(element);
      } else {
        wayContainer.appendChild(element);
      }
    });

    container.appendChild(wayContainer);
    container.appendChild(volContainer);

    return this.$trackPlayWaypoint.parentElement.appendChild(container);
  } // ...injectHtml()
}

/**
 * Pulls track ids for feed or release playlist from the DOM elements' data-trackid attribute
 * @param {string} list - 'feed' or 'release' 
 * @returns {array} array of id strings - even though they are typically digits, attributes store strings
 *  and it is not known if they will always consist of numbers 
 */ 
function get_track_ids(list) {
  console.log(`getting track ids for ${list} list`);
  let list_selector = list === 'feed' ? '#story-list .track_play_hilite' : '#new-releases-vm .collection-grid > li',
      dom_items = document.querySelectorAll(list_selector),
      track_ids = [];

  dom_items.forEach((item) => {
    let id = item.getAttribute('data-trackid');
    id ? track_ids.push(id) : console.log('got a story with no track');
  });
  return track_ids;
}

export function setPrice(id) {
  let price = {};
  for (let i = 0; i < pagedata.track_list.length; i++) {
    if (pagedata.track_list[i].id == id) {
      // console.log(i, pagedata.track_list[i]);
      price.unit = pagedata.track_list[i].currency === 'USD' ? '$' : 
                   pagedata.track_list[i].currency === 'EUR' ? '€' :
                   pagedata.track_list[i].currency === 'GBP' ? '£' :
                   pagedata.track_list[i].currency;
      price.cost = pagedata.track_list[i].price === null ? '?' : 
                   pagedata.track_list[i].price === 0 ? '0+' : 
                   pagedata.track_list[i].price.toString();
      break;
    }
  }
  price = Object.entries(price).length > 0 ? price.unit + price.cost : '';
  let numEls = document.querySelectorAll(`.collection-item-container[data-trackid="${id}"]`).length,
      numPrices = document.querySelectorAll(`.collection-item-container[data-trackid="${id}"] .price-display`).length,
      alreadyShown = numEls === numPrices;

  if (!alreadyShown) {
    let el = document.querySelectorAll(`.collection-item-container[data-trackid="${id}"] li.buy-now`),
        display = document.createElement('span');
    display.classList.add('price-display');
    display.innerText = price;
    if (el) {
      for (let i = numPrices; i < el.length; i++) {
        let clone = display.cloneNode(true);
        el[i].appendChild(clone);
      }      
    }
  }
} // setPrice()

/**
 * Handles tracks added to the feed while the release list is playing
 */
function copyScrollAddedTracks() {
  /* New feed tracks get appended to the currently playing playlist by default.
     This doesn't affect the canonical release playlist since it is stored in releasePlaylist
     after sorting on page load and can't be expanded past 40 tracks.
     However if multiple feed expansions happen while release list is playing, need to keep track
     of the total and then reset upon switching back to feed so releasePlaylistLength will always be the 
     starting index of the new tracks */
  // console.log(`release playlist length start: ${releasePlaylistLength} & end: ${bcplayer._playlist.length()}`);
  if (bcplayer._playlist.length() > releasePlaylistLength) {
    const added_track_count = bcplayer._playlist.length() - releasePlaylistLength;
    console.log(`${added_track_count} tracks added by scrolling`);
    console.log('first new track:', bcplayer._playlist._playlist[releasePlaylistLength].title);
    for (let i = releasePlaylistLength; i < bcplayer._playlist.length(); i++) {
      setPrice(bcplayer._playlist._playlist[i].id);
      bcplayer.feed_playlist.push(bcplayer._playlist._playlist[i]);
    }
    releasePlaylistLength += added_track_count;
    bcplayer.feed_playlist_length = bcplayer.feed_playlist.length;
    console.log('new feed playlist length', bcplayer.feed_playlist_length);
  } 
}

/**
 * Iterate each playable fan activity story then directly place the corresponding track in the correct index
 * of the new playlist & set both tracknum attributes to match. 
 * Note: if tracks appear multiple times after scroll-adding (because various people bought something or 
 * someone bought it plus it appears as an artist-released story), BC by default doesn't add them to playlist 
 * again. This wrecks the functionality of play/pause buttons by throwing the playlist out of sync in addition 
 * to not being true to the feed. Therefore here tracks will be repeated as many times as they actually show up 
 * as a visual item.
 */
export function rebuild_feed_playlist({starting_index=0} = {}) {
  console.log('rebuilding feed playlist');
  const on_feed = currentList === 'feed';
  if (!on_feed) copyScrollAddedTracks();

  const feed_stories     = document.querySelectorAll('#story-list .track_play_auxiliary'),
        // cache feed_playlist if on feed so we don't accidentally replace any tracks that might be needed
        feed_playlist    = !on_feed ? bcplayer.feed_playlist : bcplayer._playlist._playlist.slice(),
        rebuilt_playlist = !on_feed ? [] : bcplayer._playlist._playlist,
        current_tracknum = on_feed && bcplayer.currently_playing_track() ? 
                           bcplayer.currently_playing_track().tracknum : 
                           -1;
  let   next_index       = starting_index;

  // finds any tracks that may be hiding in the release playlist
  verify_has_playlist_track(feed_stories);
  console.log('starting rebuild at', next_index);

  /*
    If feed is currently playing, can't do a hot swap of the playlist without breaking things.
    Instead need to adjust it from where the mismatches start
  */

  feed_stories.forEach((story, dom_index) => {
    const track_id = story.getAttribute('data-trackid'),
          tracknum = +story.getAttribute('data-tracknum'),
          story_title = story.parentNode.querySelector('.fav-track-title')?.innerText ||
                        story.parentNode.querySelector('.collection-item-title')?.innerText;

    if (!track_id || dom_index < starting_index) return; 

    // shouldn't ever run into this, but can't alter currently playing track
    if (tracknum === current_tracknum) {
      next_index++;
      return;
    }

    // console.log('looking for', story_title, 'orig tracknum:', tracknum);
    for (let i = 0; i < feed_playlist.length; i++) {
      if (feed_playlist[i]?.id?.toString() === track_id) {
        rebuilt_playlist[next_index] = new Player.TrackInfo(JSON.parse(JSON.stringify(feed_playlist[i])));
        rebuilt_playlist[next_index].tracknum = next_index;
        story.setAttribute('data-tracknum', next_index);
        if (i !== next_index) console.log(`found ${feed_playlist[i].title} @ feed_playlist index ${i} (set to ${next_index})`);
        next_index++;
        break;
      }
    }
  });
  console.log('rebuilt feed playlist:', rebuilt_playlist);
  // if playing feed rebuild_playlist is just a reference to the actual feed playlist
  if (!on_feed) bcplayer.feed_playlist = rebuilt_playlist;
}


/*
  This iterates through every track id associated with a feed DOM story and checks how many times it appears. 
  If it appears more than once, it checks all the matching indexes of the playlist to make sure a copy of 
  the track appears there instead of another track, which would throw the album art & playlist out of sync.
  Note: debug function only as rebuild_feed_playlist more effectively handles duplicates.
*/
export function checkDuplicates() {
  const feed_track_ids = get_track_ids('feed'),
        alreadyCopied = [],
        feed_playlist = currentList === 'release' ? bcplayer.feed_playlist : bcplayer._playlist._playlist;

  for (let i = 0; i < feed_track_ids.length; i++) {
    const instances = countInArray(feed_track_ids, feed_track_ids[i]),
          dupes = [];
    if (instances > 1 && alreadyCopied.indexOf(feed_track_ids[i]) === -1) {
      // find the indexes of the duplicates
      console.log(`found ${instances} copies of ${feed_track_ids[i]}`, feed_playlist[i].title);
      console.log('first instance at index', i);
      for (let d = i + 1; d < feed_track_ids.length; d++) {
        if (feed_track_ids[d] === feed_track_ids[i]) {
          console.log('found dupe at index', d);
          if (feed_playlist[d]?.id?.toString() !== feed_track_ids[i]) {
            console.log('found this track there instead', feed_playlist[d]?.id, feed_playlist[d]?.title);
            dupes.push(d);
          } else {
            console.log(`copy already in place: ${d} ${feed_playlist[d].id} matches ${i} ${feed_playlist[i].id}`);
          }
          console.log('total misplaced dupes', dupes.length);
        }
      }
      if (dupes.length > 0) {
        console.log(`num dupes of ${feed_playlist[i].title} that need splicing into the correct slot:`, dupes.length, 'letting rebuild handle');
      }
      // don't check again with later instances of this id
      alreadyCopied.push(feed_track_ids[i]);
    }
  }
}

/**
 * Finds all DOM item play buttons for both feed & release playlists & attaches a click handler 
 * to the parent album art container (.track_play_auxiliary) which plays or pauses the item, switching 
 * to the appropriate playlist first if needed.
 */
export function bind_play_buttons() {
  const play_buttons = document.querySelectorAll('.play-button');
  console.log(`binding ${play_buttons.length} play buttons`);
  play_buttons.forEach((btn) => {
    btn.closest('.track_play_auxiliary').addEventListener('click', playButtonHandler);
  });
}

/** 
 * Sets the data-tracknum attribute on each feed & release DOM item (.track_play_auxiliary)
 * with the corresponding playlist track index number to ensure the proper track gets played when clicked. 
 * Handles items which do not have playable tracks.
 */
export function set_track_numbers() {
  // copy new tracks first to ensure feed_items is up to date
  if (currentList === 'release') copyScrollAddedTracks();

  const feed_items = document.querySelectorAll('.story-innards .track_play_auxiliary'),
        release_items = document.querySelectorAll('#new-releases-vm .track_play_auxiliary'),
        // tracks not found in either list (bc error?)
        // note this only sends back dead tracks found originally in feed list
        // haven't seen a deadtrack issue for release list
        dead_indexes = verify_has_playlist_track(feed_items);

  console.log('tagging DOM items with corresponding track numbers');
  let skips = 0;
  feed_items.forEach((item, i) => {
    if (dead_indexes.indexOf(i) === -1) {
      item.setAttribute('data-tracknum', i - skips);
    } else {
      skips++;
      console.log(`skipped story ${i} (deadtrack), num skips so far: ${skips}`);
    }
  });

  release_items.forEach((item, i) => item.setAttribute('data-tracknum', i));
}

/**
 * Verifies all items in the fan activity feed have a corresponding track in the feed playlist.
 * Checks in the release & original list (from page load before sorting), & adds to feed as needed.
 * BC doesn't automatically add scroll-added tracks to the feed playlist if they already appear in one of these.
 * @param {NodeList} feed_items - selected with '.story-innards .track_play_auxiliary'
 * @returns {array} array of indexes for which there is no corresponding playable track
 */
function verify_has_playlist_track(feed_items) {
  // console.log('verifying tracks in playlist & checking for dead tracks');

  const dead_indexes = [];
  feed_items.forEach((item, i) => {
    const track_id      = item.getAttribute('data-trackid'),
          feed_playlist = currentList === 'feed' ? 
                          bcplayer._playlist._playlist : 
                          bcplayer.feed_playlist,
          track_index   = get_track_index(feed_playlist, track_id);

    if (track_index === -1) {
      const release_index  = get_track_index(releasePlaylist, track_id),
            original_index = get_track_index(originalPlaylist, track_id),
            track_object   = release_index > -1 ? releasePlaylist[release_index] : 
                             original_index > -1 ? originalPlaylist[original_index] : 
                             false;

      console.log(`${track_id} not found in feed list, should be tracknum ${i}`);
      console.log('found in release?', release_index, 'original?', original_index, track_object);

      if (release_index > -1 || original_index > -1) {
        spliceIntoList(feed_playlist, i, track_object);
      } else {
        dead_indexes.push(i);
      }
    }
  });

  console.log(`found ${dead_indexes.length} dead tracks`);
  return dead_indexes;    
}

/** 
 * Get the playlist index of a track using its ID
 * @param {array} playlist - array of TrackInfo objects
 * @param {string} track_id - eg 262657556, as read from item's data-trackid element (set by Bandcamp)
 * @returns {integer}
 */
function get_track_index(playlist, track_id) {
  for (let i = 0; i < playlist.length; i++) {
    if (playlist[i]?.id?.toString() === track_id) return i;
  }
  return -1;
}

/**
 * Injects a track into the playlist at a specified index
 */
function spliceIntoList(list, index, track) {
  console.log(`injecting ${track.id} (${track.title}) into slot`, index);
  // copy needs to be made into a TrackInfo object
  let copy = JSON.parse(JSON.stringify(track)),
      trackinfo = new Player.TrackInfo(copy);
  list.splice(index, 0, trackinfo);
  list[index].tracknum = index;
  // console.log('spliced track', list[index]);

  // TrackInfo tracknums will be messed up here but fixed during rebuild
  // console.log('new playlist:', list); 
}

/**
 * Handles pausing, unpausing, playing a different track, & switching playlists if needed
 */
function playButtonHandler(e) {
  // console.log('clicked', e.target);
  let isFeed = e.target.closest('.story-innards') !== null,
      trackId = e.target.closest('.track_play_auxiliary').getAttribute('data-trackid'),
      trackNum = e.target.closest('.track_play_auxiliary').getAttribute('data-tracknum'),
      listTarget = isFeed ? 'feed' : 'release';

  switch_lists({switch_to: listTarget});
  const currently_playing_id = bcplayer.currently_playing_track()?.id?.toString();

  console.log('currently playing:', currently_playing_id);
  // if no track has been played but feed playlist expanded & rebuilt, need to load it
  if (!currently_playing_id) {
    console.log('reloading feed playlist');
    bcplayer._playlist.load(bcplayer._playlist._playlist);
  }
  console.log(`about to play ${trackId}, #${trackNum} in playlist`);

  // check if user is pausing a track, unpausing, or playing a new one
  if (bcplayer.currently_playing_track() !== null && 
      bcplayer._playing_state === 'PLAYING' &&
      bcplayer.currently_playing_track().id.toString() === trackId) {
    bcplayer.pausedTrack = trackId;
    console.log('pausing');
    feedPlayer.playpause();
  } else {
    if (bcplayer.pausedTrack === trackId) {
      console.log("unpausing", trackId);
      feedPlayer.playpause();
    } else {      
      console.log('found track, playing now', +trackNum, bcplayer._playlist._playlist[+trackNum].title);
      feedPlayer._nextTrack = false;
      bcplayer._playlist.play_track(+trackNum);
    }
    bcplayer.pausedTrack = '';
  }
}

function switch_lists({switch_to} = {}) {
  if (switch_to === currentList) {
    console.log(`still on ${currentList} playlist`);
    return;
  } else if (switch_to === 'release') {
    // save the current feed playlist (it's possible new tracks were added by scrolling)
    bcplayer.feed_playlist = bcplayer._playlist._playlist.slice();
    // .load calls .unload, which kills the whole playlist before adding anything      
    bcplayer._playlist.load(releasePlaylist);
    // note: if release playlist ends, any scroll-added tracks will play automatically
    // (they are appended dynamically to the list)
    currentList = 'release';
  } else {
    // switching from release to feed - any playlist expansion has already been dealt with
    bcplayer._playlist.load(bcplayer.feed_playlist);
    currentList = 'feed';
    // reset to the original length in case tracks were added
    releasePlaylistLength = releasePlaylist.length;
  }
  console.log(`switched list to ${switch_to}`, bcplayer._playlist._playlist);
}

/** 
 * Checks every track in the playlist and ensures the order matches the feed item order. 
 * If it doesn't, triggers a playlist rebuild.
 * @param {array} feed_playlist
 */
export function validate_feed_integrity(feed_playlist) {
  // console.log('pre-validation playlist', feed_playlist.slice()); // sliced so logging later won't update this log
  if (!feed_playlist) {
    console.log("can't validate empty feed playlist"); 
    return;
  }
  const feed_items = document.querySelectorAll('.story-innards .track_play_auxiliary');
  let   num_mismatched = 0,
        starting_index = 0;

  feed_items.forEach((item, i) => {
    const track = feed_playlist[i],
          story_track = {
            id: item.getAttribute('data-trackid'),
            tracknum: +item.getAttribute('data-tracknum'),
            title: item.parentNode.querySelector('.fav-track-title')?.innerText ||     // albums
                   item.parentNode.querySelector('.collection-item-title')?.innerText  // individual tracks
          }; 
    if (track?.id?.toString() !== story_track.id || track?.tracknum !== story_track.tracknum) {
      // story_track.title is just for debugging - can't be used as a condition since 
      // it might be stored in arbitrary elements depending on story type
      if (num_mismatched === 0) {
        console.log('dupes causing mismatches');
        console.log('playlist track id:', track.id.toString(), 'feed item track id', story_track.id);
        console.log('playlist tracknum:', track.tracknum, 'feed item tracknum', story_track.tracknum);
        console.log(`feed item ${i} (${story_track.title}) is mismatched with ${track.title}`);
        // this is where we start rebuilding the feed playlist, to save processing power
        starting_index = i;
      }
      num_mismatched++;
    }
  });

  console.log('num feed items', feed_items.length);
  console.log('num tracks in playlist', feed_playlist.length);
  console.log('total mismatched:', num_mismatched);
  if (num_mismatched > 0) rebuild_feed_playlist({starting_index});
}
