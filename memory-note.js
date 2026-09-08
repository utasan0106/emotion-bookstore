'use strict';
(function () {
  const stamps = ['心に残った', '元気をもらった', '誰かに伝えたい', '行ってみたい'];
  function compose(title, pathname, note, selected = []) {
    const cleanPath = new URL(pathname, 'https://emotionbookstore.com').pathname;
    const valid = stamps.filter(stamp => selected.includes(stamp));
    return [title, 'https://emotionbookstore.com' + cleanPath, '', '心に残ったこと', ...(valid.length ? [valid.join(' / ')] : []), ...(note.trim() ? [note.trim()] : [])].join('\n');
  }
  function calendarDates(day) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw Error('日付を選んでください。');
    const time = Date.parse(day + 'T00:00:00Z');
    if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== day) throw Error('日付を確認してください。');
    return [day.replace(/-/g, ''), new Date(time + 86400000).toISOString().slice(0, 10).replace(/-/g, '')];
  }
  const calendarText = text => text + '\n\n感情書店から持ち帰ったメモです。開催時刻・予約状況を示すものではありません。';
  function googleCalendar(title, text, day) {
    const url = new URL('https://calendar.google.com/calendar/render');
    url.search = new URLSearchParams({ action: 'TEMPLATE', text: '気になる：' + title, dates: calendarDates(day).join('/'), details: calendarText(text), ctz: 'Asia/Tokyo' });
    return url.href;
  }
  function calendarFile(title, text, day, now = new Date()) {
    const [start, end] = calendarDates(day);
    const escape = value => value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
    let hash = 2166136261;
    for (const char of title + day + text) hash = Math.imul(hash ^ char.codePointAt(0), 16777619);
    // RFC 5545: fold at 75 UTF-8 octets, never splitting a code point.
    const fold = line => {
      let out = '', bytes = 0;
      for (const char of line) {
        const size = new TextEncoder().encode(char).length;
        if (bytes + size > 75) { out += '\r\n '; bytes = 1; }
        out += char; bytes += size;
      }
      return out;
    };
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Emotion Bookstore//Memory//JA', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      'UID:memory-' + (hash >>> 0).toString(16) + '@emotionbookstore.com', 'DTSTAMP:' + now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''),
      'DTSTART;VALUE=DATE:' + start, 'DTEND;VALUE=DATE:' + end, 'SUMMARY:' + escape('気になる：' + title),
      'DESCRIPTION:' + escape(calendarText(text)), 'TRANSP:TRANSPARENT', 'END:VEVENT', 'END:VCALENDAR'].map(fold).join('\r\n') + '\r\n';
  }
  if (typeof module !== 'undefined') module.exports = { compose, calendarDates, googleCalendar, calendarFile };
  if (typeof document === 'undefined') return;
  const section = document.querySelector('[data-memory-note]');
  if (!section) return;
  const input = section.querySelector('#memory-text'), status = section.querySelector('[role="status"]');
  const title = document.querySelector('h1')?.textContent.trim() || document.title;
  const text = () => compose(title, location.pathname, input.value, Array.from(section.querySelectorAll('[data-memory-stamp][aria-pressed="true"]'), button => button.dataset.memoryStamp));
  const changed = () => { status.textContent = ''; section.querySelector('[data-memory-export]').hidden = true; };
  input.addEventListener('input', changed);
  section.querySelectorAll('[data-memory-stamp]').forEach(button => button.addEventListener('click', () => {
    button.setAttribute('aria-pressed', button.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); changed();
  }));
  section.querySelector('[data-memory-copy]').addEventListener('click', async () => {
    const value = text();
    try {
      await navigator.clipboard.writeText(value);
      status.textContent = 'コピーしました。いつものメモや日記に貼り付けられます。';
    } catch (_) {
      const output = section.querySelector('[data-memory-export]');
      output.hidden = false; output.value = value; output.focus(); output.select();
      status.textContent = '下の文章を選択してコピーしてください。';
    }
  });
  const share = section.querySelector('[data-memory-share]');
  share.hidden = typeof navigator.share !== 'function';
  share.addEventListener('click', async () => {
    try { await navigator.share({ title, text: text() }); status.textContent = '共有先のアプリで保存を確認してください。'; }
    catch (error) { status.textContent = error.name === 'AbortError' ? '共有をキャンセルしました。' : '共有を開けませんでした。「コピーして持ち帰る」をお使いください。'; }
  });
  const day = section.querySelector('[data-memory-date]');
  const withDate = action => {
    try { calendarDates(day.value); action(day.value); }
    catch (error) { status.textContent = error.message; day.focus(); }
  };
  section.querySelector('[data-memory-google]').addEventListener('click', () => withDate(value => {
    window.open(googleCalendar(title, text(), value), '_blank', 'noopener,noreferrer');
    status.textContent = 'Googleカレンダーで日付と保存先を確認してください。';
  }));
  section.querySelector('[data-memory-ics]').addEventListener('click', () => withDate(value => {
    const url = URL.createObjectURL(new Blob([calendarFile(title, text(), value)], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'emotion-bookstore-memory.ics';
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    status.textContent = '予定ファイルを用意しました。対応するカレンダーアプリで開き、保存してください。';
  }));
})();
