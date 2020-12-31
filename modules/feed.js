import { countInArray, observeTotal } from './shared.js';

export function FeedPlaylist(bcplayer, originalPlaylist) {
    
  // build playlists
  let feedTracks = getTrackIds('feed'),
      releaseTracks = getTrackIds('releases'),
      addedToFeed = [],
      feedDuplicates = {};

  console.log('feed track ids:', feedTracks);
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
    console.log(`index ${i} origId ${origId}`);
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
      if (addedToFeed.indexOf(originalPlaylist[i].id) == -1 || (dupes && timesAdded < timesInArray)) {
        // sometimes tracks in the beginning of the playlist are not on the page yet
        // make sure the tracknum matches index num 
        originalPlaylist[i].tracknum = bcplayer._playlist._playlist.length;
        setPrice(originalPlaylist[i].id);
        bcplayer._playlist._playlist.push(originalPlaylist[i]);
        addedToFeed.push(originalPlaylist[i].id);
        console.log(`feed: added ${originalPlaylist[i].title}, tracknum ${originalPlaylist[i].tracknum} to slot ${bcplayer._playlist._playlist.length - 1}`);
        if (dupes) {
          feedDuplicates[origId].timesAdded++;
        }
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
    console.log(`release: added ${track.title}, tracknum ${track.tracknum} to slot ${index}`);
    setPrice(track.id);
  }
  // 10 feed stories loaded by default, but could change on whims of bandcamp
  // reference this to determine when tracks are added by scrolling
  feedPlaylistLength = bcplayer._playlist.length();
  console.log(`Feed has ${feedPlaylistLength} tracks to start with`);
  console.log('initial feed playlist:',bcplayer._playlist._playlist);
  // reference this in case any tracks added via scrolling while release list is playing
  releasePlaylistLength = releasePlaylist.length;
  console.log('initial release playlist:', releasePlaylist, releasePlaylistLength);

  // this needs to be done every time new tracks are loaded at bottom 
  // or won't be able to click on newly added tracks (they'd still work via the player prev/next buttons)
  bindPlayButtons();      
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
    this.updateTitle();
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
    const trackTitle = document.querySelector('#track_play_waypoint .waypoint-item-title').textContent,
          trackArtist = document.querySelector('#track_play_waypoint .waypoint-artist-title').textContent;
    window.document.title = window.originalTitle + ` | ${trackTitle} ${trackArtist}`;
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
    } else {
      console.log('got a story with no track');
    }
  }
  return trackCollection;
}

