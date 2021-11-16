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
      // collectionSearchGrid = document.querySelector('#collection-search-items .collection-grid'),
      wishlistGrid =         document.querySelector('#wishlist-items .collection-grid');
      // wishlistSearchGrid =   document.querySelector('#wishlist-search-items .collection-grid');
  if (collectionGrid)        observeTotal('collection', collectionGrid);
  // if (collectionSearchGrid)  observeTotal('collection-search', collectionSearchGrid);
  if (wishlistGrid)          observeTotal('wishlist', wishlistGrid);
  // if (wishlistSearchGrid)    observeTotal('wishlist-search', wishlistSearchGrid);

  colplayer.show(true);
  
  replaceClickHandlers();

  // monitor collection searches in order to build a searchResultPlaylist
  BCEvents.subscribe("fanCollection.grid.newTracklists", function(result) {
    // this event triggers on playlist expansion, but we only want it for actual search results
    if (!colplayer.searchResults) return;
    console.log('search result', result);
    /* 
      During search, event triggers once per result
      BC pushes each result as a separate playlist 
      to collectionPlayer.tracklists.<result.gridType>
      album art appears in #[collection|wishlist]-search-items .collection-grid
    */
    colplayer.searchResults.push(result.newTracklists);
    // searchResults array reset for each search, along with numSearchResults 
    // in overrides.js FanCollectionAPI.searchItems  
    if (colplayer.searchResults.length === colplayer.numSearchResults) {
      // trigger playlist build, then switch to it if user plays from it
      console.log('search complete');
      colplayer.searchResultPlaylist = [];
      colplayer.searchResults.forEach((result_item) => {
        Object.keys(result_item).forEach((set) => {
          console.log('result set', set);
          colplayer.searchResultPlaylist.push(...collectionPlayer.tracklists[result.gridType][set]);
        });
      });
    }
    // todo: link each track to its DOM item, then switch to playlist when user clicks on one
    // colplayer.player2.setTracklist(colplayer.searchResultPlaylist);
  });

} // loadCollection()

