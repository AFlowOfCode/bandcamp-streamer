import { 
  bind_play_buttons, set_track_numbers, validate_feed_integrity, setPrice, rebuild_feed_playlist
} from './feed.js';
import { buildPlaylists, buildWishPlaylist, init_true_view_all } from './profile.js';

export function countInArray(array, value) {
  return array.reduce((n, x) => n + (x === value), 0);
}

export function bindControlKeys({bcplayer, colplayer, albumplayer} = {}) {
  console.log('binding control keys');
  // bind spacebar to playpause
  // this should be an option to enable
  // browsers auto scroll down w/ spacebar press, which some people may like
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target == document.body) {
      e.preventDefault();
      console.log('no scrolling');
    }
  });
  document.addEventListener('keyup', (e) => {
    let controlKey = false;
    if (e.code === 'Space' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      controlKey = true;
    }
    if (controlKey && e.target == document.body) {
      if (bcplayer !== undefined) {
        // console.log('feed', bcplayer)
        switch(e.code) {
          case 'Space':
            feedPlayer.playpause();
            break;
          case 'ArrowLeft':
            feedPlayer.previous();
            break;
          case 'ArrowRight':
            feedPlayer.next();
            break;
        }
      } else if (colplayer !== undefined) {
        // console.log('col', e.code, colplayer);
        switch(e.code) {
          case 'Space':
            console.log('space playpausing');
            colplayer.player2.playPause();
            break;
          case 'ArrowLeft':
            colplayer.player2.prev();
            break;
          case 'ArrowRight':
            colplayer.player2.next();
            break;
        }
      } else if (albumplayer !== undefined) {
        // console.log('album/track',albumplayer); 
        switch(e.code) {
          case 'Space':
            albumplayer.playpause();
            break;
          // Album player has different mechanism of switching tracks
          case 'ArrowLeft':
            // albumplayer.prev();
            break;
          case 'ArrowRight':
            // albumplayer.next();
            break;
        }
      }
    }
  });
} // bindControlKeys()

export function observeTotal(page, parent) {
  console.log('setting up observer on', parent);
  let options = {
    childList: true
  },
  observer = new MutationObserver((mutations) => {
    console.log('detected playlist expansion');
    let numTracks;
    if (page === 'feed') {
      handle_feed_page_expansion();
    } else {
      numTracks = page === 'collection' ? window.CollectionData.sequence.length : window.WishlistData.sequence.length;
      // adding more tracks to player unshuffles playlist automatically
      // currently handling by just updating shuffled indicator
      // TODO: find way to keep it shuffled
      if (colplayer.isShuffled) colplayer.pendingUnshuffle = true;

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
            init_true_view_all('collection');
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
            init_true_view_all('wishlist');
          }
          colplayer.wishlistLength = numTracks;
        }
      }
      
    }
    // console.log(`there are now ${numTracks} playable tracks in feed (minus any dead tracks)`, bcplayer._playlist._playlist);    
  }); // observer definition
  observer.observe(parent, options);
} // observeTotal

function handle_feed_page_expansion() {
  if (currentList === 'feed') {
    /* 
      bcplayer._playlist._loadedtrack stays same as what is currently playing
      bcplayer._playlist._track changes right away to the first track number from the next batch
      This is incorrect, so we change it back otherwise artwork gets out of sync 
      when track that was playing during expansion is still playing & then paused
      (bcplayer._playlist.first_playable_track also changes like _track but doesn't matter) 
    */
    let currentIndex = +bcplayer._playlist._loadedtrack;
    console.log('current track index playing', currentIndex);
    feedPlayer._stillPlaying = currentIndex;
    bcplayer._playlist._track = currentIndex;
    feedPlayer._nextTrack = currentIndex + 1;
    console.log('set force track (expansion):',feedPlayer._nextTrack);
  }        

  // not all stories are playable tracks
  const num_playable_stories = document.querySelectorAll('.story-innards .track_play_auxiliary').length;
  if (num_playable_stories > bcplayer.feed_playlist_length) {
    
    bind_play_buttons();
    if (currentList === 'feed') {
      // need to set tracknums because integrity validation will only rebuild (and assign tracknums) if it finds dupes
      set_track_numbers();
      validate_feed_integrity(bcplayer._playlist._playlist);
    } else if (currentList === 'release') {
      // rebuild handles integrity & tracknums
      rebuild_feed_playlist();
    }

    // set prices on each new feed item
    for (let i = bcplayer.feed_playlist_length; i < num_playable_stories; i++) {
      if (bcplayer._playlist._playlist[i]) {
        setPrice(bcplayer._playlist._playlist[i].id);              
      } else {
        console.log(`track ${i} doesn't seem to exist`, bcplayer._playlist._playlist[i]);
      }
    }
  }
}