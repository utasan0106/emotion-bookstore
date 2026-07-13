// app.js
import { emotionCategories, bookDatabase } from './data.js';

// アプリの状態を管理する変数
let currentMode = null; // 'quick' (特設コーナー) または 'deep' (奥の本棚)
let selectedEmotions = [];
let recommendedBook = null;

// 画面を描画するメイン関数
function render() {
  const appDiv = document.getElementById('app');
  appDiv.innerHTML = ''; // 画面を一度クリア

  // 1. 入り口画面
  if (currentMode === null) {
    appDiv.innerHTML = `
      <h2>今日の本屋の歩き方</h2>
      <p>今の状況に合わせて、入り口をお選びください。</p>
      
      <button class="door-btn" onclick="setMode('quick')">
        <strong>🛒 特設コーナーへ（サクッと）</strong>
        今の気分を1つ選ぶだけで、店主のおすすめを即お届けします。時間がない時に。
      </button>
      
      <button class="door-btn" onclick="setMode('deep')">
        <strong>📚 奥の本棚へ（じっくり）</strong>
        複数の気持ちを選んだり、言葉とじっくり向き合いたい時に。
      </button>
    `;
  } 
  
  // 2. 特設コーナー（サクッと動線）
  else if (currentMode === 'quick') {
    let html = `
      <h3>🛒 特設コーナー</h3>
      <p>今の気分に一番近いものを、<strong>1つだけ</strong>直感でタップしてください。</p>
      <div class="emotion-grid">
    `;
    
    // ボタンの生成（サクッと選べるよう最初の6個だけ表示）
    emotionCategories.slice(0, 6).forEach(emotion => {
      const isActive = selectedEmotions.includes(emotion.key) ? 'active' : '';
      html += `<button class="toggle-btn ${isActive}" onclick="toggleEmotion('${emotion.key}', true)">${emotion.label}</button>`;
    });
    
    html += `</div>`;

    // 本が選ばれたら結果をドーンと表示
    if (recommendedBook) {
      html += `
        <div class="book-card">
          <img src="${recommendedBook.coverImageUrl}" alt="表紙">
          <h4>『${recommendedBook.title}』</h4>
          <p class="hook-text">「${recommendedBook.hookText}」</p>
        </div>
      `;
    }

    html += `<button class="back-btn" onclick="resetApp()">← 入り口に戻る</button>`;
    appDiv.innerHTML = html;
  } 
  
  // 3. 奥の本棚（じっくり動線）
  else if (currentMode === 'deep') {
    let html = `
      <h3>📚 奥の本棚</h3>
      <p>今の気持ちを<strong>いくつでも</strong>選んでください。（もう一度タップで解除）</p>
      <div class="emotion-grid">
    `;
    
    // 全てのボタンを生成
    emotionCategories.forEach(emotion => {
      const isActive = selectedEmotions.includes(emotion.key) ? 'active' : '';
      const checkMark = isActive ? ' ✓' : '';
      html += `<button class="toggle-btn ${isActive}" onclick="toggleEmotion('${emotion.key}', false)">${emotion.label}${checkMark}</button>`;
    });
    
    html += `</div>`;

    if (selectedEmotions.length > 0) {
      html += `<button class="action-btn" onclick="alert('編纂机へ移動します（実装予定）')">記入を終えて「編纂机」へ進む</button><br>`;
    }

    html += `<button class="back-btn" onclick="resetApp()">← 入り口に戻る</button>`;
    appDiv.innerHTML = html;
  }
}

// モードを切り替える関数
window.setMode = function(mode) {
  currentMode = mode;
  selectedEmotions = [];
  recommendedBook = null;
  render();
};

// トグルボタンを押した時の処理
window.toggleEmotion = function(key, isQuickMode) {
  if (isQuickMode) {
    // 【特設コーナー】1つ選んだら即座に本を提案（単一選択）
    selectedEmotions = [key];
    const matchedBooks = bookDatabase.filter(book => book.tags.includes(key));
    recommendedBook = matchedBooks.length > 0 
      ? matchedBooks[Math.floor(Math.random() * matchedBooks.length)] 
      : { title: '店主の隠し本', hookText: '今のあなたにぴったりの本を探しています...', coverImageUrl: 'https://via.placeholder.com/200x300/333/fff?text=Secret' };
  } else {
    // 【奥の本棚】複数選択・解除のトグル
    if (selectedEmotions.includes(key)) {
      selectedEmotions = selectedEmotions.filter(e => e !== key); // 解除 (OFF)
    } else {
      selectedEmotions.push(key); // 選択 (ON)
    }
  }
  render();
};

// 最初に戻る関数
window.resetApp = function() {
  currentMode = null;
  selectedEmotions = [];
  recommendedBook = null;
  render();
};

// 初回読み込み時に画面を描画
render();