const SEQ_TRIAL = [
    "luz","mao","pao","sim","chao","sim","pe","mar","rei","sou",
    "lar","sim","faz","dor","cor","sol","nos","bom","sim","sim"
];

const SEQ_OFICIAL = [
    "sim","chao","dor","sol","mar","cor","luz","faz","lar","nos",
    "vem","pe","rei","sou","pao","bom","vou","sim","mao","um",
    "mal","sim","vos","sim","sim","cor","pe","sim","mar","sou",
    "luz","dor","sol","rei","nos","faz","sim","vos","vou","mao",
    "sim","lar","pao","vem","chao","sim","bom","um","sim","sim",
    "sim","mao","dor","mar","sol","vou","lar","nos","luz","cor",
    "faz","sou","pe","pao","sim","chao","rei","bom","sim","sim",
    "um","sim","sim","vos","vem","sim","sim","sim","vou","luz",
    "mao","pao","sim","chao","sim","pe","mar","rei","sou","lar",
    "sim","faz","dor","cor","sol","nos","bom","sim","sim","um",
    "sim","um","vos","sim","sim","sim","pao","luz","lar","dor",
    "cor","mar","sol","faz","mao","sim","vou","chao","sim","nos",
    "bom","sou","pe","sim","vem","sim","rei","sim","um","sim",
    "sim","sim","pao","vou","luz","dor","mao","lar","cor","sim",
    "sol","mar","nos","faz","sim","pe","bom","chao","sim","sou",
    "rei","sim","sim","vem","sim","sim","sim","um","sim","vos",
    "sim","sim","sim","pao","dor","luz","mao","vou","lar","cor",
    "sol","mar","faz","nos","sim","pe","bom","sim","chao","sou",
    "rei","sim","sim","vem","sim","um","vos","sim","sim","sim",
    "pao","luz","mao","vou","dor","lar","cor","sol","mar","faz",
    "rei","sim","sim","vem","sim","um","vos","sim","sim","sim",
    "dor","pao","luz","mao","vou","lar","cor","sol","mar","faz",
    "nos","sim","pe","bom","sim","chao","sou","sim","rei","sim",
    "vem","sim","um","sim","vos","sim","sim","sim","dor","pao",
    "luz","mao","vou","lar","cor","sol","mar","faz","nos","sim",
    "pe","bom","sim","chao","sou","sim","rei","sim","vem","sim",
    "um","sim","vos","sim","sim","sim","dor","pao","luz","mao",
    "vou","lar","cor","sol","mar","faz","nos","sim","pe","bom",
    "chao","sou","rei","sim","sim","vem","sim","um","sim","vos",
    "sim","sim","vou","mao","dor","pao","luz","sim","vou","lar"
];

const WORD_LABELS = {
    "sim": "Sim", "nao": "Não", "nos": "Nós", "rei": "Rei", "pe": "Pé",
    "chao": "Chão", "faz": "Faz", "luz": "Luz", "dor": "Dor",
    "pao": "Pão", "cor": "Cor", "mar": "Mar", "sol": "Sol",
    "lar": "Lar", "vem": "Vem", "sou": "Sou", "bom": "Bom",
    "vou": "Vou", "mao": "Mão", "um": "Um", "mal": "Mal",
    "vos": "Vós"
};

const INTERVAL_TIME = 1500;
const TEST_WORDS = ["sim", "pe", "dor"];

let state = {
    stage: 'AUDIO_TEST',
    currentIdx: 0,
    results: [],
    seq: [],
    isOfficial: false,
    isRunning: false,
    lockNavigation: false,
    reactionStartTime: 0,
    hasResponded: false,
    testActive: false,
    presentationWindowOpen: false,
    aborted: false
};

let audioPlayingTest = false;
let audioPlayed = false;
let currentAudio = null;

const ABORT_CODE = "end42";
let abortBuffer = "";
let abortBufferTimer = null;

// --- RENDERIZADOR CENTRAL ---
function render() {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));

    if (state.stage === 'AUDIO_TEST') {
        document.getElementById('screen-audio-test').classList.remove('hidden');
    } else if (state.stage === 'INSTRUCTIONS') {
        document.getElementById('screen-instructions').classList.remove('hidden');
    } else if (state.stage === 'POST_TRIAL') {
        document.getElementById('screen-post-trial').classList.remove('hidden');
        startCoolDown(); // Inicia o timer de 10s automaticamente ao renderizar
    } else if (state.stage === 'TESTING') {
        document.getElementById('screen-test-area').classList.remove('hidden');
    } else if (state.stage === 'RESULTS') {
        document.getElementById('screen-results').classList.remove('hidden');
    }
}

