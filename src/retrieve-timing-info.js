//=======================================================================
// This js file is injected in all pages as specified in the manifest
//=======================================================================

//-----------------------------------------------------------------------
// This function retrieves timing data and sends this information to a listener
//-----------------------------------------------------------------------
window.onload = function(){
  setTimeout(function(){
    chrome.runtime.sendMessage({timing: performance.timing});
  }, 0);
}
