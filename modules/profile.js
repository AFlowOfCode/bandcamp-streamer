import { setCurrentEl, togglePlayButtons, assignTransButtons } from './player.js';
import { observeTotal } from './shared.js';

export function loadCollection(tab) {
  colplayer.isOwner = document.getElementById('fan-banner').classList.contains('owner');
  colplayer.collectionLength = 0; //window.CollectionData.sequence.length;
  colplayer.wishlistLength = 0; //window.WishlistData.sequence.length;
  colplayer.initialTab = tab;
  colplayer.currentTab = tab;
  colplayer.collectionBuilt = false;
  colplayer.wishBuilt = false;

  console.log(`clicked on ${tab} first`);
  let initEl = tab === 'collection' ? buildPlaylists(0,colplayer.isOwner) : 
               tab === 'wishlist'   ? buildWishPlaylist(0) : false;
  setCurrentEl(initEl);

  // check if user expands collection
  let collectionGrid =       document.querySelector('#collection-items .collection-grid'),
      wishlistGrid =         document.querySelector('#wishlist-items .collection-grid');
  if (collectionGrid)        observeTotal('collection', collectionGrid);
  if (wishlistGrid)          observeTotal('wishlist', wishlistGrid);

  // show player on page load
  colplayer.show(true);
  // set up the play buttons on dom items
  replaceClickHandlers();
  // "view all" button to load entire collection/wishlist
  init_true_view_all(tab);

  // monitor collection searches in order to build a search playlist
  // note: search is only available on own profile
  // TODO: separate this callback
  BCEvents.subscribe("fanCollection.grid.newTracklists", function(result) {
    // this event triggers on playlist expansion, but we only want it for actual search results
    if (!colplayer.searchResults) return;
    /* 
      During search, event triggers once per result
      BC pushes each result as a separate playlist 
      to collectionPlayer.tracklists.<result.gridType>
      album art appears in #[collection|wishlist]-search-items .collection-grid
    */

    // console.log('search result', result);
    const result_key = Object.keys(result.newTracklists)[0],
          // .mine class only present on owner's profile
          is_owner = document.getElementById('fan-container')?.classList?.contains('mine');
    colplayer.searchResults[result_key] = collectionPlayer.tracklists[result.gridType][result_key];

    // searchResults reset for each search, along with numSearchResults 
    // in overrides.js FanCollectionAPI.searchItems  
    if (Object.keys(colplayer.searchResults).length === colplayer.numSearchResults) {
      console.log('search complete', colplayer.searchResults);
      colplayer[`${result.gridType}_search_results`] = colplayer.searchResults;

      // hide search results until click handlers are set
      document.querySelector('html').classList.add('search-results-hidden');

      // need to wait for items to show up
      setTimeout(() => {
        const dom_list = document.querySelectorAll('#search-items-container .collection-item-container'),
              playlist_name = `${result.gridType}-search`,
              is_same_tab_search = colplayer.currentPlaylist === playlist_name;

        colplayer[`${result.gridType}_search_playlist`] = [];
        colplayer[`${result.gridType}_search_queue_titles`] = [];

        // if playing from a search playlist then search again, need to reset the playlist
        // or subsequent playlists will be broken
        if (is_same_tab_search) {
          // this needs to be manually loaded after an album is clicked
          colplayer.pending_playlist_name = `${result.gridType}-search`;
          colplayer[`${result.gridType}_search_playlist`] = [];
          colplayer.is_same_tab_search = true;
        }

        // keep track of missing tracks so data-searchnum gets the right index in the wishlist-search playlist
        // this number is incremented in add_to_playlist if a track can't be played
        // then subtracted from the index before setting the attribute
        colplayer.missing_search_tracks = 0;
        console.log(`${result.gridType} search dom list`, dom_list.length, dom_list);

        // trigger playlist build, then switch to it if user plays from it
        for (let i = 0; i < dom_list.length; i++) {
          // console.log('adding search result to playlist', i);
          add_to_playlist({
            dom_list,
            tracklist: colplayer[`${result.gridType}_search_results`],
            playlist: colplayer[`${result.gridType}_search_playlist`],
            title_list: colplayer[`${result.gridType}_search_queue_titles`],
            list_name: playlist_name,
            index: i,
            is_owner
          }); 
        }
        console.log(`added ${dom_list.length - colplayer.missing_search_tracks} tracks to search result playlist`);
        replaceClickHandlers();
        /* on search playlist, clicking transport album art swaps back to non-search playlist instead of
           just scrolling to the album art - need to store then override BC's normal handler for that event
           to prevent this disruption */
        window.orig_trablumUrlClick_handler = BCEvents.handlers["player2.tralbumUrlClick"][0];
        BCEvents.handlers["player2.tralbumUrlClick"][0] = (item) => {
          const itemContainer = colplayer.currentItemEl();
          Dom.scrollToElement(itemContainer.filter(":visible"), -160);
        };
      }, 1000); // setTimeout
    }
  });

} // loadCollection()

