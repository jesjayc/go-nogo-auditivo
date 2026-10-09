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

const INTERVAL_TIME = 1000;
const TEST_WORDS = ["sim", "pe", "dor"];

let state = {
    participantId: '',
    stage: "NAME_SCREEN",
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
    aborted: false,
};

let audioPlayingTest = false;
let audioPlayed = false;
let currentAudio = null;

const ABORT_CODE = "0001"; // Padronizado para os 4 dígitos
let abortBuffer = "";
let abortBufferTimer = null;

// --- RENDERIZADOR CENTRAL ---
function render() {
    document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));

    if (state.stage === "NAME_SCREEN") {
        document.getElementById("screen-name").classList.remove("hidden");
    } else if (state.stage === "AUDIO_TEST") {
        document.getElementById("screen-audio-test").classList.remove("hidden");
    } else if (state.stage === "INSTRUCTIONS") {
        document.getElementById("screen-instructions").classList.remove("hidden");
    } else if (state.stage === "POST_TRIAL") {
        document.getElementById("screen-post-trial").classList.remove("hidden");
        startCoolDown();
    } else if (state.stage === "TESTING") {
        document.getElementById("screen-test-area").classList.remove("hidden");
    } else if (state.stage === "RESULTS") {
        document.getElementById("screen-results").classList.remove("hidden");
    }
}

// --- CONTROLE DA TELA DE IDENTIFICAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    const inputName = document.getElementById('participant-name-input');
    const btnSubmitName = document.getElementById('btn-submit-name');

    const submitName = () => {
        const val = inputName.value.trim();
        if (!val) {
            alert("Por favor, digite seu nome ou ID para começar o teste.");
            inputName.focus();
            return;
        }
        state.participantId = val;
        state.stage = "AUDIO_TEST";
        render();
    };

    if(btnSubmitName) btnSubmitName.addEventListener('click', submitName);
    if(inputName) inputName.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') submitName();
    });

    document.getElementById('btn-copy-bkp').onclick = copyToClipboard;
    document.getElementById('btn-exit').onclick = () => location.reload();
});

// --- SETUP DO GRID DE ÁUDIO ---
const audioGrid = document.getElementById("audio-options");
const audioList = ["sim", "nos", "rei", "pe", "chao", "faz", "luz", "dor", "pao", "cor"];

audioList.forEach(word => {
    const btn = document.createElement("div");
    btn.className = "btn-opt";
    btn.dataset.word = word;
    btn.innerText = WORD_LABELS[word] || word;
    btn.onclick = () => {
        btn.classList.toggle("selected");
        checkAudioTest();
    };
    audioGrid.appendChild(btn);
});

function checkAudioTest() {
    const selectedNodes = document.querySelectorAll("#audio-options .btn-opt.selected");
    const selected = new Set([...selectedNodes].map(b => b.dataset.word));
    const feedback = document.getElementById("audio-test-feedback");
    const btnNext = document.getElementById("btn-start-instructions");

    if (selectedNodes.length === TEST_WORDS.length) {
        const correct = TEST_WORDS.every(w => selected.has(w));

        if (correct && audioPlayed) {
            feedback.textContent = "Perfeito! Áudio validado.";
            feedback.style.color = "var(--cyan)";
            btnNext.classList.remove("hidden");
        } else {
            feedback.textContent = "Incorreto. Ouça novamente e selecione as 3 palavras corretas.";
            feedback.style.color = "var(--nogo-red)";
            btnNext.classList.add("hidden");
        }
    } else {
        feedback.textContent = "";
        btnNext.classList.add("hidden");
    }
}

function playSequentially(sounds, idx, onDone) {
    if (idx >= sounds.length) {
        onDone();
        return;
    }
    const audio = new Audio(`src/audio/${sounds[idx]}.mp3`);
    audio.onended = () => playSequentially(sounds, idx + 1, onDone);
    audio.onerror = () => playSequentially(sounds, idx + 1, onDone);
    audio.play().catch(() => playSequentially(sounds, idx + 1, onDone));
}

// --- CENTRAL DE COMANDOS (Super Listener) ---
window.addEventListener(
    "keydown",
    e => {
        // Bloqueia qualquer captura de tecla espaço na tela de identificação para poder digitar normalmente
        if (document.activeElement && document.activeElement.tagName === 'INPUT') return;

        const key = e.key.toLowerCase();
        const code = e.code;

        // Código de Abortar (0001)
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

        if (code !== "Space") return;
        e.preventDefault();
        triggerSpaceFlash();

        if (state.lockNavigation) return;

        if (state.stage === "TESTING") {
            if (state.testActive && !state.hasResponded && state.presentationWindowOpen) {
                const rt = Date.now() - state.reactionStartTime;
                state.hasResponded = true;
                recordData(true, rt);
            }
            return;
        }

        if (!state.isRunning) {
            if (state.stage === "AUDIO_TEST") {
                const btn = document.getElementById("btn-start-instructions");
                if (btn && btn.offsetParent !== null && !btn.classList.contains("hidden")) btn.click();
            } else if (state.stage === "INSTRUCTIONS") {
                startPhase(false);
            } else if (state.stage === "POST_TRIAL") {
                startPhase(true); 
            }
        }
    },
    true
);

