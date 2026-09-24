const selectedKana = new Set();
let usedDefault = false;

// --- Persistence helpers ---
const STORAGE_KEY = 'kana_selection';

function saveSelection() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...selectedKana]));
    } catch (e) {}
}

function loadSelection() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            JSON.parse(saved).forEach(k => selectedKana.add(k));
        }
    } catch (e) {}
}

loadSelection();

const hiraganaColumns = [
    { kana: ['あ','い','う','え','お'], romaji: ['a','i','u','e','o'] },
    { kana: ['か','き','く','け','こ'], romaji: ['ka','ki','ku','ke','ko'] },
    { kana: ['さ','し','す','せ','そ'], romaji: ['sa','shi','su','se','so'] },
    { kana: ['た','ち','つ','て','と'], romaji: ['ta','chi','tsu','te','to'] },
    { kana: ['な','に','ぬ','ね','の'], romaji: ['na','ni','nu','ne','no'] },
    { kana: ['は','ひ','ふ','へ','ほ'], romaji: ['ha','hi','fu','he','ho'] },
    { kana: ['ま','み','む','め','も'], romaji: ['ma','mi','mu','me','mo'] },
    { kana: ['や',null,'ゆ',null,'よ'], romaji: ['ya',null,'yu',null,'yo'] },
    { kana: ['ら','り','る','れ','ろ'], romaji: ['ra','ri','ru','re','ro'] },
    { kana: ['わ',null,'ん',null,'を'], romaji: ['wa',null,'n',null,'wo'] },
    { kana: ['が','ぎ','ぐ','げ','ご'], romaji: ['ga','gi','gu','ge','go'] },
    { kana: ['ざ','じ','ず','ぜ','ぞ'], romaji: ['za','ji','zu','ze','zo'] },
    { kana: ['だ','ぢ','づ','で','ど'], romaji: ['da','ji','zu','de','do'] },
    { kana: ['ば','び','ぶ','べ','ぼ'], romaji: ['ba','bi','bu','be','bo'] },
    { kana: ['ぱ','ぴ','ぷ','ぺ','ぽ'], romaji: ['pa','pi','pu','pe','po'] },
];

const katakanaColumns = [
    { kana: ['ア','イ','ウ','エ','オ'], romaji: ['a','i','u','e','o'] },
    { kana: ['カ','キ','ク','ケ','コ'], romaji: ['ka','ki','ku','ke','ko'] },
    { kana: ['サ','シ','ス','セ','ソ'], romaji: ['sa','shi','su','se','so'] },
    { kana: ['タ','チ','ツ','テ','ト'], romaji: ['ta','chi','tsu','te','to'] },
    { kana: ['ナ','ニ','ヌ','ネ','ノ'], romaji: ['na','ni','nu','ne','no'] },
    { kana: ['ハ','ヒ','フ','ヘ','ホ'], romaji: ['ha','hi','fu','he','ho'] },
    { kana: ['マ','ミ','ム','メ','モ'], romaji: ['ma','mi','mu','me','mo'] },
    { kana: ['ヤ',null,'ユ',null,'ヨ'], romaji: ['ya',null,'yu',null,'yo'] },
    { kana: ['ラ','リ','ル','レ','ロ'], romaji: ['ra','ri','ru','re','ro'] },
    { kana: ['ワ',null,'ン',null,'ヲ'], romaji: ['wa',null,'n',null,'wo'] },
    { kana: ['ガ','ギ','グ','ゲ','ゴ'], romaji: ['ga','gi','gu','ge','go'] },
    { kana: ['ザ','ジ','ズ','ゼ','ゾ'], romaji: ['za','ji','zu','ze','zo'] },
    { kana: ['ダ','ヂ','ヅ','デ','ド'], romaji: ['da','ji','zu','de','do'] },
    { kana: ['バ','ビ','ブ','ベ','ボ'], romaji: ['ba','bi','bu','be','bo'] },
    { kana: ['パ','ピ','プ','ペ','ポ'], romaji: ['pa','pi','pu','pe','po'] },
];

