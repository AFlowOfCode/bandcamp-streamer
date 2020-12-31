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

### Known issues
  * New stories added from the top while the feed page is loaded are not added to the playlist. If you want to hear them, just reload the page.
  * If the collection/wishlist playlist has been shuffled when more tracks are added, it becomes unshuffled. It is recommended to load all the desired tracks to the page first, then shuffle and start the playlist.

### What this extension does not do
  * Allow you to add a full album to your wishlist and then stream the whole thing. Playing only the first or featured track of an album in your wishlist is a Bandcamp limitation that this extension does not try to circumvent. You can do two things: support the artist and buy the album (best option for full flexibility + cool factor), or add each individual track from the album to your wishlist if possible. 

### Support development
  * If you appreciate the extension, consider showing some support! Please leave a rating and some feedback, it's always motivating to hear from people who enjoy the extension. Suggestions and bug reports are also welcome, preferably here via Github.

  * Any donation no matter how small is appreciated. Much like making music, writing browser extensions is often a labor of love with little to no financial benefits in return for a lot of heart and effort.

  * https://www.paypal.me/aflowofcode
  * Bitcoin (BTC): 1BAUU2oop9hQdoLujcZPmkBKWiT6JVEyfM
  * Bitcoin Cash (BCH): bitcoincash:qz26zw42996nf7xh7u2j3z6usv29vgk7wyp09ryk3t

### Changelog

##### 1.2.1
  * Fix issue with pausing by clicking on album art and unexpected playlist halting in a couple scenarios

##### 1.2  
  * Shuffle for wishlist
  * New icon

### Building the package
 * If you want to build and load the browser extension yourself, rename the manifest file for the browser of your choice to manifest.json and follow the browser's instructions for loading a developer extension. On Windows you could also use something like this script I wrote to [automatically create uploadable zip packages for browser extensions written for both Firefox and Chrome](https://gist.github.com/AFlowOfCode/6704a5d56f58a016c8f3205f2c18e4e8).

## Trademarks

Bandcamp and [Bandcamp.com](http://www.bandcamp.com) are Copyright © Bandcamp, Inc.

Special acknowledgement to [lovethebomb](https://github.com/lovethebomb/) for the initial feed player class.