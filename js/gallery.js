/* AnyJuanPOS screenshots: click a picture to see it big. Without JavaScript the link simply opens the picture. */
(function () {
  'use strict';
  var box = document.getElementById('lightbox');
  if (!box || typeof box.showModal !== 'function') return;
  var img = box.querySelector('img');
  var cap = box.querySelector('.lightbox-cap');
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[data-lightbox]') : null;
    if (!a) return;
    e.preventDefault();
    var small = a.querySelector('img');
    var fig = a.parentNode.querySelector('figcaption');
    img.src = a.getAttribute('href');
    img.alt = small ? small.alt : '';
    cap.textContent = fig ? fig.textContent : '';
    box.showModal();
  });
  // clicking the dark area around the picture closes it
  box.addEventListener('click', function (e) { if (e.target === box) box.close(); });
})();
