'use strict';
(() => {
  const button = document.getElementById('compare');
  const image = document.getElementById('scene');
  const caption = document.getElementById('caption');
  let original = false;
  button.hidden = false;
  button.addEventListener('click', () => {
    original = !original;
    image.src = original ? 'assets/city-jinbocho.jpg' : 'assets/mana-composite.png';
    image.alt = original ? '合成前の、神保町の古書店の写真' : '神保町の古書店の写真に、本を持って振り向くアニメのまなを加えた合成試案';
    caption.textContent = original ? '合成元の写真。撮影時の記録です。' : '神保町の写真を基にした合成静止画。ライブ映像ではありません。';
    button.textContent = original ? 'まながいる試案に戻る' : '元の写真を見る';
    button.setAttribute('aria-pressed', String(original));
  });
})();
