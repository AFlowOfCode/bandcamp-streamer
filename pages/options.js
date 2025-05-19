/*
  Codes extracted from referenced page via console code:
  
  table = document.querySelectorAll(".hn-table > table");
  code_els = table[1].querySelectorAll("td:nth-child(4)");
  console.log(code_els.length);
  codes = [[...code_els].map((node) => node.innerText)];
  console.log(codes.join(", "));
*/

const keyboardevent_codes = ['Backspace','Tab','Enter','ShiftLeft','ShiftRight','ControlLeft','ControlRight','AltLeft','AltRight','Pause','CapsLock','Escape','Space','PageUp','PageDown','End','Home','ArrowLeft','ArrowUp','ArrowRight','ArrowDown','PrintScreen','Insert','Delete','Digit0','Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','KeyA','KeyB','KeyC','KeyD','KeyE','KeyF','KeyG','KeyH','KeyI','KeyJ','KeyK','KeyL','KeyM','KeyN','KeyO','KeyP','KeyQ','KeyR','KeyS','KeyT','KeyU','KeyV','KeyW','KeyX','KeyY','KeyZ','MetaLeft','MetaRight','ContextMenu','Numpad0','Numpad1','Numpad2','Numpad3','Numpad4','Numpad5','Numpad6','Numpad7','Numpad8','Numpad9','NumpadMultiply','NumpadAdd','NumpadSubtract','NumpadDecimal','NumpadDivide','F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12','NumLock','ScrollLock','Semicolon','Equal','Comma','Minus','Period','Slash','Backquote','BracketLeft','Backslash','BracketRight','Quote'];

// called as soon as options tab is clicked
document.addEventListener("DOMContentLoaded", restoreOptions);

function restoreOptions() {
  const inputs = document.querySelectorAll('input');
  inputs.forEach(input => {
    let getting = browser.storage.sync.get(input.id);
    getting.then(
      result => setCurrentChoice(input, result), 
      error => alert(`Error: ${error}`)
    );
  });

  function setCurrentChoice(input, result) {
    document.querySelector(`#${input.id}`).value = result[input.id] || input.value;
  }
}

/*
  If vals are wrong (according to input rules - only applicable to seeklength), 
  "submit" event is not even called. The options page doesn't support HTML5 validation 
  warnings, so proper error highlighting must be done manually.
*/
document.querySelector("button").addEventListener("click", saveOptions);

function mark_invalid(input) {
  // alert(`${input.id} invalid`);
  input.classList.add('error');
  input.style.outline = '1px solid red';
}

function mark_valid(input) {
  input.classList.remove('error');
  input.style.outline = 'initial';
}

function validate_input(input, num_invalid) {
  if (input.id == 'seeklength' && !input.reportValidity()) {
    mark_invalid(input);
    num_invalid++;
  } else if (input.id != 'seeklength' && keyboardevent_codes.indexOf(input.value) == -1) {
    mark_invalid(input);
    num_invalid++;
  } else {
    mark_valid(input);
  }
  return num_invalid;
}

function saveOptions(e) {
  e.preventDefault();
  
  const inputs = document.querySelectorAll('input');
  let num_invalid = 0;

  for (i=0; i < inputs.length; i++) {
    num_invalid = validate_input(inputs[i], num_invalid);
  }

  // alert(num_invalid);
  if (num_invalid == 0) {
    let vals = {};
    inputs.forEach(input => vals[input.id] = input.value);
    browser.storage.sync.set(vals);
    alert("Values saved!");
  }
}