document.querySelectorAll('.tab').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        const url = link.getAttribute('href');
        history.pushState({}, '', url);
        loadPage(url);
    });
});

async function loadPage(url) {
    const res = await fetch(url);
    const html = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const newContent = doc.querySelector('#content');
    document.querySelector('#content').replaceWith(newContent);
    document.querySelectorAll('.tab').forEach(t => {
        t.classList.toggle('active', t.getAttribute('href') === url);
    });
    const cleanUrl = url.replace(/\/$/, '');
    if (cleanUrl === '' || cleanUrl === '/hiragana') renderGrid(hiraganaColumns);
    if (cleanUrl === '/katakana') renderGrid(katakanaColumns);
    if (cleanUrl === '/study') initStudy();
}

window.addEventListener('popstate', () => loadPage(window.location.pathname));

function setColSelected(colEl, key, selected) {
    if (selected) {
        selectedKana.add(key);
        colEl.classList.add('selected');
    } else {
        selectedKana.delete(key);
        colEl.classList.remove('selected');
    }
    usedDefault = false;
    saveSelection();
}

function renderGrid(columns) {
    const grid = document.getElementById('kana-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Drag state — scoped to this grid render
    let isDragging = false;
    let dragSelectMode = null; // true = selecting, false = deselecting

    columns.forEach(col => {
        const colEl = document.createElement('div');
        colEl.classList.add('kana-col');

        const key = col.kana.filter(k => k).join('');
        if (selectedKana.has(key)) colEl.classList.add('selected');

        col.kana.forEach((kana, i) => {
            const cell = document.createElement('div');
            cell.classList.add('kana-cell');
            if (!kana) {
                cell.classList.add('empty');
                cell.innerHTML = `<span class="kana">&nbsp;</span><span class="romaji">&nbsp;</span>`;
            } else {
                cell.innerHTML = `
                    <span class="kana">${kana}</span>
                    <span class="romaji">${col.romaji[i]}</span>
                `;
            }
            colEl.appendChild(cell);
        });

        // Mouse drag: start on mousedown, apply on mouseenter while dragging
        colEl.addEventListener('mousedown', (e) => {
            e.preventDefault(); // prevent text selection while dragging
            isDragging = true;
            // Mode is determined by the opposite of current state
            dragSelectMode = !selectedKana.has(key);
            setColSelected(colEl, key, dragSelectMode);
        });

        colEl.addEventListener('mouseenter', () => {
            if (!isDragging) return;
            setColSelected(colEl, key, dragSelectMode);
        });

        // Touch drag support
        colEl.addEventListener('touchstart', (e) => {
            isDragging = true;
            dragSelectMode = !selectedKana.has(key);
            setColSelected(colEl, key, dragSelectMode);
        }, { passive: true });

        grid.appendChild(colEl);
    });

    // End drag on mouseup anywhere
    const stopDrag = () => { isDragging = false; dragSelectMode = null; };
    document.addEventListener('mouseup', stopDrag, { once: false });

    // Touch drag: find element under finger and apply selection
    grid.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const touch = e.touches[0];
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        if (!el) return;
        const colEl = el.closest('.kana-col');
        if (!colEl) return;
        // Find the key for this colEl
        const kanaSpans = colEl.querySelectorAll('.kana');
        const key = [...kanaSpans].map(s => s.textContent.trim()).filter(t => t && t !== '\u00a0').join('');
        if (!key) return;
        if (dragSelectMode && !selectedKana.has(key)) {
            selectedKana.add(key);
            colEl.classList.add('selected');
            usedDefault = false;
            saveSelection();
        } else if (!dragSelectMode && selectedKana.has(key)) {
            selectedKana.delete(key);
            colEl.classList.remove('selected');
            usedDefault = false;
            saveSelection();
        }
    }, { passive: true });

    grid.addEventListener('touchend', stopDrag, { passive: true });
}

