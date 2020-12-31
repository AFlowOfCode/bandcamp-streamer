import { bindControlKeys, observeTotal } from './modules/shared.js';
import { replaceFunctions, addFunctions, catchErrors } from './modules/player.js';
import { FeedPlaylist, initFeedPlaylist, setPrice, bindPlayButtons, checkDuplicates } from './modules/feed.js';
import { loadCollection } from './modules/profile.js';

/***************************
  * BANDCAMP STREAMER      *
  * by A Flow of Code      *
  * github.com/aflowofcode *
  **************************/
console.log('bandcamp streamer!');

(function(window, document) {

  const bcplayer = window.playerview,
        colplayer = window.collectionPlayer,
        albumplayer = window.gplayerviews[0] ? window.gplayerviews[0]._playlist._player : false,
        jQuery = window.jQuery,
        pagedata = jQuery("#pagedata").data("blob");

  // using more globals due to split into modules
  // TODO: these should be prefixed or otherwise encapsulated
  window.bcplayer = bcplayer;
  window.colplayer = colplayer;
  window.pagedata = pagedata;

  // some useful functions
  // colplayer.player2.currentTrackIndex();
  // colplayer.player2.currentTracklist();
  // colplayer.player2.currentState();
  // "idle", "paused", "playing"
  // colplayer.player2.showPlay(); 
  // true if play button showing (means not playing)

  // list all access keys & track titles in console
  // for (key in colplayer.tracklists.collection) {console.log(`${key}: ${colplayer.tracklists.collection[key][0].trackTitle}`);}

  if (!bcplayer && colplayer) {
    // on collection page & need to modify some of that player's functions + add shuffle
    replaceFunctions(colplayer);
    addFunctions(colplayer);
    catchErrors(colplayer.player2._playlist._player._html5player, 'collection');
    // handle people loading on non wishlist or collection tabs (eg /followers)
    const tab = pagedata.active_tab,
          wishTab = document.querySelector('#grid-tabs > li[data-tab=wishlist]'),
          collectionTab = document.querySelector('#grid-tabs > li[data-tab=collection]');
    if (wishTab) {
      wishTab.id = 'wishtab';
      window.wishTab = wishTab;
    }
    collectionTab.id = 'collectiontab';
    console.log('initial tab:', tab);
    // save these to listen for switching playlists later
    
    window.collectionTab = collectionTab;
    if (tab !== 'wishlist' && tab !== 'collection') {
      function tabClicked(e) {
        e.stopPropagation();
        let targetTab = false,
            epath = e.path || e.composedPath();
        console.log(e);
        for (let i = 0; i < epath.length; i++) {
          if (epath[i].id === 'wishtab') {
            targetTab = 'wishlist';
            break;
          }
        }
        if (!targetTab) targetTab = 'collection';
        collectionTab.removeEventListener('click', tabClicked);
        if (wishTab) wishTab.removeEventListener('click', tabClicked);
        loadCollection(targetTab);
      };
      if (wishTab) wishTab.addEventListener('click', tabClicked);
      collectionTab.addEventListener('click', tabClicked);
    } else {
      loadCollection(tab);
    }
  } else if (bcplayer) {
    console.log('feed init');
    catchErrors(bcplayer._playlist._player._html5player, 'feed');
  }

  /**********************************************************
   ********** FEED FUNCTIONS ********************************
   **********************************************************/

  window.originalPlaylist = bcplayer ? bcplayer._playlist._playlist : '';
  window.feedPlaylist = [];
  window.feedPlaylistLength = undefined;
  window.releasePlaylist = [];
  window.releasePlaylistLength = undefined;
  window.currentList = 'feed';
  window.pausedTrack = undefined;
  window.nowPlaying = document.getElementById('track_play_waypoint');

  // record original document title for updating with track/artist
  window.originalTitle = window.document.title;

  initFeedPlaylist(FeedPlaylist);

  // init feed player
  window.feedPlayer = bcplayer ? new FeedPlaylist(bcplayer, originalPlaylist) : false;   

  bindControlKeys({
    bcplayer: bcplayer,
    colplayer: colplayer,
    albumplayer: albumplayer
  });
  
})(window, document);