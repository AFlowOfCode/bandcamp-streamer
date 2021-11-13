import { setQueueTitles, updateTracklists } from './profile.js';

export function replaceFunctions(colplayer){
  console.log('replacing functions');
  const self = colplayer.player2,
        origPlayPause = self.playPause;
  self.setCurrentTrack = function(index) {
    console.log("index to set", index);
    self.currentTrackIndex(index);
    let newTrack = self.currentTrack();
    if (!newTrack) return;
    let el = document.getElementById(newTrack.domId),
        itemKey = getItemKey(el);
    console.log("domId:", newTrack.domId);
    console.log(newTrack, el);
    togglePlayButtons(colplayer.lastEl, true);
    togglePlayButtons(el);
    colplayer.lastEl = el;
    self._playlist.load([newTrack.trackData]);
    self.duration(self._playlist.duration());
    setCurrentEl(el);
    colplayer.currentItemKey(itemKey);
    window.document.title = `${self.currentTrack().trackTitle} by ${self.currentTrack().trackData.artist} | ${window.originalTitle}`;
    return true;
  };

  /*
    the toggle param handles a very specific scenario:
    last track of initial col/wish batch is playing
    when it plays to end, the state is changed to "paused"
    at that point, if an update is pending because user clicked to expand
    the tracklist update is triggered based on the state change
    but if the user actually pauses the track, we don't want that to 
    update the tracklist as it will immediately play the next track 
    instead of pausing
    so if an update is pending, it's set to false temporarily
    to skip the state change trigger, then set back to true 
  */
  self.pendingUpdate = function({toggle=false} = {}) {
    if (toggle) {
      console.log('pending update hackery');
      // temps are only used to check if it was true before
      // so we know to put it back
      // because typically either col OR wish will be pending
      // so setting both to the opposite will accomplish nothing
      // this scenario likely only happens once per page load (if at all)
      if (colplayer.pendingUpdate || colplayer.pendingUpdateTemp) {
        colplayer.pendingUpdateTemp = colplayer.pendingUpdate;
        colplayer.pendingUpdate = !colplayer.pendingUpdate;
      }
      if (colplayer.pendingWishUpdate || colplayer.pendingWishUpdateTemp) {
        colplayer.pendingWishUpdateTemp = colplayer.pendingWishUpdate;
        colplayer.pendingWishUpdate = !!!colplayer.pendingWishUpdateTemp;
      }
    }
    return !!(colplayer.pendingUpdate || colplayer.pendingWishUpdate);
  }

  // have to redo these because currentTrackIndex returns a STRING and orig code just tacked a 1 onto it
  // eg going from index 2 ended up with 21 instead of 3
  // also want them to check if list needs updating before playing
  self.prev = function() {
    if (self.pendingUpdate()) {
      updateTracklists(+self.currentTrackIndex() - 1);
      return;
    }
    if (!self.hasPrev()) return false;
    return self.goToTrack(+self.currentTrackIndex() - 1);
  };
  self.next = function() {
    if (self.pendingUpdate()) {
      updateTracklists(+self.currentTrackIndex() + 1);
      return;
    }
    if (!self.hasNext()) return false;
    return self.goToTrack(+self.currentTrackIndex() + 1);
  };

  self.playPause = function() {
    console.log('playPause override triggered');
    let toggled = false;
    if (self.pendingUpdate()) {
      toggled = true;
      self.pendingUpdate({toggle: true});
    }
    origPlayPause();
    // timeout is necessary to avoid state trigger
    if (toggled) {
      setTimeout(() => {
        self.pendingUpdate({toggle: true});
        if (self.currentState() === 'paused' && self.pendingUpdate()) updateTracklists();
      }, 1000);
    }
  }

  // these overrides needed to allow hooking into state changes
  function evt(event) {
    return "player2." + (self.playerId ? self.playerId + "." : "") + event
  }
  self.currentState.subscribe(function(v) {
    BCEvents.publish(evt("stateChange"), {
        state: v,
        track: self.currentTrack()
    });
    // before 1st expansion of col/wish, if last track of initial batch is playing & ends
    // tracklist won't update unless done here
    if (v === "paused" && self.pendingUpdate()) {
      // verify it's the last track otherwise every time a user pauses when an update is pending
      // it'll jump ahead
      if (+self.currentTrackIndex() === self.currentTracklist().length - 1) {
        console.log('end of playlist tracklist update trigger');
        updateTracklists(+self.currentTrackIndex() + 1);
      }
    }
  });
}

