import { handle_feed_page_expansion } from './feed.js';
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
      // console.log('no scrolling');
    }
  });
  document.addEventListener('keyup', (e) => {
    const controlKey = e.code === 'Space' || e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code == 'Period' || e.code == 'Comma';
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
          case 'Comma':
            seek('back', feedPlayer);
            break;
          case 'Period':
            seek('forward', feedPlayer);
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
          case 'Comma':
            seek('back', colplayer);
            break;
          case 'Period':
            seek('forward', colplayer);
            break;
        }
      } else if (albumplayer !== undefined) {
        // console.log(e.code, 'album/track', albumplayer);
        switch(e.code) {
          case 'Space':
            document.querySelector('.playbutton').click();
            break;
          case 'ArrowLeft':
            document.querySelector('.prevbutton').click();
            break;
          case 'ArrowRight':
            document.querySelector('.nextbutton').click();
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

export function create_seekers(container, player) {
  let seekers = document.createElement('p'),
      seek_back = document.createElement('span'),
      seek_title = document.createElement('span'),
      seek_forward = document.createElement('span');

    seekers.id = 'seekers';

    seek_back.id = 'seek-back';
    seek_back.innerText = '<<';
    seek_back.title = 'back 10s';

    seek_title.innerText = '(seek)';

    seek_forward.id = 'seek-forward';
    seek_forward.innerText = '>>';
    seek_forward.title = 'forward 10s';

    seekers.appendChild(seek_back);
    seekers.appendChild(seek_title);
    seekers.appendChild(seek_forward);
    container.appendChild(seekers);

    seek_back.addEventListener('click', () => seek('back', player));
    seek_forward.addEventListener('click', () => seek('forward', player));
}

function seek(direction, player) {
  const seek_rate = 10,
        position = bcplayer ? player._position : player.player2._playlist._position,
        new_val = direction == 'forward' ? position + seek_rate : position - seek_rate;

  // jumps to the second passed in, skips to next track if at end
  if (bcplayer) bcplayer._playlist._player.seek(new_val);
  if (colplayer) colplayer.player2._playlist.seek(new_val);
}