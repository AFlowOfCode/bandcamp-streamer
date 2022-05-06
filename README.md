<div align="center">
<img src='bandcamp-streamer.jpg?raw=true' alt='promo image'>
</div>

# Bandcamp Streamer
Browser extension for Chrome & Firefox developed by A Flow of Code.

Chrome: [https://chrome.google.com/webstore/detail/bandcamp-streamer/hopclencgmfjiipjmlenfcdgcdblfmjh](https://chrome.google.com/webstore/detail/bandcamp-streamer/hopclencgmfjiipjmlenfcdgcdblfmjh)

Firefox: [https://addons.mozilla.org/en-US/firefox/addon/bandcamp-streamer/](https://addons.mozilla.org/en-US/firefox/addon/bandcamp-streamer/)

### Stream uninterrupted from various bandcamp pages
  * Feed
  * Personal collection / wishlist
  * Any other fan's collection / wishlist

### General features
  * Volume control
  * Spacebar play/pause, L/R arrow keys to skip to previous/next track in the playlist
  * Beta: Load entire collections & wishlists in one click (be patient if there are a lot of items!)
      
### Feed page features 
  * Nonstop streaming from 2 separate playlists: fan activity or new releases
  * Price listed next to "buy now"
  
### Personal (owned) collection page features
  * Stream full albums continuously (moves onto next album after finishing) 
  * Stream a playlist of your favorite track from each release (plays first track from album if favorite not set)
  * Shuffle either album or favorites playlist 
  * Continuous streaming of search results (full albums only)

### Wishlist page features
  * Stream all tracks continuously
  * Shuffle wishlist tracks
  * Continuous streaming of search results

### Known issues
  * If the collection/wishlist playlist has been shuffled when more tracks are added, it becomes unshuffled and playback stops. It is recommended to load all the desired tracks to the page first, then shuffle and start the playlist.  
  * If you are playing from collection/wishlist search results & click to another tab, the current track will continue playing but the playlist will be lost.  
  * If an item has been displayed in both collection or wishlist tab & the tab's search results, clicking on the item in the bottom player bar won't scroll to the correct location.  
  * Loading entire collections/wishlists with over ~1000 items may be buggy

### What this extension does not do
  * Allow you to add a full album to your wishlist and then stream the whole thing. Playing only the first or featured track of an album in your wishlist is a Bandcamp limitation that this extension does not try to circumvent. You can do two things: support the artist and buy the album (best option for full flexibility + cool factor), or add each individual track from the album to your wishlist if possible. 
  * Attempt to track you or any of your data in any way, or communicate with any third parties for any reason. This is a 100% privacy respecting extension.

### Support development
  * If you appreciate the extension, consider showing some support! Please leave a rating and some feedback, it's always motivating to hear from people who enjoy and find it useful. Suggestions and bug reports are always welcome, preferably on Github.

  * Any donation no matter how small is appreciated. Much like making music, writing browser extensions is often a labor of love with little to no financial benefits in return for a lot of heart and effort.

  * https://www.paypal.me/aflowofcode
  * BTC: 1Juw5ZBdWujAYErTqGd6DwU48xL7HnnF6T
  * ETH: 0x54e0beAAF0fA4858e9671aCcDEb4d5C4d4f41f95
  * BCH: bitcoincash:qpaw45z4w4pudgdtevh5ysrwyf0xkmrq4cv69zjhc9

### Changelog

##### 1.4.0
  * Bind L/R arrow keys to previous/next track on regular album pages
  * Fix incorrect shuffler text after switching from shuffled playlist
  * Fix inherently unplayable DOM item breaking collection playlist

##### 1.3.3
  * Fix pause then unpause on feed starting playlist over
  * Handle duplicate tracks in initial feed batch

##### 1.3.2
  * Fix error on owner collection with unplayable item

##### 1.3.1
  * Fix error when recovered feed track needs to be added to end of playlist  

##### 1.3.0
  * Button to load entire collection/wishlist at one time  
  * Playlists for collection/wishlist search results  
  * Add icons for shuffle/unshuffle    
  * Fix playlist switch error when only 1 track in collection or wishlist  
  * Fix duplicate tracks in feed breaking playlist order & item play buttons

##### 1.2.2
  * Put track artist & title first in browser tab name for quick visibility  
  * Fix collection playlist hanging on other users' subscriber only items  
  * Fix rare condition where tracks not added to playlist after clicking "view all" on collection/wishlist

##### 1.2.1
  * Fix issue with pausing by clicking on album art and unexpected playlist halting in a couple scenarios

##### 1.2  
  * Shuffle for wishlist  
  * New icon

## Trademarks

Bandcamp and [Bandcamp.com](http://www.bandcamp.com) are Copyright © Bandcamp, Inc.