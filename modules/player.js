import { setQueueTitles, getItemKey, create_playlist_mods } from './profile.js';

function clone_playlist(colplayer) {
  return colplayer.currentPlaylist === 'albums' ? colplayer.albumPlaylist.slice() : 
         colplayer.currentPlaylist === 'favorites' ? colplayer.collectionPlaylist.slice() :
         colplayer.currentPlaylist === 'collection-search' ? colplayer.collection_search_playlist.slice() :
         colplayer.currentPlaylist === 'wishlist-search' ? colplayer.wishlist_search_playlist.slice() :
         colplayer.wishPlaylist.slice();
}

export function addFunctions(colplayer) {
  
  // reverse playlist
  colplayer.reverse = function() {
    console.log('reversing');
    colplayer.player2.stop();
    let reversed;

    if (colplayer.isShuffled) {
      reversed = colplayer.player2.getTracklist().slice().reverse();
    } else {
      reversed = !colplayer.isReversed ? clone_playlist(colplayer).reverse() : clone_playlist(colplayer);
    }

    const attr = colplayer.isShuffled ? 'data-shufflenum' : 
                 colplayer.currentPlaylist.indexOf('search') > -1 ? 'data-searchnum' :
                 'data-tracknum';

    reversed.forEach((track, i) => {
      const dom_item = document.getElementById(track.domId);
      dom_item.setAttribute(attr, i);
      if (colplayer.currentPlaylist == 'albums' || colplayer.currentPlaylist.indexOf('search')) {
        /*
        "first" track of an album doesn't really apply when shuffled or reversed, 
        but it has to be something otherwise clicking on the album art will play 
        something else entirely
        */
        dom_item.setAttribute('data-firsttrack', i);
      }
    });

    colplayer.player2.setTracklist(reversed);
    colplayer.isReversed = !colplayer.isReversed;
  };

  // shuffle playlist
  colplayer.shuffle = function() {
    colplayer.player2.stop();
    colplayer.isReversed = false;
    if (!colplayer.isShuffled) {
      console.log('shuffling');

      let a = clone_playlist(colplayer),
          shufQueue = [],
          el = document.getElementById('shuffler');

      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      a.forEach((track) => shufQueue.push(`${track.trackData.artist} - ${track.trackData.title}`));
      colplayer.isShuffled = true;
      el.innerText = '➡ (unshuffle!)'; 
      colplayer.player2.setTracklist(a);

      let firstTrackEl;
      // allow clicking on item to play appropriate track from shuffle list 
      // todo: version of this for albums
      if (colplayer.currentPlaylist === 'favorites' || colplayer.currentPlaylist === 'wish') {
        a.forEach((track, i) => {
          let el = document.getElementById(track.domId);
          el.setAttribute('data-shufflenum', i);
          if (i === 0) {
            firstTrackEl = el;
            setCurrentEl(firstTrackEl);
            colplayer.currentItemKey(getItemKey(el));
          }
        });
      } else {
        let items = document.querySelectorAll('#collection-items .track_play_hilite');
        items.forEach((item) => {
          let shuffledAlbum = [];
          // find where all the album's tracks ended up
          a.forEach((track, i) => {
            if (track.itemId === item.getAttribute('data-itemid')) shuffledAlbum.push(i);
          });
          // this is which album track plays when clicking on the art
          // can only be one unless there was a sub-shuffle routine that randomized it every time
          let shufTrack = shuffledAlbum.length === 1 ? shuffledAlbum[0] : 
                          shuffledAlbum[Math.floor(Math.random() * shuffledAlbum.length)];
          item.setAttribute('data-shufflenum', shufTrack);
          if (a[shufTrack]) console.log('shuffled album:', a[shufTrack].title, 'chose:', shufTrack);
        });
        setCurrentEl(document.getElementById(a[0].domId));
      }
      setQueueTitles(shufQueue);
    } else {
      // player is already shuffled, so unshuffle
      const unshuffled = colplayer.currentPlaylist === 'albums' ? colplayer.albumPlaylist 
                       : colplayer.currentPlaylist === 'wish' ? colplayer.wishPlaylist 
                       : colplayer.collectionPlaylist,
            regQueue   = colplayer.currentPlaylist === 'albums' ? colplayer.albumQueueTitles 
                       : colplayer.currentPlaylist === 'wish' ? colplayer.wishQueueTitles
                       : colplayer.queueTitles,
            shuffler   = document.getElementById('shuffler');

      console.log('unshuffling');
      colplayer.player2.setTracklist(unshuffled);
      setQueueTitles(regQueue);
      setCurrentEl(document.getElementById(unshuffled[0].domId));
      colplayer.isShuffled = false;
      if (!shuffler) {
        create_playlist_mods({place_in_dom: true, only_return_shuffler: true});
      } else {
        shuffler.innerText = '🔀 (shuffle!)';        
      } 
    }
  }; // colplayer.shuffle()

  /*
    The toggle param handles a very specific scenario:
    Last track of initial col/wish batch is playing -
    when it reaches the end, the state is changed to "paused".
    If an update is pending (because user clicked to load more items
    while that last track was playing), the tracklist update is triggered 
    based on that state change. But if the user actually pauses the track, 
    we don't want that to update the tracklist as it will immediately play 
    the next track instead of pausing like it should. So if an update is pending, 
    it's set to false temporarily to skip the state change trigger, then set back to true 
  */
  colplayer.player2.pendingUpdate = function({toggle=false} = {}) {
    if (toggle) {
      console.log('pending update hackery');
      /*
        temps are only used to check if it was true before
        so we know to put it back
        because typically either col OR wish will be pending
        so setting both to the opposite will accomplish nothing
        this scenario likely only happens once per page load (if at all)
      */
      if (colplayer.pendingUpdate || colplayer.pendingUpdateTemp) {
        colplayer.pendingUpdateTemp = colplayer.pendingUpdate;
        colplayer.pendingUpdate = !colplayer.pendingUpdateTemp;
      }
      if (colplayer.pendingWishUpdate || colplayer.pendingWishUpdateTemp) {
        colplayer.pendingWishUpdateTemp = colplayer.pendingWishUpdate;
        colplayer.pendingWishUpdate = !colplayer.pendingWishUpdateTemp;
      }
    }
    return !!(colplayer.pendingUpdate || colplayer.pendingWishUpdate);
  };

} // addFunctions()

