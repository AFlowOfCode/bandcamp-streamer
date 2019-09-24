(function(window, document) {

  const bcplayer = window.playerview,
        colplayer = window.collectionPlayer,
        jQuery = window.jQuery;

  if (!bcplayer) {
    // console.log('not on feed page');
    // do wishlist next
    loadCollection();
    // return null;
  }

  // list all access keys & track titles in console
  // for (key in collectionPlayer.tracklists.collection) {console.log(`${key}: ${collectionPlayer.tracklists.collection[key][0].trackTitle}`);}

  function loadCollection() {
    // need to modify some of the player's functions
    replaceFunctions();
    let isOwner = document.getElementById('fan-banner').classList.contains('owner'),
        items = document.querySelectorAll('#collection-items .track_play_hilite'),
        collectionPlaylist = [],
        albumPlaylist = [],
        queueTitles = [],
        albumQueueTitles = [];

    for (let i = 0; i < items.length; i++) {
      
      let id = items[i].getAttribute('data-itemid'),
          domId = items[i].id,
          // this contains the sequential keys of every item available
          key = window.CollectionData.sequence[i],
          track;

      // check for a favorite track
      if (isOwner) {
        let node = document.querySelector(`#${domId} .fav-track-link`);
        if (node) {
          console.log('found fave track');
          track = colplayer.tracklists.collection[key][+node.href.slice(node.href.indexOf('?t=') + 3) - 1];
        } else {
          track = colplayer.tracklists.collection[key][0];
        } 
      } else {
        track = colplayer.tracklists.collection[key][0];
      }

      // build collection playlist
      if (track) {        
        console.log(`pushing ${track.trackData.artist} - ${track.trackData.title}`);
        track.itemId = id;
        track.domId = domId;
        collectionPlaylist.push(track);
        queueTitles.push(`${track.trackData.artist} - ${track.trackData.title}`);
        items[i].setAttribute('data-tracknum', i);
      }
      // build album playlist 
      if (isOwner) {
        let album = colplayer.tracklists.collection[key];
        items[i].setAttribute('data-firsttrack', albumPlaylist.length);
        if (album.length >= 1) {
          album.forEach(function(t,index){
            t.itemId = id;
            albumPlaylist.push(t);
            albumQueueTitles.push(`${t.trackData.artist} - ${t.trackData.title}`);
          });
        }
        console.log(`pushed album ${album[0].title} by ${album[0].trackData.artist}, playlist length now ${albumPlaylist.length}`);
      }
    }
    if (isOwner) {
      colplayer.player2.setTracklist(albumPlaylist);
      colplayer.currentPlaylist = 'albums';
      // these have to be available for playlistSwitcher
      colplayer.collectionPlaylist = collectionPlaylist;
      colplayer.albumPlaylist = albumPlaylist;
      colplayer.queueTitles = queueTitles;
      colplayer.albumQueueTitles = albumQueueTitles;
      playlistSwitcher(true); 
      fixQueueTitles(albumQueueTitles);
    } else {
      colplayer.currentPlaylist = 'favorites';
      colplayer.player2.setTracklist(collectionPlaylist);      
      fixQueueTitles(queueTitles);
    }
    colplayer.currentItemEl(jQuery(items[0]));
    // this gets the transport to show up on page load
    colplayer.player2._playlist.play(); 
    colplayer.player2._playlist.playpause(); 
    
    colplayer.transPlay = document.querySelector('#collection-player .playpause .play');
    colplayer.transPause = document.querySelector('#collection-player .playpause .pause');
    
    replaceClickHandlers();
  }

  function playlistSwitcher(init) {
    // make sure list starts unshuffled
    if (colplayer.isShuffled) colplayer.shuffle(); 
    let queueHeader = document.querySelector('.queue-header h2');
    if (init) {
      let switcher = document.createElement('a'),
          parent = document.querySelector('#collection-player .controls-extra'),
          header = '<span id="playlist-header" style="font-weight:600;">albums</span>',
          shuffle = '<span id="shuffler" style="margin-left:10px; font-size:0.7em; cursor: pointer;">(shuffle!)</span>';
      switcher.href = '#';
      switcher.setAttribute('onclick','return false;');
      switcher.id = 'playlist-switcher';
      switcher.style.marginRight = '10px';
      switcher.innerText = 'Switch to favorite tracks';
      parent.prepend(switcher);
      switcher.addEventListener('click', () => playlistSwitcher());
      queueHeader.innerHTML = `now playing ${header} ${shuffle}`;
      document.getElementById('shuffler').addEventListener('click', () => colplayer.shuffle());
    } else {
      let switcher = document.getElementById('playlist-switcher'),
          header = document.getElementById('playlist-header');
      if (colplayer.currentPlaylist === 'albums') {
        colplayer.player2.setTracklist(colplayer.collectionPlaylist);
        fixQueueTitles(colplayer.queueTitles);
        colplayer.currentPlaylist = 'favorites';
        header.innerText = 'favorite tracks';
        switcher.innerText = 'Switch to full albums';  
      } else {
        colplayer.player2.setTracklist(colplayer.albumPlaylist);
        fixQueueTitles(colplayer.albumQueueTitles);
        colplayer.currentPlaylist = 'albums';
        header.innerText = 'albums';
        switcher.innerText = 'Switch to favorite tracks';
      }
    }
  }

  function fixQueueTitles(titles){
    let queue = document.querySelectorAll('.queue li > .info');
    queue.forEach(function(item, index){
      item.innerHTML = `${index+1}. ${titles[index]}`;
    });
  }

  colplayer.shuffle = function () {
    colplayer.player2.stop();
    if (!colplayer.isShuffled) {
      let a = colplayer.currentPlaylist === 'albums' ? colplayer.albumPlaylist.slice() : colplayer.collectionPlaylist.slice(),
          shufQueue = [],
          el = document.getElementById('shuffler');
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      a.forEach(function(track,i){
        shufQueue.push(`${track.trackData.artist} - ${track.trackData.title}`);
      })
      colplayer.isShuffled = true;
      el.innerText = '(unshuffle!)';
      colplayer.player2.setTracklist(a);
      let firstTrackEl;
      // allow clicking on item to play appropriate track from shuffle list 
      if (colplayer.currentPlaylist === 'favorites') {
        a.forEach(function(track, i){
          let id = track.itemId,
              el = document.getElementById(track.domId);
          el.setAttribute('data-shufflenum', i);
          if (i === 0) {
            firstTrackEl = el;
          }
        });
      }
      fixQueueTitles(shufQueue);
      colplayer.currentItemEl(jQuery(firstTrackEl));
    } else {
      let unshuffled = colplayer.currentPlaylist === 'albums' ? colplayer.albumPlaylist : colplayer.collectionPlaylist,
          regQueue = colplayer.currentPlaylist === 'albums' ? colplayer.albumQueueTitles : colplayer.queueTitles,
          el = document.getElementById('shuffler');
      colplayer.player2.setTracklist(unshuffled);
      fixQueueTitles(regQueue);
      colplayer.currentItemEl(jQuery(document.getElementById(unshuffled[0].domId)));
      colplayer.isShuffled = false;
      el.innerText = '(shuffle!)';      
    }
  }

  function replaceFunctions(){
    let self = colplayer.player2;
    self.setCurrentTrack = function(index) {
      console.log("index to set", index);
      self.currentTrackIndex(index);
      let newTrack = self.currentTrack();
      if (!newTrack) return;
      let id = newTrack.itemId,
          el = document.getElementById(newTrack.domId);
      console.log(newTrack, el);
      togglePlayButtons(colplayer.lastEl, true);
      togglePlayButtons(el);
      colplayer.lastEl = el;
      self._playlist.load([newTrack.trackData]);
      self.duration(self._playlist.duration());
      colplayer.currentItemEl(jQuery(el));
      return true;
    };
    // have to redo these because currentTrackIndex returns a STRING and orig code just tacked a 1 onto it
    // eg going from index 2 ended up with 21 instead of 3
    self.prev = function() {
        if (!self.hasPrev())
            return false;
        return self.goToTrack(+self.currentTrackIndex() - 1)
    };
    self.next = function() {
        if (!self.hasNext())
            return false;
        return self.goToTrack(+self.currentTrackIndex() + 1)
    };
  }

  function replaceClickHandlers(){
    let players = document.getElementsByClassName('track_play_auxiliary');
    Array.from(players).forEach(function(player,i){
      player.addEventListener('click', playerHandler);
    });
  }

  function playerHandler(ev) {
    ev.stopPropagation();
    let item = ev.target.closest(".collection-item-container"),
        grid = ev.target.closest(".collection-grid"),
        gridType = grid.getAttribute('data-ismain') === 'true' ? 'collection' :
                   grid.getAttribute('data-iswish') === 'true' ? 'wish' :
                   grid.getAttribute('data-isgiftsgiven') === 'true' ? 'gifts_given' :
                   'hidden',
        tracknum = colplayer.isShuffled ? item.getAttribute('data-shufflenum') :
                   colplayer.currentPlaylist === 'favorites' ? item.getAttribute('data-tracknum') : 
                   item.getAttribute('data-firsttrack'),          
        tralbumId = item.getAttribute("data-tralbumid"),
        tralbumType = item.getAttribute("data-tralbumtype"),
        itemId = item.getAttribute("data-itemid"),
        itemType = item.getAttribute("data-itemtype").slice(0, 1),
        itemKey = itemType + itemId;

    if (item.classList.contains("no-streaming")) 
      return;
    if (itemKey === colplayer.currentItemKey()) {
      // pausing / unpausing
      togglePlayButtons(item);
      // these just return true if they already ARE showing
      // colplayer.player2.showPlay();
      // colplayer.player2.showPause();
      colplayer.player2.playPause();
      return;
    }
    colplayer.player2.stop();
    colplayer.currentItemEl(jQuery(item)); // this needs to be a jquery object ... :O 
    console.log(item);
    window.itemtest = item;
    colplayer.player2.showPlay();      
    colplayer.currentItemKey(itemKey);
    colplayer.currentGridType(gridType);
    colplayer.player2.goToTrack(tracknum);
  }

  // Handle playing elements
  function togglePlayButtons(item, offonly) {
    // Todo: when you click a track on playlist, it should jump to the row which has that album
    // if playing a new track, turn off prev button first
    if(!item) return;
    if (!item.classList.contains('playing')) {
      let prev = document.querySelector('.collection-item-container.playing')
      if (prev) prev.classList.remove('playing');
    }

    item.classList.toggle('playing');

    // if track is playing make sure transport shows pause
    if (item.classList.contains('playing')) {
      colplayer.transPause.style.display = 'inline-block';
      colplayer.transPlay.style.display = 'none';
    } else if (!offonly) {
      colplayer.transPause.style.display = 'none';
      colplayer.transPlay.style.display = 'inline-block';
    }
  }

  // user/feed

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
          // console.log(track);
      } 
    }
    return trackCollection;
  }

  // determine which list/track was clicked & switch playlists as needed
  function bindPlayButtons() {
    let playButtons = document.getElementsByClassName('play-button');
    for (let i = 0; i < playButtons.length; i++) {
      playButtons[i].closest('.track_play_auxiliary').addEventListener('click', playButtonHandler);
    } 
    setTrackNumbers();
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
      newFeedPlaylist.playpause();
    } else {
      console.log('found track, playing now');
      if (pausedTrack === trackId) {
        console.log("unpausing");
        newFeedPlaylist.playpause();
        pausedTrack = '';
      } else {                  
        bcplayer._playlist.play_track(trackNum);
      }
    }
  }

  // need track numbers on the elements to ensure proper track gets played
  function setTrackNumbers() {
    let feedTracks = document.querySelectorAll('.story-innards .track_play_auxiliary');
    let releaseTracks = document.querySelectorAll('#new-releases-vm .track_play_auxiliary');
    for (let i = 0; i < feedTracks.length; i++) {
      feedTracks[i].setAttribute('data-tracknum', i);
    }
    for (let j = 0; j < releaseTracks.length; j++) {
      releaseTracks[j].setAttribute('data-tracknum', j);
    }
    verifyInPlaylist(feedTracks);
  }

  // because bandcamp doesn't add scroll-added tracks to the playlist
  // if they already appear in the release playlist
  function verifyInPlaylist(feedTracks) {
    if (currentList === 'release') {
      // need to copy over any scroll-added tracks first
      copyScrollAddedTracks();
    }
    for (let i = 0; i < feedTracks.length; i++) {
      let trackId = feedTracks[i].getAttribute('data-trackid'),
          playlist = currentList === 'feed' ? playerview._playlist._playlist : feedPlaylist,
          trackFound = findInPlaylist(playlist, trackId);

      if (trackFound !== 0 && !trackFound) {
        console.log(`${trackId} not found in feed list, should be tracknum ${i}`);
        let releaseIndex = findInPlaylist(releasePlaylist, trackId),
            trackObject = releasePlaylist[releaseIndex];
        spliceIntoList(playlist, i, trackObject);
      }
    }      
  }

  function findInPlaylist(list, track) {
    for (let i = 0; i < list.length; i++) {
      if (list[i].id.toString() === track) {
        // beware this returns zero
        return i;
      }
    }
    return false;
  }

  function switchLists(list) {
    if (list === currentList) {
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

  function copyScrollAddedTracks() {
    console.log(`release playlist length start: ${releasePlaylistLength} & end: ${bcplayer._playlist.length()}`);
    if (bcplayer._playlist.length() > releasePlaylistLength) {
      console.log(`${bcplayer._playlist.length() - releasePlaylistLength} tracks added by scrolling`);
      for (let i = releasePlaylistLength; i < bcplayer._playlist.length(); i++) {
        feedPlaylist.push(bcplayer._playlist._playlist[i]);
      }
    } 
    // check if tracks appear multiple times after scroll-adding
    // bandcamp won't add them to playlist for some reason
    // it wrecks the order & functionality of buttons in addition to not being true to the feed
    checkDuplicates();
  }

  function checkDuplicates() {
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
            dupes.push(d);
          }
        }
        // splice copies of the tracks into the playlist
        console.log(`making ${instances - 1} copies of ${feedTracks[i]}`);
        for (let s = 0; s < dupes.length; s++) {
          if (currentList === 'release') {
            spliceIntoList(feedPlaylist, dupes[s], feedPlaylist[i]);
          } else {
            spliceIntoList(bcplayer._playlist._playlist, dupes[s], bcplayer._playlist._playlist[i]);    
          }
        }
        alreadyCopied.push(feedTracks[i]);
      }
    }
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

  function FeedPlaylist() {
      

      // build playlists
      let feedTracks = getTrackIds('feed'),
          releaseTracks = getTrackIds('releases'),
          originalPlaylist = bcplayer._playlist._playlist,
          addedToFeed = [],
          feedDuplicates = {};

      // going to replace default playlist with filtered playlist
      bcplayer._playlist.unload();

      // sort all tracks into appropriate playlists because
      // if track shows up in both feed and new release, it messes up the order of the original playlist
      // by default, after 7 or 8 tracks it jumps to new releases 
      // since they did not intend this to play through automatically
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
      // 10 feed stories loaded by default, but could change on whims of bandcamp
      // reference this to determine when tracks are added by scrolling
      feedPlaylistLength = bcplayer._playlist.length();
      // reference this in case any tracks added via scrolling while release list is playing
      releasePlaylistLength = releasePlaylist.length;
      
      // this needs to be done every time new tracks are loaded at bottom 
      // or won't be able to click on newly added tracks (they'd still work via the player prev/next buttons)
      bindPlayButtons();        
      let storyList = document.getElementById('story-list'),
          options = {
            childList: true
          },
          observer = new MutationObserver((mutations) => {
            // not all stories are playable tracks
            let numTracks = document.querySelectorAll('.story-innards .track_play_auxiliary').length;
            if (numTracks > feedPlaylistLength) {
              console.log(`there are now ${numTracks} playable tracks in feed`);
              bindPlayButtons();
              if (currentList === 'feed') {
                checkDuplicates();
              }
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

  // Utilities
  function countInArray(array, value) {
    return array.reduce((n, x) => n + (x === value), 0);
  }

  console.debug('[bandcampFeedPlaylist] loaded');
  if (bcplayer) {
    let newFeedPlaylist = new FeedPlaylist();   
  }
})(window, document);