export function buildPlaylists(index, isOwner) {
  console.log('building playlists, index:',index, 'is owner:', isOwner);
  // index is 0 on first run, > 0 when collection view expanded
  let items = document.querySelectorAll('#collection-items .track_play_hilite'),
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
    items[i].setAttribute('data-tracknum', i); 
  } // end collection/album tracklist builder loop 

  if (isOwner) {
    // don't immediately update & stop current song if this is an update
    if (colplayer.player2.showPlay()) {
      console.log("not playing:", colplayer.player2.showPlay(), colplayer.currentPlaylist);
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
    // these have to be available for playlistSwitcher
    colplayer.albumPlaylist = albumPlaylist;
    colplayer.albumQueueTitles = albumQueueTitles;
    // if (colplayer.currentPlaylist === 'wish' && !colplayer.player2.showPlay()) {
    if (!colplayer.player2.showPlay()) {
      // don't change the queue
      console.log('not changing queue yet');
    } else {
      if (colplayer.currentPlaylist === 'albums') {
        setQueueTitles(albumQueueTitles);
      } else {
        setQueueTitles(queueTitles);
      }
    }
    // not owner
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
  if (index === 0 && colplayer.player2.showPlay()) {
    playlistSwitcher(true); // runs init
    // always switch playlists if nothing played yet & tab clicked
    window.collectionTab.addEventListener('click', () => {
      if (colplayer.player2.showPlay()) {
        playlistSwitcher(false, 'collection');
      }
    });
  }

  replaceClickHandlers();  
  return items[0];
}

// items aren't loaded until user clicks wishlist tab (or loads on /wishlist)
export function buildWishPlaylist(index) {
  console.log('building wish playlist, index:', index);
  let wishItems = document.querySelectorAll('#wishlist-items .track_play_hilite'),
      wishPlaylist =       index === 0 ? [] : colplayer.wishPlaylist.slice(),
      wishQueueTitles =    index === 0 ? [] : colplayer.wishQueueTitles.slice();

  if (wishItems.length === 0) return;

  for (let i = index; i < wishItems.length; i++) {
    add_to_playlist({
      dom_list: wishItems,
      tracklist: colplayer.tracklists.wishlist,
      playlist: wishPlaylist,
      title_list: wishQueueTitles,
      list_name: 'wish',
      index: i
    });
    wishItems[i].setAttribute('data-tracknum', i);
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
    if (index === 0) {
      window.wishTab.addEventListener('click', () => {
        if (colplayer.player2.showPlay()) {
          playlistSwitcher(false, 'wish');
        }
      });
    }
    if (colplayer.player2.showPlay()) {
      // wish not loaded first, nothing playing
      playlistSwitcher(false, 'wish');       
    } else {
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
        item_key = list_name.indexOf('wish') > -1 ? window.WishlistData.sequence[index] :
                   window.CollectionData.sequence[index],
        fave_node = dom_list[index].querySelector('.fav-track-link'),
        is_subscriber_only = dom_list[index].classList.contains('subscriber-item');
  
  let track = tracklist[item_key][0];

  // if a favorite track is set use that instead of first track in the set
  if (is_owner && fave_node) {
    console.log('found fave track');
    track = tracklist[item_key][+fave_node.href.slice(fave_node.href.indexOf('?t=') + 3) - 1];
  }

  // trackData.title is null when an item has no streamable track
  // bc also has a zombie entry for subscriber only items which gets stuck in an endless fetch loop
  let can_push = track && track.trackData.title !== null && (is_owner || !is_subscriber_only);
  if (can_push) {
    push_track({track, item_id, dom_id, playlist, title_list, list_name});
  } else {
    console.log(`couldn't find playable track for item ${key}`, tracklist[item_key]);
  }

  // build album playlist 
  if (is_owner && list_name === 'collection' && can_push) {
    let album = tracklist[item_key];
    dom_list[index].setAttribute('data-firsttrack', album_playlist.length);
    if (album.length >= 1) {
      album.forEach((t) => {
        push_track({
          track: t,
          item_id,
          dom_id,
          playlist: album_playlist,
          title_list: album_title_list,
          list_name: 'albums'
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
  console.log(`pushed ${track.trackData.artist} - ${track.trackData.title} to ${list_name} playlist`);
}

function playlistSwitcher(init, switchTo) {
  console.log('switching playlists, init:', init, 'switchTo', switchTo);
  if (colplayer.isShuffled) colplayer.shuffle(); 
  let queueHeader = document.querySelector('.queue-header h2');
  if (init) {
    let switcher = document.createElement('a'),
        status = document.createElement('p'),
        parent = document.querySelector('#collection-player .controls-extra'),
        startList = colplayer.isOwner ? 'albums' : 'favorites',
        header = document.createElement('span'),
        shuffle = document.createElement('span');

    header.id = 'playlist-header';
    header.innerText = startList;
    shuffle.id = 'shuffler';
    shuffle.innerText = '🔀 (shuffle!)';

    status.id = 'playlist-status';
    status.title = 'the playlist will update between tracks to preserve continuity and avoid disrupting the currently playing track';
    status.style.marginTop = '0';
    status.style.marginRight = '10px';
        
    // if only 1 track in tab there won't be a playlist queue (or #playlist-header below)
    if (queueHeader) {
      queueHeader.innerText = 'now playing ';
      queueHeader.appendChild(header);
      // can only shuffle own collection & wishlist
      if (colplayer.isOwner) queueHeader.appendChild(shuffle);
    }

    // only owners have full albums & can shuffle
    if (colplayer.isOwner) {
      // switcher.href = '#';
      // switcher.setAttribute('onclick','return false;');
      switcher.id = 'playlist-switcher';
      switcher.style.marginRight = '10px';
      switcher.innerText = 'Switch to favorite tracks';
      parent.prepend(switcher);
      parent.prepend(status);
      switcher.addEventListener('click', () => playlistSwitcher());
      document.getElementById('shuffler').addEventListener('click', () => colplayer.shuffle());
    }
    
    // init was sent from wish tab
    if (switchTo === 'wish') playlistSwitcher(false, 'wish');

  } else {
    let switcher = document.getElementById('playlist-switcher'),
        header = document.getElementById('playlist-header'),
        shuffler = document.getElementById('shuffler');
    if (switchTo === 'wish') {
      colplayer.player2.setTracklist(colplayer.wishPlaylist);
      setQueueTitles(colplayer.wishQueueTitles);
      colplayer.currentPlaylist = 'wish';
      if (header) header.innerText = 'wishlist';
      if (colplayer.isOwner) switcher.innerText = '';
    } else {        
      // default to favorites when switching from wish
      if (colplayer.currentPlaylist === 'albums' || colplayer.currentPlaylist === 'wish' || !colplayer.isOwner) {
        colplayer.player2.setTracklist(colplayer.collectionPlaylist);
        setQueueTitles(colplayer.queueTitles);
        colplayer.currentPlaylist = 'favorites';
        if (header) header.innerText = 'favorite tracks';
        if (colplayer.isOwner) {
          shuffler.style.display = 'inline-block';
          switcher.innerText = 'Switch to full albums';  
        }
      } else {
        console.log('current playlist:', colplayer.currentPlaylist);
        colplayer.player2.setTracklist(colplayer.albumPlaylist);
        setQueueTitles(colplayer.albumQueueTitles);
        colplayer.currentPlaylist = 'albums';
        if (header) header.innerText = 'albums';
        switcher.innerText = 'Switch to favorite tracks';
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

// updates the current playlist with any new items added to the page while scrolling
export function updateTracklists(num) {
  let status = document.querySelector('#playlist-status'),
      position = false;
  // no status on non-owner collections
  if (status) status.innerText = '';

  if (!num && colplayer.player2.currentState() === 'paused') {
    console.log('maintaining position while paused during update');
    position = colplayer.player2.position();
    num = +colplayer.player2.currentTrackIndex();
  }
  console.log('updating tracklist while nothing is playing, will resume at', num);

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

  if (position) {
    colplayer.player2.setCurrentTrack(num);
    colplayer.player2._playlist.seek(position);
    colplayer.player2._playlist._player.pause();
  } else if (num) colplayer.player2.goToTrack(num);
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
  console.log('playing track itemkey:', colplayer.currentItemKey());
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
      itemKey = getItemKey(item);
  console.log(`clicked on itemKey: ${itemKey}, is ${colplayer.currentItemKey()}?`, itemKey === colplayer.currentItemKey());

  if (item.classList.contains("no-streaming")) return;
  if (itemKey === colplayer.currentItemKey()) {
    console.log('item playpausing');
    togglePlayButtons(item);
    colplayer.player2.playPause();
    return;
  }
  console.log('clicked on dif track, setting correct track', item);
  colplayer.player2.stop();
  if (colplayer.player2.pendingUpdate()) updateTracklists();
  setCurrentEl(item); 
  console.log(item);
  colplayer.currentItemKey(itemKey);
  colplayer.currentGridType(gridType);
  
  colplayer.player2.goToTrack(tracknum);
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
  console.log('got item key', itemKey);
  return itemKey;
}