/*
  this catches errors that halt all playback and instead restarts the stream
  usually when this happens it's because the mp3 url has expired or changed.. example:
  GET https://bandcamp.com/stream_redirect?enc=mp3-128&track_id=2441814329&ts=1569574019&t=44bc84483037a3141cfe964490d1d29851e570ff
  net::ERR_NAME_NOT_RESOLVED
  HTML5Player-1: got native error event; error.code=4
*/
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
  };
}

/**
 * Handles the display of play/pause button indicators on the DOM collection items
 * and the player transport
 * @param {DOMnode} item - the <li> node for an item in the collection
 * @param {boolean} is_playing 
 *    - true if passing in a track that is being switched to
 *    - false if passing in a track that is being switching from
 *    - undefined if current track is being playpaused
 */
export function togglePlayButtons({item, is_playing} = {}) {
  console.log('togglePlayButtons item & is_playing', item, is_playing);
  if (!item) return;
  let has_playing_class = item.classList.contains('playing');
  console.log('dom item playing toggle, is playing?', is_playing); 
  console.log('has playing class?', has_playing_class);

  // if we know this item is playing, make sure it has playing class
  // if we know it isn't, make sure we remove the class
  item.classList[is_playing ? 'add' : is_playing === false ? 'remove' : 'toggle']('playing');
  has_playing_class = item.classList.contains('playing');
  console.log('item now playing?', has_playing_class, item);

  // return if this is just turning off an item because transport has already been handled
  if (is_playing === false) return;

  if (colplayer.transPause) {
    if (has_playing_class) {
      // item is newly playing, so make sure transport shows pause
      colplayer.transPause.style.display = 'inline-block';
      colplayer.transPlay.style.display = 'none';
    } else {
      // item has been stopped, so show play
      colplayer.transPause.style.display = 'none';
      colplayer.transPlay.style.display = 'inline-block';
    }
  }
}

/**
 * Sets the element for the playing object, needed for correct album cover play button display
 * @param {DOMnode} item - the <li> node for an item in the collection
 */
export function setCurrentEl(item) {
  // this needs to be a jquery object
  colplayer.currentItemEl(jQuery(item));
}

/**
 * Sets references to the transport player play & pause elements
 */
export function assignTransButtons() {
  // these get manipulated depending on play state
  colplayer.transPlay = document.querySelector('#collection-player .playpause .play');
  colplayer.transPause = document.querySelector('#collection-player .playpause .pause');
}