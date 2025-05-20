<div align="center">
<img src='images/bandcamp-streamer.jpg?raw=true' alt='promo image'>
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
  * Load entire collections & wishlists in one click (be patient if there are a lot of items!)
  * Spacebar play/pause, L/R arrow keys to skip to previous/next track in the playlist
  * Volume control
  * Seek buttons (+/- 10s) via click or comma & period keys
      
### Feed page features 
  * Nonstop streaming from 2 separate playlists: fan activity or new releases
  * Price listed next to "buy now"
  
### Personal (owned) collection page features
  * Stream full albums continuously (moves onto next album after finishing) 
  * Stream a playlist of your favorite track from each release (plays first track from album if favorite not set)
  * Shuffle & reverse album & favorites playlists 
  * Continuous streaming of search results (full albums only)

### Wishlist page features
  * Stream all tracks continuously
  * Shuffle & reverse wishlist playlist
  * Continuous streaming of search results

### Known issues
  * If the collection/wishlist playlist has been shuffled when more tracks are added, it becomes unshuffled and playback stops. It is recommended to load all the desired tracks to the page first, then shuffle and start the playlist.  
  * If you are playing from collection/wishlist search results & click to another profile tab, the current track will continue playing but the playlist will be lost.  
  * If an item has been displayed in both collection or wishlist tab & the tab's search results, clicking on the item in the bottom player bar won't scroll to the correct location.  

### What this extension does not do
  * Allow you to add a full album to your wishlist and then stream the whole thing. Playing only the first or featured track of an album in your wishlist is a Bandcamp limitation that this extension does not try to circumvent. You can do two things: support the artist and buy the album (best option for full flexibility + cool factor), or add each individual track from the album to your wishlist if possible. 
  * Attempt to track you or any of your data in any way, or communicate with any third parties for any reason. This is a 100% privacy respecting extension.

### What people say
⚡ "it is something I use literally everyday"  
⚡ "My god this is exactly what i've been looking for"  
⚡ "Thank you for such a amazing extension"  
⚡ "Been wanting something like this for a while, glad I searched it up"  
⚡ "i would give 10 stars if i could"  

### Support development
  * Please leave a rating and some feedback! It's always motivating to hear from people who enjoy and find this useful. Suggestions and bug reports are always welcome too!

  * Any donation is appreciated! Much like making music, writing browser extensions is often a labor of love with little to no financial benefits in return for a lot of heart and effort.

  * https://www.paypal.me/aflowofcode
  * https://cash.app/$AFOC

### Changelog

##### 1.7.0
  * Seek buttons for profile player
  * Hotkey list
  * Options page for hotkey & seek rate remapping

##### 1.6.1
  * Embed 5 year anniversary compilation in welcome page

##### 1.6.0
  * Welcome page
  * Reverse playlist function
  * Fix wrong art active for first track in shuffled playlist
  * Prevent clicking on unplayable items from halting playlist

##### 1.5.0
  * Supporters infobox (extension icon click)
  * Add seek buttons to feed player

##### 1.4.2
  * Fix "view all" loading dupe tracks at end of large collections
  * Add count of pending tracks to load during "view all" 

##### 1.4.1
  * Fix artist-marked private items breaking playlist
  * Retain track & position when paused during playlist expansion
  * Fix bad play handler on collection item if paused during playlist expansion

##### 1.4.0
  * Bind L/R arrow keys to previous/next track on regular album pages
  * Fix incorrect shuffler text after switching from shuffled playlist
  * Fix inherently unplayable DOM item breaking collection playlist
  * Fix break if only one track in search result playlist

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