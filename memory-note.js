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
  const STORE_KEY = 'emotionBookstore.memories.v1';
  function cleanRecord(item) {
    if (!item || typeof item.path !== 'string' || typeof item.title !== 'string') return null;
    const url = new URL(item.path, 'https://emotionbookstore.com');
    if (url.origin !== 'https://emotionbookstore.com' || !(/^\/(?:discover|outings|v3-prototype)\//.test(url.pathname) || /^\/work-(?:book|film|music|video)\.html$/.test(url.pathname))) return null;
    return { path: url.pathname, title: item.title.slice(0, 240), note: String(item.note || '').slice(0, 500), stamps: stamps.filter(s => Array.isArray(item.stamps) && item.stamps.includes(s)), updatedAt: Number.isFinite(item.updatedAt) ? item.updatedAt : 0 };
  }
  function readMemories(storage) {
    const raw = storage.getItem(STORE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) throw Error('Saved data is invalid');
    return list.map(cleanRecord).filter(Boolean).filter((item, i, items) => items.findIndex(x => x.path === item.path) === i).sort((a,b) => b.updatedAt-a.updatedAt);
  }
  function saveMemory(storage, record) {
    const item = cleanRecord(record);
    if (!item) throw Error('This page cannot be saved');
    const items = readMemories(storage).filter(x => x.path !== item.path);
    if (item.note.trim() || item.stamps.length) items.unshift(item);
    if (items.length > 500) throw Error('Storage is full');
    storage.setItem(STORE_KEY, JSON.stringify(items));
    return items;
  }
  function tokyoDay(now = new Date()) { return new Date(now.getTime()+9*3600000).toISOString().slice(0,10); }
  if (typeof module !== 'undefined') module.exports = { compose, calendarDates, googleCalendar, calendarFile, cleanRecord, readMemories, saveMemory, STORE_KEY, tokyoDay };
  if (typeof document === 'undefined') return;
  const en = document.documentElement.lang === 'en';
  const message = (ja, english) => en ? english : ja;
  const section = document.querySelector('[data-memory-note]');
  if (section) {
    const input = section.querySelector('#memory-text');
    const status = section.querySelector('[data-memory-action-status]');
    const savedStatus = section.querySelector('[data-memory-save-status]');
    const calendarStatus = section.querySelector('[data-memory-calendar-status]');
    const stampButtons = Array.from(section.querySelectorAll('[data-memory-stamp]'));
    const title = document.querySelector('h1')?.textContent.trim() || document.title;
    const selected = () => stampButtons.filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.memoryStamp);
    const text = () => compose(title, location.pathname, input.value, selected());
    function restoreMemory() {
      try {
        const item = readMemories(localStorage).find(x => x.path === location.pathname);
        input.value = item?.note || '';
        stampButtons.forEach(b => b.setAttribute('aria-pressed', String(Boolean(item?.stamps.includes(b.dataset.memoryStamp)))));
        savedStatus.textContent = item ? message('保存した想いを読み込みました。','Your saved thought is here.') : '';
      } catch (_) { savedStatus.textContent = message('このブラウザでは保存を読み込めません。コピーして持ち帰れます。','Saved thoughts are unavailable. You can still copy your note.'); }
    }
    restoreMemory();
    const changed = () => {
      status.textContent = ''; section.querySelector('[data-memory-export]').hidden = true;
      try {
        saveMemory(localStorage, { path: location.pathname, title, note: input.value, stamps: selected(), updatedAt: Date.now() });
        savedStatus.textContent = input.value.trim() || selected().length ? message('保存しました。「保存した想い」から見返せます。','Saved. Find it in Saved thoughts.') : message('このページの保存を解除しました。','Removed from saved thoughts.');
      } catch (_) { savedStatus.textContent = message('保存できませんでした。ブラウザの保存設定や空き容量を確認するか、コピーして持ち帰ってください。','Could not save. Check browser storage, or copy your note.'); }
    };
    input.addEventListener('input', changed);
    stampButtons.forEach(button => button.addEventListener('click', () => {
      button.setAttribute('aria-pressed', button.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); changed();
    }));
    window.addEventListener('storage', event => { if(event.key === STORE_KEY && document.activeElement !== input) restoreMemory(); });
    section.querySelector('[data-memory-copy]').addEventListener('click', async () => {
      const value = text();
      try { await navigator.clipboard.writeText(value); status.textContent = message('コピーしました。メモや日記に貼り付けられます。','Copied. Paste it into your notes or journal.'); }
      catch (_) {
        const output = section.querySelector('[data-memory-export]');
        output.hidden = false; output.value = value; output.focus(); output.select();
        status.textContent = message('下の文章を選択してコピーしてください。','Select and copy the text below.');
      }
    });
    const share = section.querySelector('[data-memory-share]');
    share.hidden = typeof navigator.share !== 'function';
    share.addEventListener('click', async () => {
      try { await navigator.share({ title, text: text() }); status.textContent = message('共有先のアプリで保存を確認してください。','Confirm saving in your chosen app.'); }
      catch (error) { status.textContent = error.name === 'AbortError' ? message('共有をキャンセルしました。','Sharing cancelled.') : message('共有を開けませんでした。コピーをお使いください。','Could not open sharing. Use Copy instead.'); }
    });
    const day = section.querySelector('[data-memory-date]');
    // A visible, editable value (not a locale-dependent placeholder).
    day.value = tokyoDay();
    const withDate = action => {
      try { calendarDates(day.value); action(day.value); }
      catch (_) { calendarStatus.textContent = message('日付を選んでください。','Choose a valid date.'); day.focus(); }
    };
    day.addEventListener('input', () => { calendarStatus.textContent = ''; });
    section.querySelector('[data-memory-google]').addEventListener('click', () => withDate(value => {
      window.open(googleCalendar(title, text(), value), '_blank', 'noopener,noreferrer');
      calendarStatus.textContent = message('Googleカレンダーで日付と保存先を確認してください。','Check the date and save in Google Calendar.');
    }));
    section.querySelector('[data-memory-ics]').addEventListener('click', () => withDate(value => {
      const url = URL.createObjectURL(new Blob([calendarFile(title, text(), value)], { type: 'text/calendar;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = 'emotion-bookstore-' + value + '.ics';
      document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
      calendarStatus.textContent = message('「'+link.download+'」のダウンロードを開始しました。アプリに取り込むと保存されます。', 'Download started: '+link.download+'. Import the file to save it in your calendar.');
      section.querySelector('[data-memory-calendar-help]').hidden = false;
    }));
  }
  const collection = document.querySelector('[data-saved-collection]');
  if (!collection) return;
  const list = collection.querySelector('[data-saved-list]');
  const status = collection.querySelector('[data-saved-status]');
  const search = collection.querySelector('input');
  const filter = collection.querySelector('select');
  const empty = collection.querySelector('[data-saved-empty]');
  const node = (tag, text, className) => { const el=document.createElement(tag); el.textContent=text; if(className)el.className=className; return el; };
  let removed = null;
  const undo = collection.querySelector('[data-saved-undo]');
  function renderSaved() {
    let items;
    try { items=readMemories(localStorage); }
    catch (_) { status.textContent='保存した想いを読み込めません。ブラウザの保存設定を確認してください。'; empty.hidden=true; return; }
    const visible=items.filter(x => (!filter.value || x.stamps.includes(filter.value)) && (x.title+' '+x.note+' '+x.stamps.join(' ')).toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase()));
    list.replaceChildren(); empty.hidden=Boolean(visible.length);
    status.textContent = `${items.length}件を保存 · ${visible.length}件を表示`;
    visible.forEach(item => {
      const article=node('article','', 'saved-card');
      const link=node('a',item.title); link.href=item.path;
      const h=node('h2',''); h.append(link); article.append(h);
      const tags=node('p',item.stamps.join(' / '),'saved-stamps'); article.append(tags);
      if(item.note)article.append(node('p',item.note,'saved-note'));
      const date=item.updatedAt ? new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',dateStyle:'medium'}).format(item.updatedAt) : '';
      article.append(node('p',date,'saved-date'));
      const actions=node('div','','saved-actions');
      const edit=node('a','ページを開く・編集 →'); edit.href=item.path; actions.append(edit);
      const remove=node('button','保存を解除'); remove.type='button'; remove.setAttribute('aria-label',item.title+'の保存を解除');
      remove.addEventListener('click',()=>{
        try { saveMemory(localStorage,{...item,note:'',stamps:[]}); removed=item; renderSaved(); undo.hidden=false; undo.focus(); }
        catch (_) { status.textContent='解除できませんでした。'; }
      }); actions.append(remove); article.append(actions); list.append(article);
    });
  }
  undo.addEventListener('click',()=>{if(!removed)return;try{saveMemory(localStorage,removed);removed=null;undo.hidden=true;renderSaved();status.textContent+=' · 保存を戻しました。';}catch(_){status.textContent='保存を戻せませんでした。';}});
  search.addEventListener('input',renderSaved); filter.addEventListener('change',renderSaved);
  window.addEventListener('storage',event=>{if(event.key===STORE_KEY)renderSaved();});
  renderSaved();
  // Keep existing "気になる" items accessible, without migrating or expiring them.
  const legacy=collection.querySelector('[data-saved-legacy]');
  try {
    const key='emotionBookstore.v3.weeklyFavorites.v1';
    const old=JSON.parse(localStorage.getItem(key)||'[]');
    const valid=Array.isArray(old)?old.filter(x=>x&&typeof x.title==='string'&&['koenji','kichijoji','shimokitazawa','jinbocho'].includes(x.shelfId)):[];
    if(valid.length){legacy.hidden=false;valid.forEach(item=>{const a=node('a',item.title+' — '+item.shelfName);a.href='/shelf.html?shelf='+item.shelfId;legacy.append(a);});}
  }catch(_){}
})();
