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

      var dataForThisPage = {};
      dataForThisPage['redirectTime']     = t.redirectEnd - t.redirectStart;
      dataForThisPage['domainLookupTime'] = t.domainLookupEnd - t.domainLookupStart;
      dataForThisPage['connectTime']      = t.connectEnd - t.connectStart;
      dataForThisPage['requestTime']      = t.responseStart - t.requestStart;
      dataForThisPage['responseTime']     = t.responseEnd - t.responseStart;
      dataForThisPage['domTime']          = t.domComplete - t.domLoading;
      dataForThisPage['loadTime']         = t.loadEventEnd - t.loadEventStart;
      
      data.averages = updateAverages(data.averages, dataForThisPage);
      
      // Store it all back
      chrome.storage.local.set(data);
    });
  }
);


// Clear data on closing tab
chrome.tabs.onRemoved.addListener(function(tabId) {
  chrome.storage.local.get('cache', function(data) {
    if (data.cache) delete data.cache['tab' + tabId];
    chrome.storage.local.set(data);
  });
});
