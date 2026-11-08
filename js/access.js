/* Experience page: ask visitors for their reason before they ask to see details.
   The real details are NOT in this page's HTML (only blurred placeholders), so there is nothing to
   "unblur". Access is granted by Jonnel replying to the email. */
(function () {
  'use strict';
  var dialog = document.getElementById('access-dialog');
  var reopen = document.getElementById('open-access');
  if (!dialog || typeof dialog.showModal !== 'function') return; // the static banner still works without this

  if (reopen) {
    reopen.hidden = false;
    reopen.addEventListener('click', function () { dialog.showModal(); });
  }

  // click on the dark backdrop closes the dialog (the page stays locked)
  dialog.addEventListener('click', function (e) {
    var r = dialog.getBoundingClientRect();
    var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) dialog.close();
  });

  window.setTimeout(function () { if (!dialog.open) dialog.showModal(); }, 450);
})();
