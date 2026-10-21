import { CONVERSION_MATRIX, convertFile, buildPreviewElement } from "./converters.js";
import { initWakeWord } from "./voice.js";

// ----- DOM handles ---------------------------------------------------------
const dropZone   = document.getElementById("drop-zone");
const dropArt    = document.getElementById("drop-art");
const fileInput  = document.getElementById("file-input");
const browseBtn  = document.getElementById("browse-btn");

const detailCard = document.getElementById("detail-card");
const fileMascot = document.getElementById("file-mascot");
const fileName   = document.getElementById("file-name");
const fileSub    = document.getElementById("file-sub");
const clearBtn   = document.getElementById("clear-btn");

const targetSelect = document.getElementById("target-format");
const convertBtn   = document.getElementById("convert-btn");

const progressWrap  = document.getElementById("progress-wrap");
const progressLabel = document.getElementById("progress-label");
const progressFill  = document.getElementById("progress-fill");

const previewCard = document.getElementById("preview-card");
const previewArea = document.getElementById("preview-area");

const modalBackdrop = document.getElementById("modal-backdrop");
const modalCard     = document.getElementById("modal-card");
const modalArt      = document.getElementById("modal-art");
const modalTitle    = document.getElementById("modal-title");
const modalBody     = document.getElementById("modal-body");
const modalActions  = document.getElementById("modal-actions");

const aboutBtn = document.getElementById("about-btn");

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const state = {
    file: null,
    ext: null,
};

// ----- Utilities -----------------------------------------------------------

function extOf(name) {
    const i = name.lastIndexOf(".");
    return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function setProgress(label, percent) {
    progressWrap.classList.remove("hidden");
    progressLabel.textContent = label;
    if (percent === null || percent === undefined) {
        progressFill.classList.add("indeterminate");
        progressFill.style.width = "35%";
    } else {
        progressFill.classList.remove("indeterminate");
        progressFill.style.width = Math.max(0, Math.min(100, percent)) + "%";
    }
}

function hideProgress() {
    progressWrap.classList.add("hidden");
    progressFill.classList.remove("indeterminate");
    progressFill.style.width = "0%";
}

// ----- Modal ---------------------------------------------------------------

function openModal({ kind = "info", title, body, actions }) {
    modalCard.classList.remove("success", "error");
    if (kind === "success") modalCard.classList.add("success");
    if (kind === "error")   modalCard.classList.add("error");
    modalArt.innerHTML = window.Mascots.modal(kind);
    modalTitle.textContent = title;
    modalBody.innerHTML = body;

    modalActions.innerHTML = "";
    const items = actions && actions.length ? actions : [{ label: "ตกลง", kind: "primary" }];
    for (const a of items) {
        const btn = document.createElement(a.href ? "a" : "button");
        btn.className = a.kind === "danger" ? "danger-btn"
                       : a.kind === "ghost"  ? "ghost-btn"
                       : "primary-btn";
        btn.textContent = a.label;
        if (a.href) {
            btn.href = a.href;
            if (a.download) btn.setAttribute("download", a.download);
        } else {
            btn.type = "button";
        }
        btn.addEventListener("click", () => {
            if (a.onClick) a.onClick();
            if (a.closeOnClick !== false) closeModal();
        });
        modalActions.appendChild(btn);
    }
    modalBackdrop.classList.remove("hidden");
}

function closeModal() {
    modalBackdrop.classList.add("hidden");
    modalActions.innerHTML = "";
}

modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) closeModal();
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
});

// ----- Mascots -------------------------------------------------------------

dropArt.innerHTML = window.Mascots.drop();

function setFileMascot(ext) {
    fileMascot.innerHTML = window.Mascots.forExt(ext);
}

// ----- Format dropdown -----------------------------------------------------

function populateFormats(ext) {
    targetSelect.innerHTML = "";
    const targets = CONVERSION_MATRIX[ext] || [];
    if (targets.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "ไม่รองรับไฟล์ชนิดนี้";
        targetSelect.appendChild(opt);
        targetSelect.disabled = true;
        convertBtn.disabled = true;
        return;
    }
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "เลือกรูปแบบ…";
    targetSelect.appendChild(placeholder);
    for (const t of targets) {
        const opt = document.createElement("option");
        opt.value = t;
        opt.textContent = "." + t;
        targetSelect.appendChild(opt);
    }
    targetSelect.disabled = false;
}

// ----- Preview -------------------------------------------------------------

async function showPreview(file, ext) {
    previewCard.classList.remove("hidden");
    previewArea.innerHTML = '<div class="preview-placeholder">กำลังโหลด…</div>';
    try {
        const el = await buildPreviewElement(file, ext);
        previewArea.innerHTML = "";
        if (el) {
            previewArea.appendChild(el);
        } else {
            previewArea.innerHTML = '<div class="preview-placeholder">ไม่มีตัวอย่างสำหรับไฟล์ชนิดนี้</div>';
        }
    } catch (err) {
        previewArea.innerHTML = `<div class="preview-placeholder">แสดงตัวอย่างไม่ได้: ${err.message}</div>`;
    }
}

