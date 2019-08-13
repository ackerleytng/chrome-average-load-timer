var total,
    acc = 0;

function set(id, start, length, noacc) {
  if (!noacc) {
    acc += length;
  }

  // Fill in values
  document.getElementById(id + 'When').innerHTML = start;
  document.getElementById(id).innerHTML = length;
  document.getElementById(id + 'Total').innerHTML = noacc ? '-' : acc;

  // Draw bars
  var table_width = 400;
  var x_relative = Math.round(start / total * table_width);
  var length_relative = Math.round(length / total * table_width);
  document.getElementById('r-' + id).style.cssText =
    'background-size:' + length_relative + 'px 100%;' +
    'background-position-x:' + (x_relative >= table_width ? (table_width - 1) : x_relative) + 'px;';
}

function fillIn(id, value) {
  if (id == "numberOfPagesLoaded") {
    document.getElementById(id).innerHTML = value;
  } else {
    // Round displayed value to 2 decimal places, display in seconds
    value /= 1000;
    document.getElementById(id).innerHTML = Math.round(value*100)/100;
  }
}

function display() {
  chrome.tabs.getSelected(null, function (tab) {
    chrome.storage.local.get('cache', function(data) {
      var t = data.cache['tab' + tab.id];

      if (!t)
        return;
      
      var start = t.redirectStart == 0 ? t.fetchStart : t.redirectStart;

      total = t.loadEventEnd - start;

      // https://dvcs.w3.org/hg/webperf/raw-file/tip/specs/NavigationTiming/Overview.html#processing-model
      set('redirect', 0, t.redirectEnd - t.redirectStart);
      set('dns', t.domainLookupStart - start, t.domainLookupEnd - t.domainLookupStart);
      set('connect', t.connectStart - start, t.connectEnd - t.connectStart);
      set('request', t.requestStart - start, t.responseStart - t.requestStart);
      set('response', t.responseStart - start, t.responseEnd - t.responseStart);
      set('dom', t.domLoading - start, t.domComplete - t.domLoading);
      set('domInteractive', t.domInteractive - start, 0, true);
      set('contentLoaded', t.domContentLoadedEventStart - start,
          t.domContentLoadedEventEnd - t.domContentLoadedEventStart, true);
      set('load', t.loadEventStart - start, t.loadEventEnd - t.loadEventStart);
    });

    // Fill in averages
    chrome.storage.local.get('averages', function(data) {
      averages = data.averages;

      if (!averages) {
        // The default values are coded in HTML (0)
        return;
      }

      for (var key in averages) {
        fillIn(key, averages[key]);
      }
    });

    // Fill in maximums
    chrome.storage.local.get('maximums', function(data) {
      maximums = data.maximums;

      if (!maximums) {
        // The default values are coded in HTML (0)
        return;
      }

      for (var key in maximums) {
        fillIn('max_' + key, maximums[key]);
      }
    });
  });
}


display();

window.addEventListener('load', function() {
  document.getElementById('clearStatistics').addEventListener('click', function() {
    // Clears the averages
    chrome.storage.local.get('averages', function(data) {
      for (var key in data.averages) {
        data.averages[key] = 0;
      }
      chrome.storage.local.set(data);
    });

    // Clears the maximums
    chrome.storage.local.get('maximums', function(data) {
      for (var key in data.maximums) {
        data.maximums[key] = 0;
      }
      chrome.storage.local.set(data);
    });

    display();
  }, false)
}, false);
