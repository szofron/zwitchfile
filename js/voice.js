// "Hey Claude" wake word. Uses the browser's built-in speech recognition
// (Web Speech API) and matches the transcript, so it is approximate and
// Chrome/Edge/Safari only. Off by default: the user turns it on by clicking.

const WAKE_PATTERN = /\bhey[,\s]+(claude|cloud|clod|clawed)\b/i;
const COOLDOWN_MS = 3000;
const GLOW_MS = 2600;

const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;

export function initWakeWord({ button, glow }) {
    if (!SpeechRecognitionImpl) {
        button.hidden = true;
        return;
    }

    let recognition = null;
    let enabled = false;
    let lastWake = 0;
    let glowTimer = null;

    function setEnabled(value) {
        enabled = value;
        button.setAttribute("aria-pressed", String(value));
        button.textContent = value ? "Hey Claude: เปิด" : "Hey Claude: ปิด";
    }

    function showGlow() {
        glow.classList.add("active");
        clearTimeout(glowTimer);
        glowTimer = setTimeout(() => glow.classList.remove("active"), GLOW_MS);
    }

    function onWake() {
        const now = Date.now();
        if (now - lastWake < COOLDOWN_MS) return;
        lastWake = now;
        showGlow();
    }

    function onResult(event) {
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (WAKE_PATTERN.test(event.results[i][0].transcript)) {
                onWake();
                return;
            }
        }
    }

    function start() {
        recognition = new SpeechRecognitionImpl();
        recognition.lang = "en-US";
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = onResult;
        recognition.onerror = (event) => {
            // "no-speech" and "aborted" are normal while idle; anything else stops listening.
            if (event.error === "no-speech" || event.error === "aborted") return;
            enabled = false;
            setEnabled(false);
        };
        recognition.onend = () => {
            // Browsers end the session after silence, so restart while still enabled.
            if (enabled) recognition.start();
        };
        recognition.start();
    }

    function stop() {
        enabled = false;
        if (recognition) recognition.stop();
        recognition = null;
        glow.classList.remove("active");
    }

    button.addEventListener("click", () => {
        if (enabled) {
            stop();
            setEnabled(false);
            return;
        }
        setEnabled(true);
        try {
            start();
        } catch (_) {
            setEnabled(false);
        }
    });
}
