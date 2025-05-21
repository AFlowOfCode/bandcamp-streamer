chrome.runtime.onInstalled.addListener(function(object) {
  const reasons = [
    chrome.runtime.OnInstalledReason.INSTALL,
    chrome.runtime.OnInstalledReason.UPDATE
  ];
  if (reasons.indexOf(object.reason) > -1) {
    chrome.tabs.create({
      // don't automatically focus, can be annoying especially during an update
      active: false,
      url: chrome.runtime.getURL("pages/welcome.html")
    });
  }
});