// --- SETUP DO GRID DE ÁUDIO ---
const audioGrid = document.getElementById('audio-options');
const audioList = ["sim", "nos", "rei", "pe", "chao", "faz", "luz", "dor", "pao", "cor"];

audioList.forEach(word => {
    const btn = document.createElement('div');
    btn.className = 'btn-opt';
    btn.dataset.word = word;
    btn.innerText = WORD_LABELS[word] || word;
    btn.onclick = () => {
        btn.classList.toggle('selected');
        checkAudioTest();
    };
    audioGrid.appendChild(btn);
});

function checkAudioTest() {
    const selectedNodes = document.querySelectorAll('#audio-options .btn-opt.selected');
    const selected = new Set([...selectedNodes].map(b => b.dataset.word));
    const feedback = document.getElementById('audio-test-feedback');
    const btnNext = document.getElementById('btn-start-instructions');

    if (selectedNodes.length === TEST_WORDS.length) {
        const correct = TEST_WORDS.every(w => selected.has(w));
        
        if (correct && audioPlayed) {
            feedback.textContent = 'Perfeito! Áudio validado.';
            feedback.style.color = 'var(--go-green)';
            btnNext.classList.remove('hidden');
        } else {
            feedback.textContent = 'Incorreto. Ouça novamente e selecione as 3 palavras corretas.';
            feedback.style.color = 'var(--nogo-red)';
            btnNext.classList.add('hidden');
        }
    } else {
        feedback.textContent = '';
        btnNext.classList.add('hidden');
    }
}

function playSequentially(sounds, idx, onDone) {
    if (idx >= sounds.length) { onDone(); return; }
    const audio = new Audio(`src/audio/${sounds[idx]}.mp3`);
    audio.onended = () => playSequentially(sounds, idx + 1, onDone);
    audio.onerror = () => playSequentially(sounds, idx + 1, onDone);
    audio.play().catch(() => playSequentially(sounds, idx + 1, onDone));
}

// --- CENTRAL DE COMANDOS (Super Listener) ---
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    const code = e.code;

    // 1. Código de Abortar
    if (key.length === 1 && /[a-z0-9]/i.test(key)) {
        abortBuffer = (abortBuffer + key).slice(-ABORT_CODE.length);
        clearTimeout(abortBufferTimer);
        abortBufferTimer = setTimeout(() => { abortBuffer = ""; }, 2000);
        if (abortBuffer === ABORT_CODE) {
            abortBuffer = "";
            abortTest();
            return;
        }
    }

    if (code !== 'Space') return;
    e.preventDefault();

    // Bloqueio de Navegação (Cooldown / Escudos)
    if (state.lockNavigation) return; 

    // 2. Resposta do Teste
    if (state.stage === 'TESTING') {
        if (state.testActive && !state.hasResponded && state.presentationWindowOpen) {
            const rt = Date.now() - state.reactionStartTime;
            state.hasResponded = true;
            recordData(true, rt);
        }
        return;
    }

    // 3. Navegação
    if (!state.isRunning) {
        if (state.stage === 'AUDIO_TEST') {
            const btn = document.getElementById('btn-start-instructions');
            if (btn && btn.offsetParent !== null && !btn.classList.contains('hidden')) {
                btn.click();
            }
        } else if (state.stage === 'INSTRUCTIONS') {
            startPhase(false); // Inicia Treino
        } else if (state.stage === 'POST_TRIAL') {
            startPhase(true); // Inicia Oficial
        }
    }
}, true);


// --- FLUXO DE TELAS E CLIQUES DE BOTÃO ---
document.getElementById('btn-play-test').onclick = () => {
    if (audioPlayingTest) return;
    
    const btnPlay = document.getElementById('btn-play-test');
    
    audioPlayingTest = true;
    btnPlay.disabled = true;
    btnPlay.innerHTML = '⏳ Reproduzindo...'; // Muda para a ampulheta

    playSequentially(TEST_WORDS, 0, () => {
        audioPlayingTest = false;
        btnPlay.disabled = false;
        btnPlay.innerHTML = '▶ REPRODUZIR NOVAMENTE'; // Retorna com o novo texto
        audioPlayed = true;
        checkAudioTest();
    });
};

document.getElementById('btn-start-instructions').onclick = () => {
    state.stage = 'INSTRUCTIONS';
    render();
};

document.getElementById('btn-start-test').onclick = () => {
    if (!state.lockNavigation) startPhase(false);
};

document.getElementById('btn-start-official').onclick = () => {
    if (!state.lockNavigation) startPhase(true);
};

