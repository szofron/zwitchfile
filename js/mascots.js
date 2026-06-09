/* Mascot SVG factory — returns inline SVG strings for each file family. */
(function (global) {
    "use strict";

    const COLORS = {
        cream: "#FAF6EC",
        cream2: "#FFFDF6",
        indigo: "#3730A3",
        indigoSoft: "#EEF2FF",
        maroon: "#7C2D3F",
        maroonLight: "#B0556A",
        green: "#2E7D5B",
        greenLight: "#5BA989",
        amber: "#C77D2A",
        amberLight: "#E8AE5F",
        slate: "#4B5563",
        ink: "#1F1B2E",
    };

    function face(eyeColor, smileColor) {
        // Little smiling face overlay (eyes + smile)
        return `
            <circle cx="44" cy="58" r="2.6" fill="${eyeColor}"/>
            <circle cx="60" cy="58" r="2.6" fill="${eyeColor}"/>
            <path d="M44 66 Q52 72 60 66" stroke="${smileColor}" stroke-width="2.4"
                  stroke-linecap="round" fill="none"/>
            <circle cx="36" cy="63" r="2" fill="#F3B6B6" opacity="0.55"/>
            <circle cx="68" cy="63" r="2" fill="#F3B6B6" opacity="0.55"/>
        `;
    }

    function mascotBase(bodyColor, accentColor, badge) {
        // Rounded card body with a tiny corner fold; face inside; badge label
        return `
            <svg viewBox="0 0 104 104" width="100%" height="100%"
                 xmlns="http://www.w3.org/2000/svg" role="img">
                <defs>
                    <linearGradient id="bg-${badge}" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"  stop-color="${bodyColor}" stop-opacity="0.95"/>
                        <stop offset="100%" stop-color="${bodyColor}"/>
                    </linearGradient>
                </defs>
                <!-- shadow -->
                <ellipse cx="52" cy="96" rx="26" ry="4" fill="${COLORS.ink}" opacity="0.10"/>
                <!-- body -->
                <path d="M20 16
                         Q20 8 28 8
                         L66 8
                         L88 30
                         L88 86
                         Q88 94 80 94
                         L28 94
                         Q20 94 20 86 Z"
                      fill="url(#bg-${badge})" stroke="${accentColor}" stroke-width="1.5"/>
                <!-- folded corner -->
                <path d="M66 8 L88 30 L70 30 Q66 30 66 26 Z"
                      fill="${COLORS.cream2}" opacity="0.85"/>
                <!-- face -->
                ${face(COLORS.ink, COLORS.ink)}
                <!-- badge -->
                <rect x="26" y="76" width="52" height="14" rx="7" fill="${COLORS.cream2}" opacity="0.85"/>
                <text x="52" y="86" text-anchor="middle"
                      font-family="system-ui, sans-serif"
                      font-weight="700" font-size="9.5" fill="${accentColor}">${badge}</text>
            </svg>
        `;
    }

    function imageMascot() {
        // Card with little mountain + sun
        return `
            <svg viewBox="0 0 104 104" width="100%" height="100%"
                 xmlns="http://www.w3.org/2000/svg" role="img">
                <ellipse cx="52" cy="96" rx="26" ry="4" fill="${COLORS.ink}" opacity="0.10"/>
                <rect x="16" y="14" width="72" height="80" rx="14"
                      fill="${COLORS.maroonLight}" stroke="${COLORS.maroon}" stroke-width="1.5"/>
                <!-- sky panel -->
                <rect x="22" y="22" width="60" height="44" rx="6" fill="${COLORS.cream2}"/>
                <circle cx="68" cy="34" r="6" fill="${COLORS.amber}"/>
                <path d="M22 60 L36 44 L48 56 L60 40 L82 60 Z" fill="${COLORS.greenLight}"/>
                <path d="M22 60 L36 44 L48 56 L60 40 L82 60 Z" fill="${COLORS.green}" opacity="0.6"/>
                ${face(COLORS.ink, COLORS.ink).replace(/cy="58"/g, 'cy="78"').replace(/cy="66"/g, 'cy="86"').replace(/Q52 72 60 66/, "Q52 92 60 86")}
                <rect x="26" y="74" width="52" height="14" rx="7" fill="${COLORS.cream2}" opacity="0.92"/>
                <text x="52" y="84" text-anchor="middle"
                      font-family="system-ui, sans-serif"
                      font-weight="700" font-size="9.5" fill="${COLORS.maroon}">IMAGE</text>
            </svg>
        `;
    }

    function genericMascot() {
        return mascotBase(COLORS.cream2, COLORS.slate, "FILE");
    }

    function dropMascot() {
        // Mascot with an arrow above showing "drop here" — cream body, indigo arrow
        return `
            <svg viewBox="0 0 110 110" width="100%" height="100%"
                 xmlns="http://www.w3.org/2000/svg" role="img">
                <ellipse cx="55" cy="102" rx="28" ry="4" fill="${COLORS.ink}" opacity="0.10"/>
                <!-- body -->
                <path d="M22 36
                         Q22 26 32 26
                         L70 26
                         L88 44
                         L88 92
                         Q88 100 80 100
                         L30 100
                         Q22 100 22 92 Z"
                      fill="${COLORS.cream2}" stroke="${COLORS.indigo}" stroke-width="1.8"/>
                <path d="M70 26 L88 44 L72 44 Q70 44 70 42 Z" fill="${COLORS.indigoSoft}"/>
                <!-- face -->
                <circle cx="46" cy="64" r="3" fill="${COLORS.ink}"/>
                <circle cx="64" cy="64" r="3" fill="${COLORS.ink}"/>
                <path d="M46 74 Q55 82 64 74" stroke="${COLORS.maroon}" stroke-width="2.6"
                      stroke-linecap="round" fill="none"/>
                <!-- arrow -->
                <path d="M55 4 L55 22 M48 16 L55 23 L62 16"
                      stroke="${COLORS.indigo}" stroke-width="3" stroke-linecap="round" fill="none"/>
            </svg>
        `;
    }

    function modalArt(kind) {
        const tone = kind === "error" ? COLORS.maroon : COLORS.indigo;
        const fill = kind === "error" ? COLORS.maroonLight : COLORS.indigoSoft;
        const cheek = kind === "error" ? "#F3B6B6" : "#C7CBF0";
        const mouth = kind === "error"
            ? `<path d="M44 70 Q52 64 60 70" stroke="${tone}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
            : `<path d="M44 64 Q52 72 60 64" stroke="${tone}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
        return `
            <svg viewBox="0 0 104 104" width="100%" height="100%"
                 xmlns="http://www.w3.org/2000/svg" role="img">
                <ellipse cx="52" cy="98" rx="24" ry="3" fill="${COLORS.ink}" opacity="0.10"/>
                <circle cx="52" cy="52" r="40" fill="${fill}" stroke="${tone}" stroke-width="2"/>
                <circle cx="42" cy="50" r="3.2" fill="${tone}"/>
                <circle cx="62" cy="50" r="3.2" fill="${tone}"/>
                <circle cx="36" cy="60" r="2.6" fill="${cheek}"/>
                <circle cx="68" cy="60" r="2.6" fill="${cheek}"/>
                ${mouth}
            </svg>
        `;
    }

    const MASCOT_MAP = {
        pdf:   () => mascotBase("#F2C6CB", COLORS.maroon, "PDF"),
        docx:  () => mascotBase("#C8C5EE", COLORS.indigo, "DOCX"),
        doc:   () => mascotBase("#C8C5EE", COLORS.indigo, "DOC"),
        xlsx:  () => mascotBase("#C9E8D8", COLORS.green, "XLSX"),
        xls:   () => mascotBase("#C9E8D8", COLORS.green, "XLS"),
        csv:   () => mascotBase("#E9D9B7", COLORS.amber, "CSV"),
        pptx:  () => mascotBase("#F2D9B7", COLORS.amber, "PPTX"),
        ppt:   () => mascotBase("#F2D9B7", COLORS.amber, "PPT"),
        txt:   () => mascotBase(COLORS.cream2, COLORS.slate, "TXT"),
        html:  () => mascotBase("#F2D9B7", COLORS.amber, "HTML"),
        json:  () => mascotBase("#C8C5EE", COLORS.indigo, "JSON"),
        jpg:   () => imageMascot(),
        jpeg:  () => imageMascot(),
        png:   () => imageMascot(),
        webp:  () => imageMascot(),
        bmp:   () => imageMascot(),
        gif:   () => imageMascot(),
        tiff:  () => imageMascot(),
        tif:   () => imageMascot(),
    };

    function mascotFor(ext) {
        const key = (ext || "").toLowerCase();
        const fn = MASCOT_MAP[key] || genericMascot;
        return fn();
    }

    global.Mascots = {
        forExt: mascotFor,
        drop: dropMascot,
        modal: modalArt,
    };
})(window);
