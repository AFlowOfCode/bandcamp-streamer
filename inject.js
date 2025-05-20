/**
 * injectScript - Inject internal script to allow access to the `window`
 *
 * @param  {type} file_path Local path of the internal script.
 * @param  {type} tag The tag as string, where the script will be append (default: 'body').
 * @see    {@link http://stackoverflow.com/questions/20499994/access-window-variable-from-content-script}
 */

console.log('Bandcamp Streamer! (v1.7.0)');

function injectScript(file_path, tag, prefs) {
    const node = document.getElementsByTagName(tag)[0],
          script = document.createElement('script');
    script.id = 'bandcamp-streamer';
    script.setAttribute('type', 'module');
    script.setAttribute('src', file_path);
    // hotkey prefs from options page (or defaults)
    script.setAttribute('data-prefs', JSON.stringify(prefs));
    node.appendChild(script);
}

let defaults = {
      playpause: 'Space', 
      previous: 'ArrowLeft', 
      next: 'ArrowRight', 
      seekback: 'Comma', 
      seekforward: 'Period',
      seekrate: 10
    },
    gettingHotkeys = chrome.storage.sync.get(defaults);

gettingHotkeys.then(
  results => {
    // console.log('Setting hotkeys & seek length', results);
    injectScript(chrome.runtime.getURL('init.js'), 'body', results);
  }, 
  error => {
    console.log(`Error retrieving hotkey remaps (if any) from storage: ${error}`);
    injectScript(chrome.runtime.getURL('init.js'), 'body', defaults);
  }
);


