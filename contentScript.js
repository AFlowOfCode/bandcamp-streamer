(function(window, document) {

  const bcplayer = window.playerview,
        colplayer = window.collectionPlayer,
        jQuery = window.jQuery,
        pagedata = jQuery("#pagedata").data("blob");

  // some useful functions
  // colplayer.player2.currentTrackIndex();
  // colplayer.player2.currentTracklist();
  // list all access keys & track titles in console
  // for (key in colplayer.tracklists.collection) {console.log(`${key}: ${colplayer.tracklists.collection[key][0].trackTitle}`);}

  if (!bcplayer && colplayer) {
    // on collection page & need to modify some of that player's functions + add shuffle
    replaceFunctions();
    addFunctions();
    // handle people loading on non wishlist or collection tabs (eg /followers)
    let tab = pagedata.active_tab;
    console.log('initial tab:', tab);
    if (tab !== 'wishlist' && tab !== 'collection') {
      let wishTab = document.querySelector('#grid-tabs > li[data-tab=wishlist]'),
          collectionTab = document.querySelector('#grid-tabs > li[data-tab=collection]'),
          tabClicked = function (e) {
            e.stopPropagation();
            let targetTab = false;
            for (let i = 0; i < e.path.length; i++) {
              if (e.path[i].id === 'wishtab') {
                targetTab = 'wishlist';
                break;
              }
            }
            if (!targetTab) targetTab = 'collection';
            collectionTab.removeEventListener('click', tabClicked);
            wishTab.removeEventListener('click', tabClicked);
            loadCollection(targetTab);
          };
      wishTab.id = 'wishtab';
      collectionTab.id = 'collectiontab';
      wishTab.addEventListener('click', tabClicked);
      collectionTab.addEventListener('click', tabClicked);
    } else {
      loadCollection(tab);
    }
  }

  /**********************************************************
   ********** PLAYER FUNCTIONS ******************************
   **********************************************************/ 

  function replaceFunctions(){
    let self = colplayer.player2;
    self.setCurrentTrack = function(index) {
      // console.log("index to set", index);
      self.currentTrackIndex(index);
      let newTrack = self.currentTrack();
      if (!newTrack) return;
      let id = newTrack.itemId,
          el = document.getElementById(newTrack.domId);
      // console.log("domId:", newTrack.domId);
      // console.log(newTrack, el);
      togglePlayButtons(colplayer.lastEl, true);
      togglePlayButtons(el);
      colplayer.lastEl = el;
      self._playlist.load([newTrack.trackData]);
      self.duration(self._playlist.duration());
      setCurrentEl(el);
      return true;
    };
    // have to redo these because currentTrackIndex returns a STRING and orig code just tacked a 1 onto it
    // eg going from index 2 ended up with 21 instead of 3
    self.prev = function() {
      if (colplayer.pendingUpdate || colplayer.pendingWishUpdate) {
        updateTracklists(+self.currentTrackIndex() - 1);
        return;
      }
      if (!self.hasPrev()) return false;
      return self.goToTrack(+self.currentTrackIndex() - 1);
    };
    self.next = function() {
      if (colplayer.pendingUpdate || colplayer.pendingWishUpdate) {
        updateTracklists(+self.currentTrackIndex() + 1);
        return;
      }
      if (!self.hasNext()) return false;
      return self.goToTrack(+self.currentTrackIndex() + 1);
    };
  }

  function addFunctions(){
    colplayer.shuffle = function () {
      colplayer.player2.stop();
      if (!colplayer.isShuffled) {
        let a = colplayer.currentPlaylist === 'albums' ? colplayer.albumPlaylist.slice() : 
                colplayer.currentPlaylist === 'favorites' ? colplayer.collectionPlaylist.slice() :
                colplayer.wishPlaylist.slice(),
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
        // need to do version of this for albums
        if (colplayer.currentPlaylist === 'favorites' || colplayer.currentPlaylist === 'wish') {
          a.forEach((track, i) => {
            let id = track.itemId,
                el = document.getElementById(track.domId);
            el.setAttribute('data-shufflenum', i);
            if (i === 0) {
              firstTrackEl = el;
              setCurrentEl(firstTrackEl);
            }
          });
        } else {
          let items = document.querySelectorAll('#collection-items .track_play_hilite');
          items.forEach((item,i) => {
            let shuffledAlbum = [];
            // find where all the album's tracks ended up
            a.forEach((track, i) => {
              if (track.itemId === item.getAttribute('data-itemid')) {
                shuffledAlbum.push(i);
              }
            });
            let shufTrack = shuffledAlbum.length === 1 ? shuffledAlbum[0] : 
                            shuffledAlbum[Math.floor(Math.random() * shuffledAlbum.length)];
            item.setAttribute('data-shufflenum', shufTrack);
            // console.log('shuffled album:', a[shufTrack].title, 'chose:', shufTrack);
          });
          setCurrentEl(document.getElementById(a[0].domId));
        }
        setQueueTitles(shufQueue);
      } else {
        let unshuffled = colplayer.currentPlaylist === 'albums' ? colplayer.albumPlaylist    : colplayer.collectionPlaylist,
            regQueue =   colplayer.currentPlaylist === 'albums' ? colplayer.albumQueueTitles : colplayer.queueTitles,
            el =         document.getElementById('shuffler');

        colplayer.player2.setTracklist(unshuffled);
        setQueueTitles(regQueue);
        setCurrentEl(document.getElementById(unshuffled[0].domId));
        colplayer.isShuffled = false;
        el.innerText = '(shuffle!)';      
      }
    }
  }

  /**********************************************************
   ********** COLLECTION FUNCTIONS **************************
   **********************************************************/ 

  function loadCollection(tab) {
    colplayer.isOwner = document.getElementById('fan-banner').classList.contains('owner');
    colplayer.collectionLength = 0; //window.CollectionData.sequence.length;
    colplayer.wishlistLength = 0; //window.WishlistData.sequence.length;
    colplayer.initialTab = tab,
    colplayer.currentTab = tab,
    colplayer.collectionBuilt = false,
    colplayer.wishBuilt = false;

    console.log(`clicked on ${tab} first`);
    let initEl = tab === 'collection' ? buildPlaylists(0,colplayer.isOwner) : 
                 tab === 'wishlist'   ? buildWishPlaylist(0) : false;
    setCurrentEl(initEl);

    // check if user expands collection
    observeTotal('collection', document.querySelector('#collection-items .collection-grid'));
    observeTotal('wishlist', document.querySelector('#wishlist-items .collection-grid'));

    // show transport on page load
    colplayer.player2._playlist.play(); 
    colplayer.player2._playlist.playpause(); 

    // these get manipulated depending on play state
    colplayer.transPlay = document.querySelector('#collection-player .playpause .play');
    colplayer.transPause = document.querySelector('#collection-player .playpause .pause');
    
    replaceClickHandlers();
  }

  function buildPlaylists(index, isOwner) {
    console.log('building playlists, index:',index, 'is owner:', isOwner);
    // index is 0 on first run, > 0 when collection view expanded
    let items = document.querySelectorAll('#collection-items .track_play_hilite'),
        collectionPlaylist = index === 0 ? [] : colplayer.collectionPlaylist.slice(),
        albumPlaylist =      index === 0 || !isOwner ? [] : colplayer.albumPlaylist.slice(),
        queueTitles =        index === 0 ? [] : colplayer.queueTitles.slice(),
        albumQueueTitles =   index === 0 || !isOwner ? [] : colplayer.albumQueueTitles.slice();

    // build collection & album playlists
    for (let i = index; i < items.length; i++) {    
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
            t.domId = domId;
            albumPlaylist.push(t);
            albumQueueTitles.push(`${t.trackData.artist} - ${t.trackData.title}`);
          });
        }
        console.log(`pushed album ${album[0].title} by ${album[0].trackData.artist}, playlist length now ${albumPlaylist.length}`);
      }
    } // end collection/album tracklist builder loop 

    if (isOwner) {
      // don't immediately update & stop current song if this is an update
      if (colplayer.player2.showPlay()) {
        console.log("not playing:", colplayer.player2.showPlay());
        colplayer.player2.setTracklist(albumPlaylist);
        colplayer.currentPlaylist = 'albums';
      } else {
        colplayer.pendingUpdate = true;
      }
      // these have to be available for playlistSwitcher
      colplayer.albumPlaylist = albumPlaylist;
      colplayer.albumQueueTitles = albumQueueTitles;     
      setQueueTitles(albumQueueTitles);
    } else {
      if (colplayer.player2.showPlay()) {
        console.log("not playing:", colplayer.player2.showPlay());
        colplayer.player2.setTracklist(collectionPlaylist);      
        colplayer.currentPlaylist = 'favorites';
        setQueueTitles(queueTitles);        
      } else {
        colplayer.pendingUpdate = true;
      }      
    }
    colplayer.queueTitles = queueTitles;
    colplayer.collectionPlaylist = collectionPlaylist;
    colplayer.collectionBuilt = true;
    colplayer.collectionLength = items.length;

    // allow switching between full albums & favorite tracks
    if (index === 0 && colplayer.player2.showPlay()) playlistSwitcher(true); 

    replaceClickHandlers();  
    return items[0];
  }

  // items aren't loaded until user clicks wishlist tab (or loads on /wishlist)
  function buildWishPlaylist(index) {
    console.log('building wish playlist');
    let wishItems = document.querySelectorAll('#wishlist-items .track_play_hilite'),
        wishPlaylist =       index === 0 ? [] : colplayer.wishPlaylist.slice(),
        wishQueueTitles =    index === 0 ? [] : colplayer.wishQueueTitles.slice();

    if (wishItems.length === 0) return;

    for (let i = index; i < wishItems.length; i++) {
      let wishId = wishItems[i].getAttribute('data-itemid'),
          wishDomId = wishItems[i].id,
          wishKey = window.WishlistData.sequence[i],
          wishTrack = colplayer.tracklists.wishlist[wishKey][0];

      if (wishTrack) {
        console.log(`pushing ${wishTrack.trackData.artist} - ${wishTrack.trackData.title} to wish playlist`);
        wishTrack.itemId = wishId;
        wishTrack.domId = wishDomId;
        wishPlaylist.push(wishTrack);
        wishQueueTitles.push(`${wishTrack.trackData.artist} - ${wishTrack.trackData.title}`);
        wishItems[i].setAttribute('data-tracknum', i);
      }
    }
    colplayer.wishQueueTitles = wishQueueTitles;
    colplayer.wishPlaylist = wishPlaylist;
    colplayer.wishBuilt = true;
    colplayer.wishlistLength = wishItems.length;

    // only load right away if wish tab is first music tab loaded
    if (index === 0 && !colplayer.currentPlaylist) {
      console.log('init wishlist');
      colplayer.player2.setTracklist(wishPlaylist);      
      playlistSwitcher(true,'wish');
      setQueueTitles(wishQueueTitles);
    } else {
      console.log('wishlist pending update');
      colplayer.pendingWishUpdate = true;
    }

    replaceClickHandlers();  
    return wishItems[0];
  }

  // sets the element for the playing object, needed for correct album cover play button display
  function setCurrentEl(item) {
    // this needs to be a jquery object
    colplayer.currentItemEl(jQuery(item));
  }

  function playlistSwitcher(init, switchTo) {
    console.log('switching playlists, init:', init, 'switchTo', switchTo);
    if (colplayer.isShuffled) colplayer.shuffle(); 
    let queueHeader = document.querySelector('.queue-header h2');
    if (init) {
      let switcher = document.createElement('a'),
          parent = document.querySelector('#collection-player .controls-extra'),
          startList = colplayer.isOwner ? 'albums' : 'favorites',
          header = `<span id="playlist-header" style="font-weight:600;">${startList}</span>`,
          shuffle = '<span id="shuffler" style="margin-left:10px; font-size:0.7em; cursor: pointer;">(shuffle!)</span>';

      queueHeader.innerHTML = colplayer.isOwner ? `now playing ${header} ${shuffle}` : `now playing ${header}`;

      // only owners have full albums & can shuffle
      if (colplayer.isOwner) {
        switcher.href = '#';
        switcher.setAttribute('onclick','return false;');
        switcher.id = 'playlist-switcher';
        switcher.style.marginRight = '10px';
        switcher.innerText = 'Switch to favorite tracks';
        parent.prepend(switcher);
        switcher.addEventListener('click', () => playlistSwitcher());
        document.getElementById('shuffler').addEventListener('click', () => colplayer.shuffle());
      }
      if (switchTo === 'wish') {
        // init was sent from wish tab
        playlistSwitcher(false, 'wish');
      }
    } else {
      let switcher = document.getElementById('playlist-switcher'),
          header = document.getElementById('playlist-header'),
          shuffler = document.getElementById('shuffler');
      if (switchTo === 'wish') {
        colplayer.player2.setTracklist(colplayer.wishPlaylist);
        setQueueTitles(colplayer.wishQueueTitles);
        colplayer.currentPlaylist = 'wish';
        header.innerText = 'wishlist';
        if (colplayer.isOwner) {
          shuffler.style.display = 'none'; // no shuffle on wishlist
          switcher.innerText = '';
        }
      } else {        
        // default to favorites when switching from wish
        if (colplayer.currentPlaylist === 'albums' || colplayer.currentPlaylist === 'wish' || !colplayer.isOwner) {
          colplayer.player2.setTracklist(colplayer.collectionPlaylist);
          setQueueTitles(colplayer.queueTitles);
          colplayer.currentPlaylist = 'favorites';
          header.innerText = 'favorite tracks';
          if (colplayer.isOwner) {
            shuffler.style.display = 'inline-block';
            switcher.innerText = 'Switch to full albums';  
          }
        } else {
          colplayer.player2.setTracklist(colplayer.albumPlaylist);
          setQueueTitles(colplayer.albumQueueTitles);
          colplayer.currentPlaylist = 'albums';
          header.innerText = 'albums';
          switcher.innerText = 'Switch to favorite tracks';
        }
      }      
    }
  }

  function setQueueTitles(titles){
    console.log('updating queue to # titles', titles.length);
    let queue = document.querySelectorAll('.queue li > .info');
    queue.forEach(function(item, index){
      item.innerHTML = `${index+1}. ${titles[index]}`;
    });
  }

  function updateTracklists(num) {
    console.log('updating tracklist while nothing is playing');
    if (colplayer.pendingUpdate) {
      colplayer.player2.setTracklist(colplayer.collectionPlaylist);
      setQueueTitles(colplayer.queueTitles);
      // test if this makes it always swap to albums even if on favorites
      if (colplayer.isOwner) {
        colplayer.player2.setTracklist(colplayer.albumPlaylist);
        setQueueTitles(colplayer.albumQueueTitles);
      }
      colplayer.pendingUpdate = false;
    } else if (colplayer.pendingWishUpdate) {
      console.log('wishlist updated');
      colplayer.player2.setTracklist(colplayer.wishPlaylist);
      setQueueTitles(colplayer.wishQueueTitles);
      colplayer.pendingWishUpdate = false;
    }    
    if (num) colplayer.player2.goToTrack(num);
  }

  function replaceClickHandlers(){
    console.log('replacing click handlers');
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
                   'hidden';

    // need to set grid & deal with playlist switching before below
    if (gridType === 'wish' && colplayer.currentPlaylist !== 'wish') {
      playlistSwitcher(false,'wish');
    } else if (gridType === 'collection' && colplayer.currentPlaylist === 'wish') {
      playlistSwitcher(false);
    }

    let tracknum = colplayer.isShuffled ? item.getAttribute('data-shufflenum') :
                   colplayer.currentPlaylist === 'favorites' || colplayer.currentPlaylist === 'wish' ? item.getAttribute('data-tracknum') : 
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
    if (colplayer.pendingUpdate || colplayer.pendingWishUpdate) updateTracklists();
    setCurrentEl(item); 
    console.log(item);
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

  /**********************************************************
   ********** FEED FUNCTIONS ********************************
   **********************************************************/

  let feedPlaylist = [],
      feedPlaylistLength,
      releasePlaylist = [],
      releasePlaylistLength,
      currentList = 'feed',
      pausedTrack; 

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
    // (since they did not intend this to play through automatically)
    for (let i = 0; i < originalPlaylist.length; i++) {
      let origId = originalPlaylist[i].id.toString();
      // console.log(`index ${i} origId ${origId}`);
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
          bcplayer._playlist._playlist.push(originalPlaylist[i]);
          addedToFeed.push(originalPlaylist[i].id);
          console.log(`feed: added ${originalPlaylist[i].title}, tracknum ${originalPlaylist[i].tracknum} to slot ${bcplayer._playlist._playlist.length - 1}`);
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
        console.log(`release: added ${originalPlaylist[i].title}, tracknum ${originalPlaylist[i].tracknum} to slot ${i}`);
      } else {
        // track is in playlist but not yet on page, so we don't need it right now
      }
    }
    // 10 feed stories loaded by default, but could change on whims of bandcamp
    // reference this to determine when tracks are added by scrolling
    feedPlaylistLength = bcplayer._playlist.length();
    console.log('initial feed playlist:',bcplayer._playlist._playlist);
    // reference this in case any tracks added via scrolling while release list is playing
    releasePlaylistLength = releasePlaylist.length;

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
    this._nextTrack = false;                  // evade bc's auto-reset & ensure correct track gets played
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
    ];

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

  FeedPlaylist.prototype.onStateUpdate = function(state) {
    console.log("onStateUpdate:", state, "track:", this._track);

    if ((state === 'PLAYING' || state === 'PAUSED') 
         && this._nextTrack 
         && +this._track !== this._nextTrack) {
      console.log('force playing correct track', this._nextTrack);
      this.playlist.play_track(this._nextTrack);
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
      // console.log('set force track:',+this._nextTrack);
      this.playlist.play_track(+this._track + 1);
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

  // get track ids for feed or releases playlists
  function getTrackIds(list) {
    console.log(`getting track ids for ${list} list`);
    let listSelector = list === 'feed' ? '#story-list .track_play_hilite' : '#new-releases-vm .collection-grid > li',
        entries = document.querySelectorAll(listSelector),
        trackCollection = [];
    for (let i = 0; i < entries.length; i++) {
      let track = entries[i].getAttribute('data-trackid');
          // tracknum = entries[i].getAttribute('data-tracknum');
      if (track !== '') {
          trackCollection.push(track);
          // console.log('trackid:',track,'tracknum',tracknum);
      } else {
        console.log('got a story with no track');
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
      feedPlayer.playpause();
    } else {
      console.log('found track, playing now');
      if (pausedTrack === trackId) {
        console.log("unpausing");
        feedPlayer.playpause();
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

  /**********************************************************
   ********** SHARED FUNCTIONS ******************************
   **********************************************************/ 

  function countInArray(array, value) {
    return array.reduce((n, x) => n + (x === value), 0);
  }

  function observeTotal(page, parent) {
    console.log('setting up observer on', parent);
    let options = {
      childList: true
    },
    observer = new MutationObserver((mutations) => {
      console.log('detected playlist expansion');
      let numTracks;
      if (page === 'feed') {
        // not all stories are playable tracks
        numTracks = document.querySelectorAll('.story-innards .track_play_auxiliary').length;
        if (numTracks > feedPlaylistLength) {
          bindPlayButtons();
          if (currentList === 'feed') {
            checkDuplicates();
          }
        }
      } else {
        numTracks = page === 'collection' ? window.CollectionData.sequence.length : window.WishlistData.sequence.length;
        let items = page === 'collection' ? 
                    document.querySelectorAll('#collection-items .track_play_hilite') :
                    document.querySelectorAll('#wishlist-items .track_play_hilite');
        console.log('tracks in tab:', items.length, 'tracks ready:', numTracks);
        if (items.length < numTracks) {
          // this means mutation observer triggered build before all the items showed up
          console.log('waiting on missing items');
          return;
        }
        if (page === 'collection') {          
          if (colplayer.collectionLength < numTracks) {
            console.log('collectionLength:',colplayer.collectionLength,'numtracks',numTracks);
            if (colplayer.collectionBuilt) {
              console.log('adding to collection playlist');
              buildPlaylists(colplayer.collectionLength, colplayer.isOwner);              
            } else {
              console.log('initializing collection playlist');
              buildPlaylists(0, colplayer.isOwner);
            }
            colplayer.collectionLength = numTracks;
          }
        } else {  // wishlist tab
          if (colplayer.wishlistLength < numTracks) {
            console.log('wishlistLength:',colplayer.wishlistLength,'numtracks',numTracks);
            if (colplayer.wishBuilt) {
              console.log('adding to wish playlist');
              buildWishPlaylist(colplayer.wishlistLength);              
            } else {
              console.log('initializing wish playlist');
              buildWishPlaylist(0);
            }
            colplayer.wishlistLength = numTracks;
          }
        }
        
      }
      console.log(`there are now ${numTracks} playable tracks in feed`);    
    });
    observer.observe(parent, options);
  }

  /**********************************************************
   ********** UTILITY FUNCTIONS *****************************
   **********************************************************/ 

  function countInArray(array, value) {
    return array.reduce((n, x) => n + (x === value), 0);
  }

  // init feed player
  const feedPlayer = bcplayer ? new FeedPlaylist() : false;   
})(window, document);