/**
 * Sets player tracklist & queue titles, retaining track position if paused.
 * @param {array} tracklist - array of TrackInfo objects
 * @param {string} name - the name of the playlist (if changing), eg "favorites"
 * @param {array} titles - artist/track strings for queue display, eg ["Artist - Track"]
 */ 
function set_tracklist_and_titles({tracklist, name, titles} = {}) {
  const is_paused = colplayer.player2.currentState() === 'paused',
        {num, position} = get_track_position();
  // console.log('is paused?', is_paused, num, position);

  colplayer.player2.setTracklist(tracklist);      
  if (name) colplayer.currentPlaylist = name;
  // console.log('setting queue titles:', titles);
  setQueueTitles(titles);
  /*
    since playlist stops on switch, need to clear the item key
    otherwise clicking on the same item in the new playlist
    will instead play the first track
  */
  colplayer.currentItemKey('');
  // put transport back to where it was
  if (is_paused) restore_position(num, position);
}

// TODO: combine build playlist functions - need serious refactoring
export function buildPlaylists(index, isOwner) {
  console.log('building playlists, index:',index, 'is owner:', isOwner);
  // index is 0 on first run, > 0 when collection view expanded
  if (index === 0) colplayer.col_missing = 0;
  const is_playing = !colplayer.player2.showPlay();
  let items = document.querySelectorAll('#collection-items .collection-item-container'),
      collectionPlaylist = index === 0 ? [] : colplayer.collectionPlaylist.slice(),
      albumPlaylist =      index === 0 || !isOwner ? [] : colplayer.albumPlaylist.slice(),
      queueTitles =        index === 0 ? [] : colplayer.queueTitles.slice(),
      albumQueueTitles =   index === 0 || !isOwner ? [] : colplayer.albumQueueTitles.slice();

  // build collection & album playlists
  for (let i = index; i < items.length; i++) {   
    add_to_playlist({
      dom_list: items,
      tracklist: colplayer.tracklists.collection,
      playlist: collectionPlaylist,
      album_playlist: albumPlaylist,
      title_list: queueTitles,
      album_title_list: albumQueueTitles,
      list_name: 'collection',
      index: i,
      is_owner: isOwner
    }); 
    if (items[i].getAttribute('data-trackid')) {
      // col_missing is incremented in add_to_playlist
      items[i].setAttribute('data-tracknum', i - colplayer.col_missing); 
    }
  } // end collection/album tracklist builder loop 

  if (isOwner) {
    // only immediately update if not playing to avoid stopping current song 
    // if this is an update vs first build
    if (!is_playing) {
      console.log("not playing:", colplayer.currentPlaylist);
      // only set to album playlist if first time or still on albums
      if ((index === 0 && colplayer.currentPlaylist === undefined) || colplayer.currentPlaylist === 'albums') {
        colplayer.player2.setTracklist(albumPlaylist);
        colplayer.currentPlaylist = 'albums';
      } else {
        // favorites
        colplayer.player2.setTracklist(collectionPlaylist);
      }
    } else {
      console.log('collection pending update');
      colplayer.pendingUpdate = true;
    }
    // these have to be available for switch_playlists
    colplayer.albumPlaylist = albumPlaylist;
    colplayer.albumQueueTitles = albumQueueTitles;
    // if (colplayer.currentPlaylist === 'wish' && !colplayer.player2.showPlay()) {
    if (is_playing) {
      // don't change the queue
      console.log('not changing queue yet');
    } else {
      setQueueTitles(colplayer.currentPlaylist === 'albums' ? albumQueueTitles : queueTitles);
      colplayer.currentItemKey('');
    }
    // not owner
  } else {
    if (!is_playing) {
      console.log("not playing & not owner");
      set_tracklist_and_titles({
        tracklist: collectionPlaylist, 
        name: 'favorites', 
        titles: queueTitles
      });
    } else {
      colplayer.pendingUpdate = true;
    }      
  }
  colplayer.queueTitles = queueTitles;
  colplayer.collectionPlaylist = collectionPlaylist;
  colplayer.collectionBuilt = true;
  colplayer.collectionLength = items.length;

  // allow switching between full albums & favorite tracks
  if (index === 0 && !is_playing) {
    // initialize playlist - defaults to albums for owner, otherwise favorites
    switch_playlists({init: true}); 
    // always switch playlists if nothing played yet & tab clicked
    window.collectionTab.addEventListener('click', () => {
      if (colplayer.player2.showPlay()) {
        switch_playlists({switch_to: isOwner ? 'albums' : 'favorites'});
      }
    });
  }

  replaceClickHandlers();  
  return items[0];
}

