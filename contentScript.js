import { set_prefs, bindControlKeys } from './modules/shared.js';
import { replaceFunctions } from './modules/overrides.js';
import { addFunctions, catchErrors } from './modules/player.js';
import { FeedPlaylist, initFeedPlaylist } from './modules/feed.js';
import { loadCollection } from './modules/profile.js';

/***************************
  * BANDCAMP STREAMER      *
  * by A Flow of Code      *
  * github.com/aflowofcode *
  **************************/
(function(window, document) {

  // Don't bother initializing on pages where BCS is not applicable
  // 404 "that something isn't here"
  if (window.gplayerviews == undefined) return;

  const bcplayer = window.playerview,
        colplayer = window.collectionPlayer,
        albumplayer = window.gplayerviews[0] ? window.gplayerviews[0]._playlist._player : false,
        jQuery = window.jQuery,
        pagedata = jQuery("#pagedata").data("blob");

  // band album index (.../music) -> gplayerviews == [] and other players are undefined
  if (!bcplayer && !colplayer && !albumplayer) return;

  set_prefs();

  // using more globals due to split into modules
  // TODO: these should be namespaced
  window.bcplayer = bcplayer;
  window.colplayer = colplayer;
  window.pagedata = pagedata;
  // record original document title for updating with track/artist
  window.originalTitle = window.document.title;

  /*
    some useful functions
    colplayer.player2.currentTrackIndex()
    colplayer.player2.currentTracklist()
    colplayer.player2.currentState()      -> "idle", "paused", "playing"
    colplayer.player2.showPlay()          -> true if play button showing (means not playing)
  */

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
    console.log('initial tab:', tab);

    // save these to listen for switching playlists later
    if (wishTab) {
      wishTab.id = 'wishtab';
      window.wishTab = wishTab;
    }
    collectionTab.id = 'collectiontab';
    window.collectionTab = collectionTab;

    if (tab !== 'wishlist' && tab !== 'collection') {
      if (wishTab) wishTab.addEventListener('click', tabClicked);
      collectionTab.addEventListener('click', tabClicked);
    } else {
      loadCollection(tab);
    }
  } else if (bcplayer) {
    console.log('feed init');
    catchErrors(bcplayer._playlist._player._html5player, 'feed');
    bcplayer.feed_playlist = [];
  }

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
  }

  /**********************************************************
   ********** FEED FUNCTIONS ********************************
   **********************************************************/

  window.originalPlaylist = bcplayer ? bcplayer._playlist._playlist : '';
  window.releasePlaylist = [];
  window.releasePlaylistLength = 0;
  window.currentList = 'feed';
  window.nowPlaying = document.getElementById('track_play_waypoint');

  // init feed player
  initFeedPlaylist(FeedPlaylist);  
  window.feedPlayer = bcplayer ? new FeedPlaylist(bcplayer, originalPlaylist) : false; 

  bindControlKeys({
    bcplayer,
    colplayer,
    albumplayer
  });
  
})(window, document);