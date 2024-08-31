chrome.runtime.onInstalled.addListener(function(object) {
    const reasons = [
        chrome.runtime.OnInstalledReason.INSTALL, 
        chrome.runtime.OnInstalledReason.UPDATE
    ];
    if (reasons.indexOf(object.reason) > -1) {
        chrome.tabs.create({url: chrome.runtime.getURL("welcome.html")});
    }
});