export function setPrice(id) {
  let price = {};
      // pagedata = window.pagedata;
  for (let i = 0; i < pagedata.track_list.length; i++) {
    if (pagedata.track_list[i].id == id) {
      console.log(i, pagedata.track_list[i]);
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

function copyScrollAddedTracks() {
  console.log(`release playlist length start: ${releasePlaylistLength} & end: ${bcplayer._playlist.length()}`);
  if (bcplayer._playlist.length() > releasePlaylistLength) {
    console.log(`${bcplayer._playlist.length() - releasePlaylistLength} tracks added by scrolling`);
    for (let i = releasePlaylistLength; i < bcplayer._playlist.length(); i++) {
      setPrice(bcplayer._playlist._playlist[i].id);
      feedPlaylist.push(bcplayer._playlist._playlist[i]);
    }
  } 
  // check if tracks appear multiple times after scroll-adding
  // bandcamp won't add them to playlist for some reason
  // it wrecks the order & functionality of buttons in addition to not being true to the feed
  checkDuplicates();
}

export function checkDuplicates() {
  let feedTracks = getTrackIds('feed');
  let alreadyCopied = [];
  for (let i = 0; i < feedTracks.length; i++) {
    let instances = countInArray(feedTracks, feedTracks[i]);
    if (instances > 1 && alreadyCopied.indexOf(feedTracks[i]) == -1) {
      // find the indexes of the duplicates
      console.log('first instance of dupe at index',i);
      let dupes = [];
      for (let d = i + 1; d < feedTracks.length; d++) {
        if (feedTracks[d] === feedTracks[i]) {
          console.log('found dupe at index', d);
          let listToCheck = currentList === 'release' ? feedPlaylist : bcplayer._playlist._playlist;
          if (listToCheck[d].id != feedTracks[i]) {
            console.log('found this track there instead', listToCheck[d]);
            dupes.push(d);
          }
        }
      }
      // splice copies of the tracks into the playlist
      if (dupes.length > 0) {
        console.log(`making ${dupes.length} copies of ${feedTracks[i]}`);
        for (let s = 0; s < dupes.length; s++) {
          if (currentList === 'release') {
            spliceIntoList(feedPlaylist, dupes[s], feedPlaylist[i]);
          } else {
            spliceIntoList(bcplayer._playlist._playlist, dupes[s], bcplayer._playlist._playlist[i]);    
          }
        }
      }
      // don't check again with later instances of this id
      alreadyCopied.push(feedTracks[i]);
    }
  }
}

function switchLists(list) {
  if (list === currentList) {
    console.log(`still on same playlist`);
    return;
  } else if (list === 'release') {
    // save the current feed playlist (it's possible new tracks were added by scrolling)
    feedPlaylist = bcplayer._playlist._playlist;
    // .load calls .unload, which kills the whole playlist before adding anything      
    bcplayer._playlist.load(releasePlaylist);
    // note: if release playlist ends, any scroll-added tracks will play automatically
    // (they are appended dynamically to the list)
    currentList = 'release';
  } else {
    copyScrollAddedTracks();
    bcplayer._playlist.load(feedPlaylist);
    currentList = 'feed';
  }
  console.log(`switched list to ${list}`, bcplayer._playlist._playlist);
}

// determine which list/track was clicked & switch playlists as needed
export function bindPlayButtons() {
  let playButtons = document.getElementsByClassName('play-button');
  for (let i = 0; i < playButtons.length; i++) {
    playButtons[i].closest('.track_play_auxiliary').addEventListener('click', playButtonHandler);
  } 
  setTrackNumbers();
}

// because bandcamp doesn't add scroll-added tracks to the playlist
// if they already appear in the release playlist
function verifyInPlaylist(feedTracks) {
  if (currentList === 'release') {
    // need to copy over any scroll-added tracks first
    copyScrollAddedTracks();
  }
  let deadTracks = [];
  for (let i = 0; i < feedTracks.length; i++) {
    let trackId = feedTracks[i].getAttribute('data-trackid'),
        playlist = currentList === 'feed' ? playerview._playlist._playlist : feedPlaylist,
        trackFound = findInPlaylist(playlist, trackId);

    if (trackFound !== 0 && !trackFound) {
      console.log(`${trackId} not found in feed list, should be tracknum ${i}`);
      let releaseIndex = findInPlaylist(releasePlaylist, trackId),
          originalIndex = findInPlaylist(originalPlaylist, trackId),
          trackObject = releaseIndex ? releasePlaylist[releaseIndex] : originalIndex ? originalPlaylist[originalIndex] : false;
      console.log('found in release?', releaseIndex, 'original?', originalIndex, trackObject);
      if (releaseIndex || originalIndex) {
        spliceIntoList(playlist, i, trackObject);
      } else {
        deadTracks.push(i);
      }
    }
  }      
  return deadTracks;
}

// need track numbers on the elements to ensure proper track gets played
function setTrackNumbers() {
  let feedTracks = document.querySelectorAll('.story-innards .track_play_auxiliary'),
      releaseTracks = document.querySelectorAll('#new-releases-vm .track_play_auxiliary'),
      // tracks not found in either list (bc error?)
      // note this only sends back dead tracks found originally in feed list
      // haven't seen a deadtrack issue for release list
      deadTracks = verifyInPlaylist(feedTracks),
      skips = 0;

  for (let i = 0; i < feedTracks.length; i++) {
    if (deadTracks.indexOf(i) === -1) {
      feedTracks[i].setAttribute('data-tracknum', i - skips);
    } else {
      skips++;
      console.log(`skipped story ${i} (deadtrack), num skips: ${skips}`);
    }
  }
  for (let j = 0; j < releaseTracks.length; j++) {
    releaseTracks[j].setAttribute('data-tracknum', j);
  }
}

function findInPlaylist(list, track) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id && list[i].id.toString() === track) {
      // beware this returns zero
      return i;
    }
  }
  return false;
}

function spliceIntoList(list, index, track) {
  // copy needs to be made into a TrackInfo object
  let copy = { ...track },
      trackinfo = new Player.TrackInfo(copy);
  list.splice(index, 0, trackinfo);
  list[index].tracknum = index;
  console.log('spliced track', list[index]);
  // now have to adjust the tracknums on all the following tracks
  for (let i = index + 1; i < list.length; i++) {
    list[i].tracknum++;
  }  
  console.log('new playlist:', list); 
}

function playButtonHandler(e) {
  let isFeed = e.target.closest('.story-innards') !== null,
      trackId = e.target.closest('.track_play_auxiliary').getAttribute('data-trackid'),
      trackNum = e.target.closest('.track_play_auxiliary').getAttribute('data-tracknum'),
      listTarget = isFeed ? 'feed' : 'release';
  
  switchLists(listTarget);
  let playlistLength = bcplayer._playlist.length();

  console.log(`about to play ${trackId}, #${trackNum} in playlist`);

  // check if user is pausing a track, unpausing, or playing a new one
  if (bcplayer.currently_playing_track() !== null && 
      bcplayer._playing_state === 'PLAYING' &&
      bcplayer.currently_playing_track().id.toString() === trackId) {
    pausedTrack = trackId;
    console.log('pausing');
    feedPlayer.playpause();
  } else {
    if (pausedTrack === trackId) {
      console.log("unpausing", trackId);
      feedPlayer.playpause();
      pausedTrack = '';
    } else {      
      console.log('found track, playing now', +trackNum);
      feedPlayer._nextTrack = false;
      bcplayer._playlist.play_track(trackNum);
    }
  }
}