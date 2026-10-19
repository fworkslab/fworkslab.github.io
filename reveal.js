// Появление блоков, привязанное к прокрутке.
//
// Класс is-in ставится, пока элемент в кадре, и снимается, когда уходит.
// Поэтому анимация работает в обе стороны: вниз появляется, вверх уходит.
//
// Почему не IntersectionObserver: его события приходят асинхронно, и при
// быстрой прокрутке состояние успевает разъехаться с реальной картинкой —
// элементы залипали то невидимыми, то видимыми. Проверка идёт напрямую по
// getBoundingClientRect при каждом кадре прокрутки, поэтому состояние
// всегда совпадает с тем, что на экране.
//
// Проверка ограничена одним кадром через requestAnimationFrame: обработчик
// события прокрутки вызывается десятки раз, считать достаточно один раз.
//
// Всё обёрнуто в функцию: return на верхнем уровне обычного скрипта —
// это SyntaxError, и файл целиком не выполняется.

;(function () {
  'use strict'

  document.documentElement.classList.add('js')

  var items = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'))
  if (!items.length) return

  var queued = false

  function update() {
    queued = false
    var vh = window.innerHeight
    var edge = vh * 0.06 // полоса у краёв: элемент в ней ещё не «в кадре»

    for (var i = 0; i < items.length; i++) {
      var box = items[i].getBoundingClientRect()
      var visible = box.bottom > edge && box.top < vh - edge
      if (items[i].classList.contains('is-in') !== visible) {
        items[i].classList.toggle('is-in', visible)
      }
    }
  }

  function request() {
    if (queued) return
    queued = true
    requestAnimationFrame(update)
  }

  update()
  window.addEventListener('scroll', request, { passive: true })
  window.addEventListener('resize', request, { passive: true })

  // Страховка от залипания. Если событие прокрутки по какой-то причине
  // не пришло (потерялось, браузер его не отдал, вкладка была свёрнута),
  // элементы могли бы навсегда остаться невидимыми. Раз в секунду
  // состояние сверяется заново, поэтому оно всегда приходит в соответствие
  // с тем, что на экране. Двенадцать прямоугольников раз в секунду — ничто.
  setInterval(update, 1000)
})()