// --- NÚCLEO DO TESTE (com textinho - funciona como escudo - de "Prepare-se") ---
function startPhase(isOfficial) {
    state.seq = isOfficial ? SEQ_OFICIAL : SEQ_TRIAL;
    state.isOfficial = isOfficial;
    state.currentIdx = 0;
    state.results = [];
    state.isRunning = true;
    state.aborted = false;
    state.stage = 'TESTING';
    render();

    // Aciona o texto "Prepare-se"
    const shield = document.getElementById('prepare-shield');
    const icon = document.getElementById('audio-icon-test');
    
    if (shield && icon) {
        shield.style.display = 'block';
        icon.style.display = 'none';
    }

    // Bloqueia o teclado até o áudio realmente começar
    state.lockNavigation = true; 

    setTimeout(() => {
        if (state.aborted) return;
        
        if (shield && icon) {
            shield.style.display = 'none';
            icon.style.display = 'block';
        }
        
        state.lockNavigation = false;
        startMainTest();
    }, 2000); // 2 segundos de "escudo" visual
}

function startMainTest() {
    state.testActive = true;
    runTrial();
}

function runTrial() {
    if (state.aborted) return;
    if (state.currentIdx >= state.seq.length) {
        finishTest();
        return;
    }

    const currentWord = state.seq[state.currentIdx];
    const audio = new Audio(`src/audio/${currentWord}.mp3`);
    currentAudio = audio;

    state.hasResponded = false;
    state.presentationWindowOpen = true;
    state.reactionStartTime = Date.now();

    audio.play().catch(() => {});

    const advance = () => {
        if (state.aborted) return;
        state.presentationWindowOpen = false;
        if (!state.hasResponded) recordData(false, 0);
        state.currentIdx++;
        setTimeout(runTrial, INTERVAL_TIME);
    };

    audio.onended = advance;
    audio.onerror = advance;
}

function recordData(pressed, rt) {
    const word = state.seq[state.currentIdx];
    const isNoGo = (word === "sim");
    const status = isNoGo ? (pressed ? "E" : "OK") : (pressed ? "A" : "O");
    state.results.push({ word, isNoGo, pressed, reactionTime: rt, status });
}

function finishTest() {
    state.testActive = false;
    state.isRunning = false;
    currentAudio = null;

    // Escudo Pós-Teste (Bloqueia o ESPAÇO por 1.5s contra ansiedade/reflexo do paciente)
    state.lockNavigation = true;
    setTimeout(() => {
        // Se já tiver ido para o POST_TRIAL, o startCoolDown() assume o controle
        if (state.stage !== 'POST_TRIAL') {
            state.lockNavigation = false; 
        }
    }, 1500);

    if (state.isOfficial) {
        state.stage = 'RESULTS';
        render();
    } else {
        state.stage = 'POST_TRIAL';
        render(); // O render acionará o startCoolDown automaticamente
    }
}

function startCoolDown() {
    state.lockNavigation = true;
    const btnOfficial = document.getElementById('btn-start-official');
    let timer = 10;
    
    btnOfficial.disabled = true;
    btnOfficial.style.opacity = "0.5";
    btnOfficial.innerText = `AGUARDE (${timer}s)`;

    const countdown = setInterval(() => {
        // Interrompe se o teste for abortado durante o cooldown
        if (state.aborted || state.stage !== 'POST_TRIAL') {
            clearInterval(countdown);
            return; 
        }

        timer--;
        btnOfficial.innerText = `AGUARDE (${timer}s)`;
        
        if (timer <= 0) {
            clearInterval(countdown);
            state.lockNavigation = false;
            btnOfficial.disabled = false;
            btnOfficial.style.opacity = "1";
            btnOfficial.innerText = "INICIAR OFICIAL (ESPAÇO)";
        }
    }, 1000);
}

function abortTest() {
    if (!state.isRunning) return;
    state.aborted = true;
    state.testActive = false;
    state.presentationWindowOpen = false;
    state.isRunning = false;
    state.lockNavigation = false;
    
    if (currentAudio) {
        currentAudio.onended = null;
        currentAudio.onerror = null;
        try { currentAudio.pause(); } catch (_) {}
        currentAudio = null;
    }
    
    if (!state.results.length) {
        location.reload();
        return;
    }
    
    state.stage = 'RESULTS';
    render();
}

// --- GERAÇÃO DE CSV ---
function downloadCSV() {
    const fields = ['indice', 'palavra', 'tipo', 'pressionou', 'tempo_reacao_ms', 'status'];
    const rows = state.results.map((r, i) => [
        i + 1,
        r.word,
        r.isNoGo ? 'No-Go' : 'Go',
        r.pressed ? 'sim' : 'nao',
        r.reactionTime,
        r.status
    ]);
    const headerRow = ['campo', ...rows.map((_, i) => i + 1)];
    const fieldRows = fields.map((field, fi) => [field, ...rows.map(row => row[fi])]);
    const csv = [headerRow, ...fieldRows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resultados-go-nogo-auditivo-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

document.getElementById('btn-download-csv').onclick = downloadCSV;

render();