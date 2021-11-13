import { setCurrentEl, getItemKey, togglePlayButtons } from './player.js';
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
  let collectionGrid = document.querySelector('#collection-items .collection-grid'),
      wishlistGrid = document.querySelector('#wishlist-items .collection-grid');
  if (collectionGrid) observeTotal('collection', collectionGrid);
  if (wishlistGrid) observeTotal('wishlist', wishlistGrid);

  colplayer.show(true);

  // show transport on page load
  // but will stop any other currently playing tabs
  // colplayer.player2._playlist.play(); 
  // colplayer.player2._playlist.playpause(); 
  
  replaceClickHandlers();
}

function assignTransButtons() {
  // these get manipulated depending on play state
  colplayer.transPlay = document.querySelector('#collection-player .playpause .play');
  colplayer.transPause = document.querySelector('#collection-player .playpause .pause');
}

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
    const id = items[i].getAttribute('data-itemid'),
          domId = items[i].id,
          // this contains the sequential keys of every item available
          key = window.CollectionData.sequence[i],
          fave_node = items[i].querySelector('.fav-track-link'),
          is_subscriber_only = items[i].classList.contains('subscriber-item');

    // check for a favorite track
    let track;
    if (isOwner) {
      if (fave_node) {
        console.log('found fave track');
        track = colplayer.tracklists.collection[key][+fave_node.href.slice(fave_node.href.indexOf('?t=') + 3) - 1];
      } else {
        track = colplayer.tracklists.collection[key] ? colplayer.tracklists.collection[key][0] : false;
      } 
    } else {
      track = colplayer.tracklists.collection[key] ? colplayer.tracklists.collection[key][0] : false;
    }

    // trackData.title is null when an item has no streamable track
    // bc also has a zombie entry for subscriber only items which gets stuck in an endless fetch loop
    let canPush = track && track.trackData.title !== null && !is_subscriber_only;

    // build collection playlist
    if (canPush) {        
      console.log(`pushing ${track.trackData.artist} - ${track.trackData.title}`);
      track.itemId = id;
      track.domId = domId;
      collectionPlaylist.push(track);
      queueTitles.push(`${track.trackData.artist} - ${track.trackData.title}`);
      items[i].setAttribute('data-tracknum', i);
    } else {
      console.log(`couldn't find playable track for item ${key}`, colplayer.tracklists.collection[key]);
    }
    // build album playlist 
    if (isOwner && canPush) {
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
    if (colplayer.currentPlaylist === 'wish' && !colplayer.player2.showPlay()) {
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
        
    queueHeader.innerText = 'now playing ';
    queueHeader.appendChild(header);

    // only shuffle own collection & wishlist
    if (colplayer.isOwner) queueHeader.appendChild(shuffle);

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
        // shuffler.style.display = 'none'; // no shuffle on wishlist
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
        console.log('current playlist:', colplayer.currentPlaylist);
        colplayer.player2.setTracklist(colplayer.albumPlaylist);
        setQueueTitles(colplayer.albumQueueTitles);
        colplayer.currentPlaylist = 'albums';
        header.innerText = 'albums';
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