// --- CLIQUES DE BOTÃO ---
document.getElementById("btn-play-test").onclick = () => {
    if (audioPlayingTest) return;
    const btnPlay = document.getElementById("btn-play-test");

    audioPlayingTest = true;
    btnPlay.disabled = true;
    btnPlay.innerHTML = "⏳ Reproduzindo...";

    playSequentially(TEST_WORDS, 0, () => {
        audioPlayingTest = false;
        btnPlay.disabled = false;
        btnPlay.innerHTML = "▶ REPRODUZIR NOVAMENTE"; 
        audioPlayed = true;
        checkAudioTest();
    });
};

document.getElementById("btn-start-instructions").onclick = () => {
    state.stage = "INSTRUCTIONS";
    render();
};

document.getElementById("btn-start-test").onclick = () => {
    if (!state.lockNavigation) startPhase(false);
};

document.getElementById("btn-start-official").onclick = () => {
    if (!state.lockNavigation) startPhase(true);
};

// --- NÚCLEO DO TESTE ---
function triggerSpaceFlash() {
    const icon = document.getElementById("audio-icon-test");
    if (!icon) return;

    icon.classList.remove("space-flash");
    void icon.offsetWidth;
    icon.classList.add("space-flash");

    setTimeout(() => { icon.classList.remove("space-flash"); }, 260);
}

function startPhase(isOfficial) {
    state.seq = isOfficial ? SEQ_OFICIAL : SEQ_TRIAL;
    state.isOfficial = isOfficial;
    state.currentIdx = 0;
    state.results = [];
    state.isRunning = true;
    state.aborted = false;
    state.stage = "TESTING";
    render();

    const shield = document.getElementById("prepare-shield");
    const icon = document.getElementById("audio-icon-test");

    if (shield && icon) {
        shield.style.display = "flex";
        shield.style.opacity = "1";
        icon.style.display = "none";
    }

    state.lockNavigation = true;

    setTimeout(() => {
        if (state.aborted) return;
        if (shield && icon) {
            shield.style.display = "none";
            icon.style.display = "flex";
        }
        state.lockNavigation = false;
        startMainTest();
    }, 2000);
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
    const isNoGo = word === "sim";
    const status = isNoGo ? (pressed ? "E" : "OK") : pressed ? "A" : "O";
    state.results.push({ word, isNoGo, pressed, reactionTime: rt, status });
}

function finishTest() {
    state.testActive = false;
    state.isRunning = false;
    currentAudio = null;

    state.lockNavigation = true;
    setTimeout(() => {
        if (state.stage !== "POST_TRIAL") state.lockNavigation = false;
    }, 1500);

    if (state.isOfficial) {
        state.stage = "RESULTS";
        render();
        sendResultsByEmail();
    } else {
        state.stage = "POST_TRIAL";
        render(); 
    }
}

function startCoolDown() {
    state.lockNavigation = true;
    const btnOfficial = document.getElementById("btn-start-official");
    let timer = 10;

    btnOfficial.disabled = true;
    btnOfficial.style.opacity = "0.5";
    btnOfficial.innerText = `AGUARDE (${timer}s)`;

    const countdown = setInterval(() => {
        if (state.aborted || state.stage !== "POST_TRIAL") {
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
            btnOfficial.innerText = "COMEÇAR ETAPA OFICIAL (ESPAÇO)";
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

    state.stage = "RESULTS";
    render();
    sendResultsByEmail();
}

// --- ENVIO AUTOMÁTICO PARA A API ---
async function sendResultsByEmail() {
    const statusText = document.getElementById('email-status-text');
    if(!statusText) return;
    statusText.textContent = '⏳ Enviando resultados para o servidor...';

    const fields = ["indice", "palavra", "tipo", "pressionou", "tempo_reacao_ms", "status"];
    
    const rows = state.results.map((r, i) => [
        i + 1,
        r.word,
        r.isNoGo ? "No-Go" : "Go",
        r.pressed ? "sim" : "nao",
        r.reactionTime,
        r.status
    ].join(';'));
    
    const headerRow = fields.join(';');
    const csvContent = [headerRow, ...rows].join('\n');

    try {
        const response = await fetch('/api/enviar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dadosCSV: csvContent,
                participante: state.participantId
            })
        });

        if (response.ok) {
            statusText.innerHTML = '✅ Resultados salvos e enviados com sucesso!';
            statusText.style.color = 'var(--cyan)';
        } else {
            throw new Error('Erro no servidor');
        }
    } catch (error) {
        console.error("Erro:", error);
        statusText.innerHTML = '❌ Erro no envio automático. Por favor, clique em "COPIAR DADOS BRUTOS".';
        statusText.style.color = 'var(--nogo-red)';
    }
}

// --- BACKUP MANUAL ---
function copyToClipboard() {
    const fields = ["indice", "palavra", "tipo", "pressionou", "tempo_reacao_ms", "status"];
    
    const rows = state.results.map((r, i) => [
        i + 1,
        r.word,
        r.isNoGo ? "No-Go" : "Go",
        r.pressed ? "sim" : "nao",
        r.reactionTime,
        r.status
    ].join('\t'));
    
    const headerRow = fields.join('\t');
    const clipText = [headerRow, ...rows].join('\n');
    
    navigator.clipboard.writeText(clipText).then(() => {
        alert("Resultados copiados! Cole (Ctrl+V) no Excel.");
    }).catch(err => {
        alert("Erro ao copiar.");
    });
}

render();