// items aren't loaded until user clicks wishlist tab (or loads on /wishlist)
export function buildWishPlaylist(index) {
  console.log('building wish playlist, starting index:', index);
  if (index === 0) colplayer.wish_missing = 0;
  let wishItems = document.querySelectorAll('#wishlist-items .collection-item-container'),
      wishPlaylist =       index === 0 ? [] : colplayer.wishPlaylist.slice(),
      wishQueueTitles =    index === 0 ? [] : colplayer.wishQueueTitles.slice(),
      fave_switcher = document.getElementById('playlist-switcher');

  if (wishItems.length === 0) return;
  if (fave_switcher) fave_switcher.classList.add('hidden');

  for (let i = index; i < wishItems.length; i++) {
    add_to_playlist({
      dom_list: wishItems,
      tracklist: colplayer.tracklists.wishlist,
      playlist: wishPlaylist,
      title_list: wishQueueTitles,
      list_name: 'wish',
      index: i
    });
    if (wishItems[i].getAttribute('data-trackid')) {
      // wish_missing is incremented in add_to_playlist
      wishItems[i].setAttribute('data-tracknum', i - colplayer.wish_missing);
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
    switch_playlists({init: true, switch_to: 'wish'});
    setQueueTitles(wishQueueTitles);
  } else {
    if (index === 0) {
      window.wishTab.addEventListener('click', () => {
        if (colplayer.player2.showPlay()) {
          switch_playlists({init: false, switch_to: 'wish'});
        }
      });
    }
    if (colplayer.player2.showPlay()) {
      // wish not loaded first, nothing playing
      switch_playlists({init: false, switch_to: 'wish'});       
    } else if (colplayer.currentPlaylist === 'wish') {
      console.log('wishlist pending update');
      let status = document.querySelector('#playlist-status');
      if (status) status.innerText = '(pending update)';
      colplayer.pendingWishUpdate = true;
    }  
  }
  replaceClickHandlers();  
  return wishItems[0];
}

// add track to playlist & queue titles list
function add_to_playlist({
  dom_list, tracklist, playlist, album_playlist=[], 
  title_list, album_title_list=[], list_name, index, is_owner=false
} = {}) {
  const item_id = dom_list[index].getAttribute('data-itemid'),
        dom_id = dom_list[index].id,
        // these data objects contain the sequential keys of every item available
        item_key = list_name.indexOf('search') > -1 ? getItemKey(dom_list[index]) :
                   list_name.indexOf('wish') > -1 ? window.WishlistData.sequence[index] :
                   window.CollectionData.sequence[index],
        fave_node = dom_list[index].querySelector('.fav-track-link'),
        is_subscriber_only = dom_list[index].classList.contains('subscriber-item');
  
  // console.log(item_key, tracklist);
  let track = tracklist[item_key] ? tracklist[item_key][0] : undefined;

  // if a favorite track is set use that instead of first track in the set
  if (is_owner && fave_node && list_name.indexOf('search') === -1 && tracklist[item_key]) {
    console.log('found fave track');
    track = tracklist[item_key][+fave_node.href.slice(fave_node.href.indexOf('?t=') + 3) - 1];
  }

  // trackData.title is null when an item has no streamable track
  // dom item data-trackid attribute is "" when no streamable track
  // bc also has a zombie entry for subscriber only items which gets stuck in an endless fetch loop
  let can_push = track && 
                 track.trackData.title !== null && 
                 dom_list[index].getAttribute('data-trackid') &&
                 (is_owner || !is_subscriber_only);
  // console.log('list', list_name, 'can push', can_push);

  if (!can_push) {
    console.log("missing track", item_key, track?.trackData?.title);
    if (list_name === 'wish') {
      colplayer.wish_missing++; 
      console.log('total missing from wish playlist', colplayer.wish_missing);
    } else if (list_name.indexOf('search') > -1) {
      colplayer.missing_search_tracks++;
    } else if (list_name === 'collection') {
      colplayer.col_missing++;
      console.log('total missing from collection playlist', colplayer.col_missing);
    }
  } else if (list_name === 'wishlist-search') {
    dom_list[index].setAttribute('data-searchnum', index - colplayer.missing_search_tracks);
  }

  // owner search should be processed as an album since if searching own collection all album tracks are included
  if (list_name !== 'collection-search' || !is_owner) {
    if (can_push) {
      push_track({track, item_id, dom_id, playlist, title_list, list_name});
    } else {
      console.log(`couldn't find playable track for item ${item_key}`, tracklist[item_key]);
    }
  }

  // build album playlist 
  if (can_push && is_owner && (list_name === 'collection' || list_name === 'collection-search')) {
    let album = tracklist[item_key];
    album_playlist = list_name === 'collection-search' ? playlist : album_playlist;
    album_title_list = list_name === 'collection-search' ? title_list : album_title_list;
    dom_list[index].setAttribute('data-firsttrack', album_playlist.length);

    if (album.length >= 1) {
      album.forEach((t) => {
        push_track({
          track: t,
          item_id,
          dom_id,
          playlist: album_playlist,
          title_list: album_title_list,
          list_name: list_name === 'collection-search' ? 'collection-search' : 'albums'
        });
      });
    }
    console.log(`pushed album ${album[0].title} by ${album[0].trackData.artist}, playlist length now ${album_playlist.length}`);
  }
}

function push_track({track, item_id, dom_id, playlist, title_list, list_name} = {}) {
  track.itemId = item_id;
  track.domId = dom_id;
  playlist.push(track);
  title_list.push(`${track.trackData.artist} - ${track.trackData.title}`);
  // console.log(`pushed ${track.trackData.artist} - ${track.trackData.title} to ${list_name} playlist`);
}

// place_in_dom used if missing
export function create_shuffler({place_in_dom=false} = {}) {
  const queueHeader = document.querySelector('.queue-header h2'),
        shuffler = document.createElement('span');
  if (!queueHeader) return;
  // console.log('creating shuffler, might attach to', queueHeader);
  shuffler.id = 'shuffler';
  if (place_in_dom) {
    queueHeader.appendChild(shuffler);
    shuffler.innerText = '🔀 (shuffle!)';
    shuffler.addEventListener('click', () => colplayer.shuffle());
  }
  return shuffler;
}

function switch_playlists({init=false, switch_to} = {}) {
  const switch_from = colplayer.currentPlaylist;
  console.log('switching playlists, init:', init, 'switching to', switch_to, 'from', switch_from);

  // replace the overridden handler for search playlist transport album art click with the original 
  if (switch_from?.indexOf('search') > -1) {
    // console.log('replacing trablumurlclick handler & shuffler');
    BCEvents.handlers["player2.tralbumUrlClick"][0] = window.orig_trablumUrlClick_handler;
  }

  // unshuffle
  if (colplayer.isShuffled) colplayer.shuffle(); 
  let queueHeader = document.querySelector('.queue-header h2');

  if (init) {
    let switcher = document.createElement('a'),
        status = document.createElement('p'),
        parent = document.querySelector('#collection-player .controls-extra'),
        startList = colplayer.isOwner ? 'albums' : 'favorites',
        header = document.createElement('span'),
        shuffler = create_shuffler();

    header.id = 'playlist-header';
    header.innerText = startList;
    shuffler.innerText = '🔀 (shuffle!)';

    status.id = 'playlist-status';
    status.title = 'the playlist will update between tracks to preserve continuity and avoid disrupting the currently playing track';
    status.style.marginTop = '0';
    status.style.marginRight = '10px';
        
    // if only 1 track in tab there won't be a playlist queue (or #playlist-header below)
    if (queueHeader) {
      queueHeader.innerText = 'now playing ';
      queueHeader.appendChild(header);
      // can only shuffle own collection & wishlist
      if (colplayer.isOwner) queueHeader.appendChild(shuffler);
    }

    // only owners have full albums & can shuffle
    if (colplayer.isOwner) {
      // switcher.href = '#';
      // switcher.setAttribute('onclick','return false;');
      switcher.id = 'playlist-switcher';
      switcher.style.marginRight = '10px';
      switcher.innerText = 'Switch to favorite tracks';
      parent.prepend(switcher);
      switcher.addEventListener('click', () => switch_playlists({switch_to: 'favorites'}));
      document.getElementById('shuffler').addEventListener('click', () => colplayer.shuffle());
    }
    parent.prepend(status);
    
    // init was sent from wish tab
    if (switch_to === 'wish') switch_playlists({switch_to: 'wish'});

  } else {
    let switcher = document.getElementById('playlist-switcher'),
        header = document.getElementById('playlist-header'),
        // this may be null at first if switching from playlist with only one track
        shuffler = document.getElementById('shuffler');
    if (switch_to === 'wish') {
      set_tracklist_and_titles({
        tracklist: colplayer.wishPlaylist, 
        name: 'wish', 
        titles: colplayer.wishQueueTitles
      });
      if (header) header.innerText = 'wishlist';
      if (colplayer.isOwner) {
        switcher.innerText = '';
        if (!shuffler) shuffler = create_shuffler({place_in_dom: true});
        shuffler.classList.remove('hidden');
      }
    } else if (switch_to.indexOf('search') > -1) {
      const search_type = switch_to.split('-')[0];
      console.log('search result tracklist', switch_to, colplayer[`${search_type}_search_playlist`]);
      colplayer.player2.setTracklist(colplayer[`${search_type}_search_playlist`]);
      setQueueTitles(colplayer[`${search_type}_search_queue_titles`]);
      colplayer.currentPlaylist = switch_to;
      if (header) header.innerText = 'search results';
      if (colplayer.isOwner) {
        switcher.innerText = '';
        if (shuffler) shuffler.classList.add('hidden');
      } 
    } else {        
      // default to favorites when switching from wish or search
      const other_playlists = ['albums', 'wish', 'search'];
      if (other_playlists.indexOf(colplayer.currentPlaylist) > -1 || !colplayer.isOwner) {
        set_tracklist_and_titles({
          tracklist: colplayer.collectionPlaylist, 
          name: 'favorites', 
          titles: colplayer.queueTitles
        });
        if (header) header.innerText = 'favorite tracks';
        if (colplayer.isOwner) switcher.innerText = 'Switch to full albums';
      } else {
        console.log('current playlist:', colplayer.currentPlaylist);
        set_tracklist_and_titles({
          tracklist: colplayer.albumPlaylist, 
          name: 'albums', 
          titles: colplayer.albumQueueTitles
        });
        if (header) header.innerText = 'albums';
        switcher.innerText = 'Switch to favorite tracks';
      }
      /*
        create / unhide shuffler after switching into faves or album
        this needs to be done after everything loaded into the queue
        or there won't be a queue header
      */
      if (colplayer.isOwner) {
        if (!shuffler) shuffler = create_shuffler({place_in_dom: true});
        shuffler.classList.remove('hidden');
      }
    }      
  }
}

export function setQueueTitles(titles){
  console.log('updating queue to # titles', titles.length);
  let queue = document.querySelectorAll('.queue li > .info');
  queue.forEach(function(item, index){
    item.innerText = `${index+1}. ${titles[index]}`;
  });
  if (colplayer.pendingUnshuffle) {
    colplayer.pendingUnshuffle = false;
    console.log('post update shuffler click');
    document.getElementById('shuffler').click();
  }
}

function get_track_position() {
  const position = colplayer.player2.position(),
        num      = +colplayer.player2.currentTrackIndex();
  console.log(`track ${num} position:`, position);
  return {position, num};
}

function restore_position(num, position) {
  colplayer.player2.setCurrentTrack(num);
  colplayer.player2._playlist.seek(position);
  colplayer.player2._playlist._player.pause();
}

// updates the current playlist with any new items added to the page while scrolling
export function updateTracklists(num) {
  const status    = document.querySelector('#playlist-status'),
        is_faves  = colplayer.currentPlaylist === 'favorites',
        cur_track = get_track_position();
  let   position  = false;
      
  // no status on non-owner collections
  if (status) status.innerText = '';

  // if num not passed in, not changing tracks
  if (!num && colplayer.player2.currentState() === 'paused') {
    console.log('maintaining position while paused during update');
    position = cur_track.position;
    num = cur_track.num;
  }
  console.log('updating tracklist while nothing is playing, will resume at', num);

  if (colplayer.pendingUpdate) {
    set_tracklist_and_titles({
      tracklist: is_faves ? colplayer.collectionPlaylist : colplayer.albumPlaylist, 
      titles: is_faves ? colplayer.queueTitles : colplayer.albumQueueTitles
    });
    colplayer.pendingUpdate = false;
  } else if (colplayer.pendingWishUpdate) {
    set_tracklist_and_titles({
      tracklist: colplayer.wishPlaylist, 
      titles: colplayer.wishQueueTitles
    });
    colplayer.pendingWishUpdate = false;
  }    

  console.log(`updated ${colplayer.currentPlaylist}`);

  if (position) {
    restore_position(num, position);
  } else if (num) colplayer.player2.goToTrack(num);
}

function replaceClickHandlers(){
  console.log('replacing click handlers');
  const players = document.getElementsByClassName('track_play_auxiliary'),
        html = document.querySelector('html');
  console.log(`found ${players.length} playables, first:`, players[0]);
  Array.from(players).forEach((player) => {
    player.addEventListener('click', playerHandler);
  });
  // prevent clicking any items before playlist is set up
  html.classList.remove('search-results-hidden');
}

function playerHandler(ev) {
  ev.stopPropagation();
  console.log('clicked on', ev.target);

  if (colplayer.is_same_tab_search) {
    console.log(`updating ${colplayer.pending_playlist_name} with new results`);
    switch_playlists({switch_to: colplayer.pending_playlist_name});
    colplayer.is_same_tab_search = false;
  }

  console.log('playing track itemkey:', colplayer.currentItemKey(), 'current playlist', colplayer.currentPlaylist);
  let item = ev.target.closest(".collection-item-container"),
      grid = ev.target.closest(".collection-grid"),
      gridType = grid.closest('#search-items-container') ? 'search' :
                 grid.getAttribute('data-ismain') === 'true' ? 'collection' :
                 grid.getAttribute('data-iswish') === 'true' ? 'wish' :
                 grid.getAttribute('data-isgiftsgiven') === 'true' ? 'gifts_given' :
                 'hidden',
      is_wish_search = gridType === 'search' && grid.closest('#wishlist-search-grid'),
      is_collection_search = gridType === 'search' && grid.closest('#collection-search-grid');

  // need to set grid & deal with playlist switching before below
  if (gridType === 'wish' && colplayer.currentPlaylist !== 'wish') {
    switch_playlists({switch_to:'wish'});
  } else if (gridType === 'collection' && ['albums', 'favorites'].indexOf(colplayer.currentPlaylist) === -1) {
    // default to favorites if switching out of wish or search
    switch_playlists({switch_to: 'favorites'});
  } else if (is_wish_search && colplayer.currentPlaylist !== 'wishlist-search') {
    switch_playlists({switch_to: 'wishlist-search'});
  } else if (is_collection_search && colplayer.currentPlaylist !== 'collection-search') {
    switch_playlists({switch_to: 'collection-search'});
  }

  let tracknum = colplayer.isShuffled ? item.getAttribute('data-shufflenum') :
                 colplayer.currentPlaylist === 'favorites' || colplayer.currentPlaylist === 'wish' ? item.getAttribute('data-tracknum') :
                 // only wish search uses data-searchnum attr 
                 colplayer.currentPlaylist === 'wishlist-search' && is_wish_search ? item.getAttribute('data-searchnum') :
                 item.getAttribute('data-firsttrack'),          
      itemKey = getItemKey(item);

  console.log('got tracknum', tracknum);
  console.log(`clicked on itemKey: ${itemKey}, is ${colplayer.currentItemKey()}?`, itemKey === colplayer.currentItemKey());

  if (item.classList.contains("no-streaming")) return;

  if (itemKey === colplayer.currentItemKey()) {
    console.log('item playpausing', colplayer.player2.currentState());
    togglePlayButtons({item});
    colplayer.player2.playPause();
    return;
  }
  console.log('clicked on dif track, setting correct track', tracknum, item);
  colplayer.player2.stop();
  if (colplayer.player2.pendingUpdate()) updateTracklists();
  setCurrentEl(item); 
  console.log(item);
  colplayer.currentItemKey(itemKey);
  colplayer.currentGridType(gridType);
  
  colplayer.player2.goToTrack(tracknum);
  console.log('player state after goToTrack:', colplayer.player2.currentState());
  assignTransButtons(); // this should happen after first ever play on page
}

/**
 * Parses the unique identifier from the DOM element for a set of tracks
 * colplayer.tracklists.<grid>[itemKey] is an array containing all the track objects
 * for an item. If key is for an album, will contain all tracks in that album, otherwise
 * will contain a single track. 
 * @param {DOMnode} item - the <li> node for an item in the collection
 * @returns {string} eg: t790236 
 */ 
export function getItemKey(item) {
  let itemId = item.getAttribute("data-itemid"),
      itemType = item.getAttribute("data-itemtype").slice(0, 1),
      itemKey = itemType + itemId;
  // console.log('got item key', itemKey);
  return itemKey;
}

/**
 * Sets the "view all" items button to load entire collection / wishlist
 * @param {string} tab_name - eg 'collection'
 */
export function init_true_view_all(tab_name) {
  const unloaded_tracks = CollectionGrids[tab_name].itemCount - CollectionGrids[tab_name].sequence.length;
  // only modify buttons if enough unloaded items to warrant it
  if (unloaded_tracks <= 20) return;

  const btn_wrap = document.querySelector(`#${tab_name}-items .show-button`),
        show_btn = btn_wrap.querySelector('.show-more'),
        show_btn_clone = show_btn.cloneNode(true);

  show_btn.innerText = 'View 20 more';
  show_btn_clone.innerText = 'View ALL items';
  show_btn_clone.title = 'Be patient if there are a lot!';
  btn_wrap.appendChild(show_btn_clone);
  show_btn_clone.addEventListener('click', () => load_more_items(tab_name));
}

function load_more_items(tab_name) {
  const html = document.querySelector('html'),
        status = document.querySelector('#playlist-status');
  let   still_more = CollectionGrids[tab_name].sequence.length < CollectionGrids[tab_name].itemCount;
  // batchSize is how many it loads at once - too many & browser has trouble, too little & it takes too long
  // default is 20
  CollectionGrids[tab_name].batchSize = 250;
  if (still_more) {
    html.classList.add('loading');
    if (status) status.innerText = 'Loading... be patient if there are a lot of items!';

    CollectionGrids[tab_name].paginate().then((res) => {
      // res = the array of items
      // res[n].also_collected_count = num collections it appears in
      // console.log('done loading, response:', res);
      still_more = CollectionGrids[tab_name].sequence.length < CollectionGrids[tab_name].itemCount;
      console.log('loaded', CollectionGrids[tab_name].sequence.length, 'of', CollectionGrids[tab_name].itemCount, 'still more?', still_more);
      load_more_items(tab_name);
    });
  } else {
    html.classList.remove('loading');
    if (status) status.innerText = '';
  }
}