// ----- File handling -------------------------------------------------------

function resetUI() {
    state.file = null;
    state.ext = null;
    fileInput.value = "";
    detailCard.classList.add("hidden");
    previewCard.classList.add("hidden");
    targetSelect.innerHTML = '<option value="">เลือกรูปแบบ…</option>';
    targetSelect.disabled = true;
    convertBtn.disabled = true;
    hideProgress();
}

function handleFile(file) {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
        openModal({
            kind: "error",
            title: "ไฟล์ใหญ่เกินไป",
            body: `ขนาดสูงสุดที่รองรับคือ 50 MB — ไฟล์นี้ขนาด ${formatSize(file.size)}`,
        });
        return;
    }
    const ext = extOf(file.name);
    if (!CONVERSION_MATRIX[ext]) {
        openModal({
            kind: "error",
            title: "ไฟล์ชนิดนี้ยังไม่รองรับ",
            body: `นามสกุล .${ext || "?"} ยังแปลงไม่ได้ในตอนนี้ ลองไฟล์ PDF, Word, Excel, CSV, หรือรูปภาพดูครับ`,
        });
        return;
    }

    state.file = file;
    state.ext  = ext;

    detailCard.classList.remove("hidden");
    fileName.textContent = file.name;
    fileSub.textContent  = `${formatSize(file.size)} · .${ext}`;
    setFileMascot(ext);
    populateFormats(ext);
    convertBtn.disabled = true;
    hideProgress();

    showPreview(file, ext);
}

// ----- Conversion ----------------------------------------------------------

async function runConversion() {
    if (!state.file) return;
    const target = targetSelect.value;
    if (!target) {
        openModal({
            kind: "error",
            title: "ยังไม่ได้เลือกรูปแบบ",
            body: "กรุณาเลือกรูปแบบปลายทางจากกล่องด้านบนก่อนเริ่มแปลง",
        });
        return;
    }

    convertBtn.disabled = true;
    targetSelect.disabled = true;
    clearBtn.disabled = true;
    setProgress(`กำลังแปลงเป็น .${target}…`, null);

    try {
        const { blob, filename } = await convertFile(state.file, state.ext, target);
        setProgress("เสร็จเรียบร้อย", 100);

        const url = URL.createObjectURL(blob);
        const sizeText = formatSize(blob.size);
        openModal({
            kind: "success",
            title: "แปลงไฟล์สำเร็จ!",
            body: `ไฟล์พร้อมดาวน์โหลดแล้ว<br><strong>${filename}</strong> · ${sizeText}`,
            actions: [
                {
                    label: "ดาวน์โหลด",
                    kind: "primary",
                    href: url,
                    download: filename,
                    onClick: () => {
                        // Revoke the URL after the click has been processed.
                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                    },
                },
                {
                    label: "ปิด",
                    kind: "ghost",
                },
            ],
        });
    } catch (err) {
        console.error(err);
        openModal({
            kind: "error",
            title: "แปลงไฟล์ไม่สำเร็จ",
            body: `${err.message || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ"}`,
        });
    } finally {
        convertBtn.disabled = !targetSelect.value;
        targetSelect.disabled = false;
        clearBtn.disabled = false;
        hideProgress();
    }
}

// ----- Event wiring --------------------------------------------------------

browseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    fileInput.click();
});

dropZone.addEventListener("click", (e) => {
    if (e.target === browseBtn) return;
    fileInput.click();
});

dropZone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        fileInput.click();
    }
});

fileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) handleFile(file);
});

["dragenter", "dragover"].forEach((evt) => {
    dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add("active");
    });
});
["dragleave", "drop"].forEach((evt) => {
    dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove("active");
    });
});
dropZone.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleFile(file);
});

clearBtn.addEventListener("click", resetUI);

targetSelect.addEventListener("change", () => {
    convertBtn.disabled = !targetSelect.value;
});

convertBtn.addEventListener("click", runConversion);

aboutBtn.addEventListener("click", () => {
    openModal({
        kind: "info",
        title: "zwitchfile · เกี่ยวกับเรา",
        body: `เครื่องมือแปลงไฟล์ที่ทำงาน <strong>ในเบราว์เซอร์ของคุณทั้งหมด</strong>
            <br>ไม่มีการอัปโหลดไปยังเซิร์ฟเวอร์ใดๆ
            <br><br>รองรับ: PDF, Word, Excel, CSV, JSON, TXT, HTML, รูปภาพ`,
    });
});

initWakeWord({
    button: document.getElementById("wake-btn"),
    glow: document.getElementById("siri-glow"),
});
