import { handle_feed_page_expansion } from './feed.js';
import { buildPlaylists, buildWishPlaylist, init_true_view_all } from './profile.js';

// sets global prefs variable based on user-mapped hotkeys or the defaults
export function set_prefs() {
  const script_el = document.querySelector('script#bandcamp-streamer'),
        prefs = JSON.parse(script_el.getAttribute('data-prefs'));
  window.prefs = prefs;
}

export function countInArray(array, value) {
  return array.reduce((n, x) => n + (x === value), 0);
}

export function bindControlKeys({bcplayer, colplayer, albumplayer} = {}) {
  console.log('binding control keys', prefs);
  add_key_listeners(prefs, {bcplayer, colplayer, albumplayer});
}

function add_key_listeners(prefs, {bcplayer, colplayer, albumplayer} = {}) {
  document.addEventListener('keyup', (e) => {
    const control_keys = [
            prefs.playpause, prefs.previous, 
            prefs.next, prefs.seekback, prefs.seekforward
          ],
          controlKey = control_keys.indexOf(e.code) > -1;

    /* 
      Browsers autoscroll down w/ spacebar press, so if spacebar is set for 
      playpause, disable that. If this behavior is not desired, playpause
      can be remapped.
    */
    if (prefs.playpause == 'Space') {
      document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && e.target == document.body) {
          e.preventDefault();
          // console.log('no spacebar scrolling');
        }
      });
    }

    if (controlKey && e.target == document.body) {
      if (bcplayer !== undefined) {
        // console.log('feed', bcplayer)
        switch(e.code) {
          case prefs.playpause:
            feedPlayer.playpause();
            break;
          case prefs.previous:
            feedPlayer.previous();
            break;
          case prefs.next:
            feedPlayer.next();
            break;
          case prefs.seekback:
            seek('back', feedPlayer, prefs.seekrate);
            break;
          case 'Period':
            seek('forward', feedPlayer, prefs.seekrate);
            break;
        }
      } else if (colplayer !== undefined) {
        // console.log('col', e.code, colplayer);
        switch(e.code) {
          case prefs.playpause:
            console.log('space playpausing');
            colplayer.player2.playPause();
            break;
          case prefs.previous:
            colplayer.player2.prev();
            break;
          case prefs.next:
            colplayer.player2.next();
            break;
          case prefs.seekback:
            seek('back', colplayer, prefs.seekrate);
            break;
          case 'Period':
            seek('forward', colplayer, prefs.seekrate);
            break;
        }
      } else if (albumplayer !== undefined) {
        // console.log(e.code, 'album/track', albumplayer);
        switch(e.code) {
          case prefs.playpause:
            document.querySelector('.playbutton').click();
            break;
          case prefs.previous:
            document.querySelector('.prevbutton').click();
            break;
          case prefs.next:
            document.querySelector('.nextbutton').click();
            break;
        }
      }
    }  // control key cases
  });  // keyup event listener
}      // add_key_listeners

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
                  document.querySelectorAll('#collection-items .collection-item-container') :
                  document.querySelectorAll('#wishlist-items .collection-item-container');
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

export function create_seekers(container, player, seek_rate) {
  let seekers = document.createElement('p'),
      seek_back = document.createElement('span'),
      seek_title = document.createElement('span'),
      seek_forward = document.createElement('span');

    seekers.id = 'seekers';

    seek_back.id = 'seek-back';
    seek_back.innerText = '<<';
    seek_back.title = `back ${seek_rate}s`;

    seek_title.innerText = '(seek)';

    seek_forward.id = 'seek-forward';
    seek_forward.innerText = '>>';
    seek_forward.title = `foward ${seek_rate}s`;

    seekers.appendChild(seek_back);
    seekers.appendChild(seek_title);
    seekers.appendChild(seek_forward);
    container.appendChild(seekers);

    seek_back.addEventListener('click', () => seek('back', player, seek_rate));
    seek_forward.addEventListener('click', () => seek('forward', player, seek_rate));
}

function seek(direction, player, seek_rate=10) {
  const position = bcplayer ? player._position : player.player2._playlist._position,
        new_val = direction == 'forward' ? position + +seek_rate : position - +seek_rate;

  // console.log('SEEKING:', seek_rate, position, new_val);

  // jumps to the second passed in, skips to next track if at end
  if (bcplayer) bcplayer._playlist._player.seek(new_val);
  if (colplayer) colplayer.player2._playlist.seek(new_val);
}