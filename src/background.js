//=======================================================================
// This js file runs in the background as an extension
//=======================================================================
// The following site shows how chrome.runtime is not backward compatible
// http://stackoverflow.com/questions/15718066/chrome-runtime-sendmessage-not-working-as-expected

//-----------------------------------------------------------------------
// Receives messages from injected code
//-----------------------------------------------------------------------
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {

    // If sender.tab is defined, then it must be from a real tab
    //   if not, then it's not something we want to track
    if (!sender.tab)
      return;

    // We don't want to track newtabs
    if (sender.tab.url === "chrome://newtab/")
      return;

    console.log(sender.tab.id);
    
    // We don't want to track autocompletes in chrome, so the tab has to exist
    quit = false;
    chrome.tabs.get(sender.tab.id, function(tab) {
      if (chrome.runtime.lastError || !tab) {
        // Tab does not exist
        quit = true;
      }
    });
    if (quit)
      return;


    var t = request.timing;
    
    // This cache stores page load time for each tab, so they don't interfere
    chrome.storage.local.get('cache', function(data) {
      if (!data.cache)
        data.cache = {};
      data.cache['tab' + sender.tab.id] = t;
      chrome.storage.local.set(data);
    });

    // Show the time string on the badge in the toolbar
    // Qe have only 4 chars at our disposal including decimal point
    var start = t.redirectStart == 0 ? t.fetchStart : t.redirectStart;
    var loadingTime = String(((t.loadEventEnd - start) / 1000).toPrecision(3)).substring(0, 4);
    chrome.browserAction.setBadgeText({text: loadingTime, tabId: sender.tab.id});

    // Do calculations for this page
    var dataForThisPage = {};
    dataForThisPage['redirectTime']     = t.redirectEnd - t.redirectStart;
    dataForThisPage['domainLookupTime'] = t.domainLookupEnd - t.domainLookupStart;
    dataForThisPage['connectTime']      = t.connectEnd - t.connectStart;
    dataForThisPage['requestTime']      = t.responseStart - t.requestStart;
    dataForThisPage['responseTime']     = t.responseEnd - t.responseStart;
    dataForThisPage['domTime']          = t.domComplete - t.domLoading;
    dataForThisPage['loadTime']         = t.loadEventEnd - t.loadEventStart;

    // This manages averages
    chrome.storage.local.get('averages', function(data) {
      // If this data was never set before
      if (!data.averages) {
        data.averages = {};
        data.averages['numberOfPagesLoaded'] = 0;
      }

      function updateAverage(currentAverage, currentNumberOfPagesLoaded, newValue) {
        // Let currentAverage default to 0
        if (!currentAverage)
          currentAverage = 0;
        return (currentAverage * currentNumberOfPagesLoaded + newValue)/
          (currentNumberOfPagesLoaded + 1);
      }

      function updateAverages(currentData, dataForThisPage) {
        numberOfPagesLoaded = currentData.numberOfPagesLoaded;

        var newData = {}
        
        for (var key in dataForThisPage) {
          newData[key] = updateAverage(currentData[key], numberOfPagesLoaded, dataForThisPage[key]);
        }

        newData['numberOfPagesLoaded'] = numberOfPagesLoaded + 1;

        return newData;
      }
      
      data.averages = updateAverages(data.averages, dataForThisPage);
      
      // Store it all back
      chrome.storage.local.set(data);
    });

    // This manages maximums
    chrome.storage.local.get('maximums', function(data) {
      // If this data was never set before
      if (!data.maximums) {
        data.maximums = {};
      }

      function updateMaximums(currentData, dataForThisPage) {
        var newData = {}
        
        for (var key in dataForThisPage) {
          if (!currentData[key]) {
            currentData[key] = 0;
          }
          
          newData[key] = Math.max(currentData[key], dataForThisPage[key]);
        }

        return newData;
      }
      
      data.maximums = updateMaximums(data.maximums, dataForThisPage);
      
      // Store it all back
      chrome.storage.local.set(data);
    });
  }
);


// Clear data on closing tab
chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
  chrome.storage.local.get('cache', function(data) {
    if (data.cache)
      delete data.cache['tab' + tabId];
    chrome.storage.local.set(data);
  });
});

chrome.tabs.onReplaced.addListener(function(addedTabId, removedTabId) {
  chrome.storage.local.get('cache', function(data) {
    if (data.cache)
      delete data.cache['tab' + removedTabId];
    // Adding tabs is handled through messaging
    chrome.storage.local.set(data);
  });
});
