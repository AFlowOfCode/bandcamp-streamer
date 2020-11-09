<div align="center">
<img src='bandcamp-streamer.jpg?raw=true' alt='promo image'>
</div>

# Bandcamp Streamer
Browser extension for Chrome & Firefox developed by A Flow of Code. Special acknowledgement to [lovethebomb](https://github.com/lovethebomb/) for the initial feed player class.

Chrome: [https://chrome.google.com/webstore/detail/bandcamp-streamer/hopclencgmfjiipjmlenfcdgcdblfmjh](https://chrome.google.com/webstore/detail/bandcamp-streamer/hopclencgmfjiipjmlenfcdgcdblfmjh)

Firefox: [https://addons.mozilla.org/en-US/firefox/addon/bandcamp-streamer/](https://addons.mozilla.org/en-US/firefox/addon/bandcamp-streamer/)

### Stream uninterrupted from various bandcamp pages
  * Feed
  * Personal collection / wishlist
  * Any other fan's collection / wishlist
      
### Feed page features 
  * Nonstop streaming from 2 separate playlists: fan activity or new releases
  * Price listed next to "buy now"
  * Volume control
  
### Personal (owned) collection page features
  * Stream full albums continuously (moves onto next album after finishing) 
  * Stream a playlist of your favorite track from each release (plays first track from album if favorite not set)
  * Shuffle either album or favorites playlist 

### Wishlist page features
  * Stream all tracks continuously
  * Shuffle wishlist tracks

### What this extension does not do
  * Allow you to add a full album to your wishlist and then stream the whole thing. Playing only the first or featured track of an album in your wishlist is a Bandcamp limitation that this extension does not try to circumvent. I've received feedback that the extension "doesn't work" because of this. You can do two things: support the artist and buy the album (best option for full flexibility), or add each track from the album to your wishlist if possible. 

### Known issues
  * New stories added from the top while the feed page is loaded are not added to the playlist. If you want to hear them, just reload the page.
  * If collection/wishlist playlist is shuffled when more tracks are added, it becomes unshuffled. It is recommended to load all the desired tracks to the page first, then shuffle and start the playlist.

### Changelog
##### 1.2  
  * Allow shuffle for wishlist
  * New icons

### Building the package
 * If you want to build and load the browser extension yourself, rename the manifest file for the browser of your choice to manifest.json and follow the browser's instructions for loading a developer extension. On Windows you could also use something like this script I wrote to [automatically create uploadable zip packages for browser extensions written for both Firefox and Chrome](https://gist.github.com/AFlowOfCode/6704a5d56f58a016c8f3205f2c18e4e8).

## Trademarks

Bandcamp and [Bandcamp.com](http://www.bandcamp.com) are Copyright © Bandcamp, Inc.