export function addFunctions(colplayer){
  // shuffle playlist
  colplayer.shuffle = function () {
    colplayer.player2.stop();
    if (!colplayer.isShuffled) {
      console.log('shuffling');
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
      el.innerText = '➡ (unshuffle!)'; 
      colplayer.player2.setTracklist(a);
      let firstTrackEl;
      // allow clicking on item to play appropriate track from shuffle list 
      // todo: version of this for albums
      if (colplayer.currentPlaylist === 'favorites' || colplayer.currentPlaylist === 'wish') {
        a.forEach((track, i) => {
          let id = track.itemId,
              el = document.getElementById(track.domId);
          el.setAttribute('data-shufflenum', i);
          if (i === 0) {
            firstTrackEl = el;
            setCurrentEl(firstTrackEl);
            colplayer.currentItemKey(getItemKey(el));
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
          console.log('shuffled album:', a[shufTrack].title, 'chose:', shufTrack);
        });
        setCurrentEl(document.getElementById(a[0].domId));
      }
      setQueueTitles(shufQueue);
    } else {
      let unshuffled = colplayer.currentPlaylist === 'albums' ? colplayer.albumPlaylist 
                     : colplayer.currentPlaylist === 'wish' ? colplayer.wishPlaylist 
                     : colplayer.collectionPlaylist,
          regQueue   = colplayer.currentPlaylist === 'albums' ? colplayer.albumQueueTitles 
                     : colplayer.currentPlaylist === 'wish' ? colplayer.wishQueueTitles
                     : colplayer.queueTitles,
          el         = document.getElementById('shuffler');

      console.log('unshuffling');
      colplayer.player2.setTracklist(unshuffled);
      setQueueTitles(regQueue);
      setCurrentEl(document.getElementById(unshuffled[0].domId));
      colplayer.isShuffled = false;
      el.innerText = '🔀 (shuffle!)';      
    }
  }; // colplayer.shuffle()
} // addFunctions()

// this catches errors that halt all playback and instead restarts the stream
// usually when this happens it's because the mp3 url has expired or changed.. example:
// GET https://bandcamp.com/stream_redirect?enc=mp3-128&track_id=2441814329&ts=1569574019&t=44bc84483037a3141cfe964490d1d29851e570ff 
// net::ERR_NAME_NOT_RESOLVED
// HTML5Player-1: got native error event; error.code=4
export function catchErrors(player, page) {
  // this needs to be the _html5player
  // collection page: colplayer.player2._playlist._player._html5player
  // feed page:       bcplayer._playlist._player._html5player
  player._error = function(str) {
    console.warn("Catching play error, trying to restart track. Error:",str);
    if (page === 'collection') {
      colplayer.player2.next();
      colplayer.player2.prev();
    } else {
      feedPlayer.next();
      feedPlayer.previous();
    }      
  }
}

// @param {DOMnode} item - the <li> node for an item in the collection
export function getItemKey(item) {
  let itemId = item.getAttribute("data-itemid"),
      itemType = item.getAttribute("data-itemtype").slice(0, 1),
      itemKey = itemType + itemId;
  console.log('got item key', itemKey);
  return itemKey;
}

// Handle playing elements
export function togglePlayButtons(item, offonly) {
  // Todo: when you click a track on playlist, it should jump to the row which has that album
  // if playing a new track, turn off prev button first
  if(!item) return;
  if (!item.classList.contains('playing')) {
    let prev = document.querySelector('.collection-item-container.playing');
    if (prev) prev.classList.remove('playing');
  }

  item.classList.toggle('playing');

  // if track is playing make sure transport shows pause
  if (colplayer.transPause) {
    if (item.classList.contains('playing')) {
      colplayer.transPause.style.display = 'inline-block';
      colplayer.transPlay.style.display = 'none';
    } else if (!offonly) {
      colplayer.transPause.style.display = 'none';
      colplayer.transPlay.style.display = 'inline-block';
    }
  }
}

// sets the element for the playing object, needed for correct album cover play button display
export function setCurrentEl(item) {
  // this needs to be a jquery object
  colplayer.currentItemEl(jQuery(item));
}