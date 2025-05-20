function getPrefs() {
  let defaults = {
        playpause: 'Space', 
        previous: 'ArrowLeft', 
        next: 'ArrowRight', 
        seekback: 'Comma', 
        seekforward: 'Period',
        seekrate: 10
      };
  
  // here it uses a callback vs returning a promise
  chrome.storage.sync.get(defaults, showPrefs);
  // allow options page click
  document.getElementById('optionspage')
    .addEventListener('click', () => chrome.runtime.openOptionsPage());
}

function showPrefs(prefs) {
  const playpause = document.getElementById('playpause'),
        previous = document.getElementById('previous'),
        next = document.getElementById('next'),
        seekback = document.getElementById('seekback'),
        seekforward = document.getElementById('seekforward'),
        seekrate = document.getElementById('seekrate');

  playpause.innerText = `${prefs.playpause}`;
  previous.innerText = `${prefs.previous}`;
  next.innerText = `${prefs.next}`;
  seekback.innerText = `${prefs.seekback}`;
  seekforward.innerText = `${prefs.seekforward}`;
  seekrate.innerText = `${prefs.seekrate}s`;
}

document.addEventListener("DOMContentLoaded", getPrefs);