function buildQueue() {
    const queue = [];
    [...hiraganaColumns, ...katakanaColumns].forEach(col => {
        const key = col.kana.filter(k => k).join('');
        if (selectedKana.has(key)) {
            col.kana.forEach((kana, i) => {
                if (kana) queue.push({ kana, romaji: col.romaji[i] });
            });
        }
    });

    if (queue.length === 0) {
        usedDefault = true;
        const defaultKey = hiraganaColumns[0].kana.filter(k => k).join('');
        selectedKana.add(defaultKey);
        hiraganaColumns[0].kana.forEach((kana, i) => {
            if (kana) queue.push({ kana, romaji: hiraganaColumns[0].romaji[i] });
        });
    }

    return shuffle(queue);
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
}

function getScoreKey(queue) {
    return 'best_' + queue.map(q => q.kana).sort().join('');
}

function initStudy() {
    const kanaEl = document.getElementById('study-kana');
    const input = document.getElementById('study-input');
    const feedback = document.getElementById('study-feedback');
    const tracker = document.getElementById('study-tracker');

    if (!kanaEl || !input) return;

    const queue = buildQueue();
    const scoreKey = getScoreKey(queue);
    let index = 0;
    let correct = 0;
    let startTime = null;
    let firstTry = true;
    let wrongState = 0;
    let waiting = false;

    tracker.textContent = '';

    function show() {
        if (!document.getElementById('study-kana')) return;
        waiting = false;
        kanaEl.textContent = queue[index].kana;
        input.value = '';
        feedback.textContent = '';
        feedback.className = '';
        firstTry = true;
        wrongState = 0;
        input.focus();
        if (index === 0) startTime = Date.now();
    }

    function complete() {
        const elapsed = Date.now() - startTime;
        const prevBest = localStorage.getItem(scoreKey);
        const isPerfect = correct === queue.length;
        const isNewBest = isPerfect && (!prevBest || elapsed < parseInt(prevBest));
        if (isNewBest) localStorage.setItem(scoreKey, elapsed);

        const star = isNewBest ? ' ★' : '';
        const bestText = isPerfect && prevBest && !isNewBest ? ` (best ${formatTime(parseInt(prevBest))})` : '';
        tracker.textContent = `${correct}/${queue.length} ${formatTime(elapsed)}${star}${bestText}`;
        tracker.className = isNewBest ? 'tracker-best' : '';

        index = 0;
        correct = 0;
        shuffle(queue);
        show();

        setTimeout(() => {
            if (!document.getElementById('study-tracker')) return;
            tracker.textContent = '';
            tracker.className = '';
        }, 2500);
    }

    input.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        if (waiting) return;

        if (wrongState === 2) {
            index++;
            tracker.textContent = `${correct}/${index}`;
            if (index >= queue.length) {
                complete();
            } else {
                show();
            }
            return;
        }

        if (wrongState === 1) {
            const answer = input.value.trim().toLowerCase();
            if (answer === queue[index].romaji) {
                index++;
                tracker.textContent = `${correct}/${index}`;
                if (index >= queue.length) {
                    complete();
                } else {
                    show();
                }
            } else {
                feedback.textContent = queue[index].romaji;
                feedback.className = 'feedback-answer';
                wrongState = 2;
            }
            return;
        }

        const answer = input.value.trim().toLowerCase();

        if (answer === '') {
            firstTry = false;
            feedback.textContent = queue[index].romaji;
            feedback.className = 'feedback-answer';
            wrongState = 2;
            return;
        }

        if (answer === queue[index].romaji) {
            if (firstTry) correct++;
            index++;
            tracker.textContent = `${correct}/${index}`;
            if (index >= queue.length) {
                complete();
            } else {
                show();
            }
        } else {
            firstTry = false;
            feedback.textContent = '✗';
            feedback.className = 'feedback-wrong';
            wrongState = 1;
        }
    });

    show();
}

const path = window.location.pathname.replace(/\/$/, '');
if (path === '/katakana') renderGrid(katakanaColumns);
else if (path === '/study') initStudy();
else renderGrid(hiraganaColumns);