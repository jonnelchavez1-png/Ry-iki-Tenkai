/* Home page: "See the full list, by category" opens the same confidential dialog as the Experience page. */
(function () {
  'use strict';
  var dialog = document.getElementById('tools-gate');
  var triggers = document.querySelectorAll('[data-open-tools-gate]');
  if (!dialog || !triggers.length) return;
  var opener = null;

  triggers.forEach(function (btn) {
    btn.addEventListener('click', function () {
      opener = btn;
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    });
  });

  // click on the dark backdrop closes the dialog
  dialog.addEventListener('click', function (e) {
    var r = dialog.getBoundingClientRect();
    var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) dialog.close();
  });
  // hand focus back to the button that opened it
  dialog.addEventListener('close', function () { if (opener) opener.focus(); });
})();
