import { updateTracklists, getItemKey } from './profile.js';
import { togglePlayButtons, setCurrentEl } from './player.js';

/**
 * Replace existing Bandcamp functions with modified versions
 * @param {window.collectionPlayer} colplayer - BC's collection/wishlist player
 */
export function replaceFunctions(colplayer) {
  console.log('replacing functions');
  const self = colplayer.player2,
        origPlayPause = self.playPause;
  
  /** 
   * Loads the specified track from the playlist in the player
   * goToTrack() calls this then immediately plays the track
   * @param {number} index - Track position in the playlist array
   * @returns {boolean}
   */
  self.setCurrentTrack = function(index) {
    self.currentTrackIndex(index);
    let newTrack = self.currentTrack();
    if (!newTrack) return false;
    console.log(`Loading track at ${colplayer.currentPlaylist} playlist index`, index, newTrack);

    // el is the <li> in the main collection grid with the album art, etc
    // <li id="<domId>" ...>  
    let el = document.getElementById(newTrack.domId),
        itemKey = getItemKey(el);
    // console.log("domId:", newTrack.domId, el);
    console.log('last el', colplayer.lastEl?.id, 'current el', el.id);

    /*
      If dom item previously appeared in non-search grid (& probably vice versa), 
      it will now exist twice in the DOM (with the same id).
      The 2nd one, which is now being displayed, will no longer have its buttons toggled
      unless we figure out which one is currently being displayed.
      Toggling all existing elements is just a bandaid
      TODO: determine which is visible, toggle it, & make sure the transport points to it
      (since transport album art also has the wrong one now, & scrolls to bottom of page looking for it)
    */
    const item_instances = document.querySelectorAll(`#${newTrack.domId}`);
    if (item_instances.length > 1) {
      console.log(`item ${newTrack.domId} appears multiple times`, item_instances.length);
      item_instances.forEach(instance => togglePlayButtons({item: instance, is_playing: true}));
    } else {
      togglePlayButtons({item: el, is_playing: true});
    }

    self._playlist.load([newTrack.trackData]);
    self.duration(self._playlist.duration());
    setCurrentEl(el);
    // currentItemKey() is a built-in which returns the DOM item's data-tralbumtype + data-itemid
    colplayer.currentItemKey(itemKey);

    // set play button on previous item
    const prev_item_instances = document.querySelectorAll(`#${colplayer.lastEl?.id}`);
    if (prev_item_instances?.length > 1) {
      console.log(`prev item ${colplayer.lastEl.id} appears multiple times`, prev_item_instances.length);
      prev_item_instances.forEach(instance => togglePlayButtons({item: instance, is_playing: false}));
    } else {
      togglePlayButtons({item: colplayer.lastEl, is_playing: false});
    }

    colplayer.lastEl = el;
    window.document.title = `${self.currentTrack().trackTitle} by ${self.currentTrack().trackData.artist} | ${window.originalTitle}`;
    return true;
  };

  /*
    Have to override prev/next because currentTrackIndex returns a STRING and orig code 
    just tacked a 1 onto it - eg going from index 2 ended up with 21 instead of 3.
    Additionally need to check if list needs updating before continuing.
  */
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
    console.log('playPause override triggered', self.currentState());

    // paused here means it's about to play
    if (self.currentState() == "paused" & self.currentTrackIndex() == 0) {
      // if playlist has been shuffled/reversed, need to do this or the wrong
      // DOM item (the original first track) will be shown as playing 
      self.setCurrentTrack(0);
    }
    
    let toggled = false;
    if (self.pendingUpdate()) {
      console.log('pending update');
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
  };

  // these overrides needed to allow hooking into state changes
  function evt(event) {
    return "player2." + (self.playerId ? self.playerId + "." : "") + event;
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

  // override to get the total amount of items returned by a search
  FanCollectionAPI.searchItems = function(fanId, searchKey, type) {
      var d = $.Deferred();
      type = type || "folllowers"; // bc code has 3 Ls, not sure if typo or on purpose
      var data$$0 = {
          "fan_id": fanId,
          "search_key": searchKey,
          "search_type": type
      };
      $.post("/api/fancollection/1/search_items", ko.toJSON(data$$0)).then(
        function(data) {
          if (data.error) return d.reject();
          console.log(`found ${data.tralbums.length} search results`);
          // prepare for new search result playlist
          colplayer.searchResults = {};
          colplayer.numSearchResults = data.tralbums.length;
          return d.resolve(
            data.tralbums,
            data.gifts,
            data.tracklists,
            data.redownload_urls,
            data.similar_gift_ids,
            data.item_lookup,
            data.search_key
          );
        },
        function() { return d.reject() }
      );
      return d.promise();
  };
} // replaceFunctions()
