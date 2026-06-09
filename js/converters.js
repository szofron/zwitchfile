/**
 * Pure-browser file conversion engine.
 * Returns Blob + filename for each conversion. No network calls.
 */

// What source extensions can produce what targets.
export const CONVERSION_MATRIX = Object.freeze({
    pdf:   ["docx", "jpg", "png", "webp", "txt"],
    docx:  ["html", "txt", "pdf"],
    xlsx:  ["csv", "json", "html"],
    xls:   ["csv", "json", "html"],
    csv:   ["xlsx", "json", "html"],
    json:  ["csv", "xlsx"],
    txt:   ["pdf"],
    html:  ["pdf", "txt"],
    jpg:   ["png", "webp", "bmp", "pdf"],
    jpeg:  ["png", "webp", "bmp", "pdf"],
    png:   ["jpg", "webp", "bmp", "pdf"],
    webp:  ["jpg", "png", "bmp", "pdf"],
    bmp:   ["jpg", "png", "webp", "pdf"],
    gif:   ["jpg", "png", "webp", "pdf"],
});

export const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "webp", "bmp", "gif"]);

const PDFJS_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.min.mjs";
const PDFJS_WORKER_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.worker.min.mjs";

let pdfjsPromise = null;
/** Lazily load pdf.js (ESM) and configure its worker. */
function loadPdfJs() {
    if (!pdfjsPromise) {
        pdfjsPromise = import(PDFJS_URL).then((mod) => {
            const lib = mod.default || mod;
            lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
            return lib;
        });
    }
    return pdfjsPromise;
}

/** Read a File into an ArrayBuffer (Promise wrapper). */
function readAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์ได้"));
        fr.readAsArrayBuffer(file);
    });
}

/** Read a File as text (Promise wrapper). */
function readAsText(file) {
    return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์ได้"));
        fr.readAsText(file);
    });
}

/** Read a File as Data URL. */
function readAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์ได้"));
        fr.readAsDataURL(file);
    });
}

/** Convert a canvas to a Blob with the given MIME. */
function canvasToBlob(canvas, mime, quality) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("ส่งออกรูปภาพไม่สำเร็จ"));
        }, mime, quality);
    });
}

const IMAGE_MIME = {
    jpg:  "image/jpeg",
    jpeg: "image/jpeg",
    png:  "image/png",
    webp: "image/webp",
    bmp:  "image/bmp",
    gif:  "image/gif",
};

/** Draw a File image onto a canvas and re-encode as targetExt. */
async function imageToImage(file, targetExt) {
    const url = await readAsDataURL(file);
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    // JPEG/BMP can't carry alpha — paint cream background for transparency safety.
    if (targetExt === "jpg" || targetExt === "jpeg" || targetExt === "bmp") {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);
    const mime = IMAGE_MIME[targetExt] || "image/png";
    const quality = (targetExt === "jpg" || targetExt === "jpeg") ? 0.92
                  : (targetExt === "webp" ? 0.9 : undefined);
    const blob = await canvasToBlob(canvas, mime, quality);
    return blob;
}

/** Load an Image object from a data URL. */
function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("รูปภาพไม่ถูกต้องหรือเสียหาย"));
        img.src = dataUrl;
    });
}

/** Embed a single image as a one-page PDF using jsPDF. */
async function imageToPdf(file) {
    const { jsPDF } = window.jspdf;
    const url = await readAsDataURL(file);
    const img = await loadImage(url);

    // Fit page to image aspect ratio with a small margin.
    const margin = 24;
    const pdf = new jsPDF({
        orientation: img.width >= img.height ? "landscape" : "portrait",
        unit: "pt",
        format: [img.width + margin * 2, img.height + margin * 2],
    });

    // jsPDF supports PNG/JPEG natively; convert other formats via canvas first.
    let mime = (file.type || "").toLowerCase();
    let imageData = url;
    if (!/^image\/(jpeg|png)$/.test(mime)) {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        imageData = canvas.toDataURL("image/jpeg", 0.92);
        mime = "image/jpeg";
    }
    const fmt = mime === "image/png" ? "PNG" : "JPEG";
    pdf.addImage(imageData, fmt, margin, margin, img.width, img.height);
    return pdf.output("blob");
}

/** Render every PDF page to a canvas image; zip when there's more than one. */
async function pdfToImages(file, targetExt) {
    const pdfjsLib = await loadPdfJs();
    const buffer = await readAsArrayBuffer(file);
    const doc = await pdfjsLib.getDocument({ data: buffer }).promise;

    const mime = IMAGE_MIME[targetExt] || "image/png";
    const quality = (targetExt === "jpg") ? 0.92 : (targetExt === "webp" ? 0.9 : undefined);
    const blobs = [];

    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (targetExt === "jpg" || targetExt === "jpeg" || targetExt === "bmp") {
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        await page.render({ canvasContext: ctx, viewport }).promise;
        const blob = await canvasToBlob(canvas, mime, quality);
        blobs.push({ blob, name: `page_${String(i).padStart(3, "0")}.${targetExt}` });
    }

    if (blobs.length === 1) return blobs[0].blob;
    return zipBlobs(blobs);
}

/**
 * Group pdf.js text items into visual lines by their Y coordinate, sorted L→R.
 * Returns [{ y, text }] sorted top-to-bottom (PDF Y axis grows upward).
 */
function groupItemsIntoLines(items, yTolerance = 2.5) {
    if (!items || items.length === 0) return [];
    // pdf.js exposes transform [a,b,c,d,e,f]; e = x, f = y in PDF coords.
    const enriched = items
        .filter((it) => typeof it.str === "string")
        .map((it) => ({
            text: it.str,
            x: it.transform[4],
            y: it.transform[5],
            width: it.width || 0,
            hasEOL: !!it.hasEOL,
        }));
    if (enriched.length === 0) return [];

    // Cluster by Y (tolerance-based bucketing, descending Y = top of page first).
    enriched.sort((a, b) => b.y - a.y);
    const lines = [];
    let current = null;
    for (const item of enriched) {
        if (!current || Math.abs(current.y - item.y) > yTolerance) {
            current = { y: item.y, items: [item] };
            lines.push(current);
        } else {
            current.items.push(item);
        }
    }

    return lines.map((line) => {
        line.items.sort((a, b) => a.x - b.x);
        // Re-introduce spaces where horizontal gaps suggest a word break.
        let out = "";
        let prevEnd = null;
        const avgChar = line.items.reduce((sum, it) =>
            sum + (it.width / Math.max(it.text.length, 1)), 0) / line.items.length || 4;
        for (const it of line.items) {
            if (prevEnd !== null) {
                const gap = it.x - prevEnd;
                if (gap > avgChar * 0.6 && !out.endsWith(" ")) out += " ";
            }
            out += it.text;
            prevEnd = it.x + it.width;
        }
        return { y: line.y, text: out.trim() };
    }).filter((l) => l.text.length > 0);
}

/** Convert a PDF into an editable .docx via text extraction. */
async function pdfToDocx(file) {
    if (!window.docx) {
        throw new Error("ไลบรารี docx ยังไม่โหลด — กรุณารีเฟรชหน้าเว็บ");
    }
    const pdfjsLib = await loadPdfJs();
    const buffer = await readAsArrayBuffer(file);
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    const { Document, Packer, Paragraph, TextRun, PageBreak, HeadingLevel } = window.docx;

    const children = [];
    let totalChars = 0;

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const lines = groupItemsIntoLines(content.items);

        for (const line of lines) {
            totalChars += line.text.length;
            children.push(new Paragraph({
                children: [new TextRun({ text: line.text })],
            }));
        }

        // Page break between pages (but not after the last).
        if (i < pdf.numPages) {
            children.push(new Paragraph({
                children: [new PageBreak()],
            }));
        }
    }

    if (totalChars === 0) {
        // No extractable text — likely scanned. Tell the user clearly.
        throw new Error(
            "PDF นี้ไม่มีข้อความที่ดึงออกมาได้ (อาจเป็น PDF สแกน) — " +
            "ลองแปลงเป็น JPG/PNG แทน หรือใช้เครื่องมือ OCR แยก"
        );
    }

    const docDef = new Document({
        creator: "zwitchfile",
        title: file.name,
        sections: [{
            properties: {},
            children,
        }],
    });

    const blob = await Packer.toBlob(docDef);
    return new Blob([blob], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
}

/** Extract all text from a PDF and return as a text Blob. */
async function pdfToText(file) {
    const pdfjsLib = await loadPdfJs();
    const buffer = await readAsArrayBuffer(file);
    const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
    const lines = [];
    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const text = content.items.map((it) => it.str).join(" ");
        lines.push(`--- Page ${i} ---`);
        lines.push(text);
        lines.push("");
    }
    return new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
}

/** Convert a DOCX file to HTML via Mammoth. */
async function docxToHtml(file) {
    const buffer = await readAsArrayBuffer(file);
    const result = await window.mammoth.convertToHtml({ arrayBuffer: buffer });
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${file.name}</title>
<style>body{font-family:system-ui,-apple-system,'Noto Sans Thai',sans-serif;max-width:780px;margin:32px auto;padding:0 16px;line-height:1.55;color:#1F1B2E}</style>
</head><body>${result.value}</body></html>`;
    return new Blob([html], { type: "text/html;charset=utf-8" });
}

/** Convert a DOCX file to plain text via Mammoth. */
async function docxToText(file) {
    const buffer = await readAsArrayBuffer(file);
    const result = await window.mammoth.extractRawText({ arrayBuffer: buffer });
    return new Blob([result.value], { type: "text/plain;charset=utf-8" });
}

/** Convert a DOCX to PDF by laying out its HTML inside jsPDF. */
async function docxToPdf(file) {
    const buffer = await readAsArrayBuffer(file);
    const result = await window.mammoth.convertToHtml({ arrayBuffer: buffer });
    return htmlStringToPdf(result.value);
}

/** Render an HTML string into a PDF using jsPDF's html() method. */
async function htmlStringToPdf(html) {
    if (typeof window.html2canvas !== "function") {
        throw new Error("ไลบรารี html2canvas ยังไม่โหลด — กรุณารีเฟรชหน้าเว็บ");
    }
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });

    const container = document.createElement("div");
    container.style.cssText =
        "width:540px;font-family:'Noto Sans Thai','Sarabun',system-ui,-apple-system,sans-serif;" +
        "font-size:11pt;line-height:1.55;color:#1F1B2E;padding:8px;background:#FFFFFF;" +
        "word-wrap:break-word;overflow-wrap:break-word;";
    container.innerHTML = html;

    // The node must be attached and visible for html2canvas to measure layout.
    container.style.position = "fixed";
    container.style.left = "-10000px";
    container.style.top = "0";
    document.body.appendChild(container);

    try {
        await pdf.html(container, {
            x: 32,
            y: 32,
            width: 540,
            windowWidth: 540,
            autoPaging: "text",
            html2canvas: {
                scale: 0.75,
                useCORS: true,
                logging: false,
                backgroundColor: "#FFFFFF",
            },
        });
    } catch (err) {
        // Re-throw with clearer Thai message.
        throw new Error("แปลงเป็น PDF ไม่สำเร็จ: " + (err && err.message ? err.message : err));
    } finally {
        document.body.removeChild(container);
    }
    return pdf.output("blob");
}

/** Convert an XLSX/XLS/CSV file to the requested target via SheetJS. */
async function spreadsheetTo(file, targetExt) {
    const buffer = await readAsArrayBuffer(file);
    const wb = window.XLSX.read(buffer, { type: "array" });
    const firstSheetName = wb.SheetNames[0];
    const firstSheet = wb.Sheets[firstSheetName];

    if (targetExt === "csv") {
        const csv = window.XLSX.utils.sheet_to_csv(firstSheet);
        return new Blob([csv], { type: "text/csv;charset=utf-8" });
    }
    if (targetExt === "json") {
        const out = {};
        for (const name of wb.SheetNames) {
            out[name] = window.XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: null });
        }
        return new Blob([JSON.stringify(out, null, 2)], { type: "application/json;charset=utf-8" });
    }
    if (targetExt === "html") {
        const sections = wb.SheetNames.map((name) => {
            const html = window.XLSX.utils.sheet_to_html(wb.Sheets[name], { id: name });
            return `<h2>${escapeHtml(name)}</h2>${html}`;
        }).join("\n");
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>${file.name}</title>
<style>body{font-family:system-ui,'Noto Sans Thai',sans-serif;max-width:980px;margin:32px auto;padding:0 16px;color:#1F1B2E}
table{border-collapse:collapse;margin:8px 0 24px;width:100%}
th,td{border:1px solid #E6DCC2;padding:6px 10px;text-align:left}
th{background:#FAF6EC}
h2{color:#3730A3;margin-top:32px}
</style></head><body>${sections}</body></html>`;
        return new Blob([html], { type: "text/html;charset=utf-8" });
    }
    if (targetExt === "xlsx") {
        const out = window.XLSX.write(wb, { bookType: "xlsx", type: "array" });
        return new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    }
    throw new Error("รูปแบบเป้าหมายไม่รองรับ: " + targetExt);
}

/** Convert CSV text directly to an XLSX workbook. */
async function csvToXlsx(file) {
    const text = await readAsText(file);
    const wb = window.XLSX.read(text, { type: "string" });
    const out = window.XLSX.write(wb, { bookType: "xlsx", type: "array" });
    return new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

/** Convert JSON (object of sheet arrays, or single array) to CSV/XLSX. */
async function jsonToSpreadsheet(file, targetExt) {
    const text = await readAsText(file);
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        throw new Error("JSON ไม่ถูกต้อง: " + e.message);
    }

    const wb = window.XLSX.utils.book_new();
    if (Array.isArray(data)) {
        const sheet = window.XLSX.utils.json_to_sheet(data);
        window.XLSX.utils.book_append_sheet(wb, sheet, "Sheet1");
    } else if (data && typeof data === "object") {
        let added = 0;
        for (const [name, rows] of Object.entries(data)) {
            if (Array.isArray(rows)) {
                const sheet = window.XLSX.utils.json_to_sheet(rows);
                window.XLSX.utils.book_append_sheet(wb, sheet, name.slice(0, 31) || `Sheet${++added}`);
                added++;
            }
        }
        if (added === 0) {
            const sheet = window.XLSX.utils.json_to_sheet([data]);
            window.XLSX.utils.book_append_sheet(wb, sheet, "Sheet1");
        }
    } else {
        throw new Error("รูปแบบ JSON ต้องเป็น array หรือ object");
    }

    if (targetExt === "csv") {
        const first = wb.Sheets[wb.SheetNames[0]];
        const csv = window.XLSX.utils.sheet_to_csv(first);
        return new Blob([csv], { type: "text/csv;charset=utf-8" });
    }
    const out = window.XLSX.write(wb, { bookType: "xlsx", type: "array" });
    return new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

/** Wrap plain text inside a PDF via jsPDF. */
async function textToPdf(file) {
    const text = await readAsText(file);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    const width = pdf.internal.pageSize.getWidth() - margin * 2;
    const height = pdf.internal.pageSize.getHeight() - margin * 2;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    const lines = pdf.splitTextToSize(text, width);
    let y = margin;
    const lineHeight = 14;
    for (const line of lines) {
        if (y + lineHeight > pdf.internal.pageSize.getHeight() - margin) {
            pdf.addPage();
            y = margin;
        }
        pdf.text(line, margin, y);
        y += lineHeight;
    }
    return pdf.output("blob");
}

/** Convert HTML to either PDF (jsPDF) or plain text (strip tags). */
async function htmlConvert(file, targetExt) {
    const text = await readAsText(file);
    if (targetExt === "pdf") return htmlStringToPdf(text);
    if (targetExt === "txt") {
        const stripped = text.replace(/<style[\s\S]*?<\/style>/gi, "")
                             .replace(/<script[\s\S]*?<\/script>/gi, "")
                             .replace(/<[^>]+>/g, "")
                             .replace(/\n{3,}/g, "\n\n");
        return new Blob([stripped.trim()], { type: "text/plain;charset=utf-8" });
    }
    throw new Error("รูปแบบเป้าหมายไม่รองรับ: " + targetExt);
}

/** Build a ZIP archive from an array of { blob, name } entries. */
async function zipBlobs(entries) {
    // Minimal store-only ZIP writer (no compression) — works for already-compressed
    // images and keeps the build dependency-free.
    const encoder = new TextEncoder();
    const fileRecords = [];
    const centralRecords = [];
    let offset = 0;

    for (const { blob, name } of entries) {
        const data = new Uint8Array(await blob.arrayBuffer());
        const nameBytes = encoder.encode(name);
        const crc = crc32(data);
        const local = new Uint8Array(30 + nameBytes.length);
        const dv = new DataView(local.buffer);
        dv.setUint32(0, 0x04034b50, true);  // local file header sig
        dv.setUint16(4, 20, true);          // version
        dv.setUint16(6, 0, true);           // flags
        dv.setUint16(8, 0, true);           // method (store)
        dv.setUint16(10, 0, true);          // time
        dv.setUint16(12, 0, true);          // date
        dv.setUint32(14, crc, true);
        dv.setUint32(18, data.length, true);
        dv.setUint32(22, data.length, true);
        dv.setUint16(26, nameBytes.length, true);
        dv.setUint16(28, 0, true);
        local.set(nameBytes, 30);
        fileRecords.push(local, data);

        const central = new Uint8Array(46 + nameBytes.length);
        const cv = new DataView(central.buffer);
        cv.setUint32(0, 0x02014b50, true);
        cv.setUint16(4, 20, true);
        cv.setUint16(6, 20, true);
        cv.setUint16(8, 0, true);
        cv.setUint16(10, 0, true);
        cv.setUint16(12, 0, true);
        cv.setUint16(14, 0, true);
        cv.setUint32(16, crc, true);
        cv.setUint32(20, data.length, true);
        cv.setUint32(24, data.length, true);
        cv.setUint16(28, nameBytes.length, true);
        cv.setUint16(30, 0, true);
        cv.setUint16(32, 0, true);
        cv.setUint16(34, 0, true);
        cv.setUint16(36, 0, true);
        cv.setUint32(38, 0, true);
        cv.setUint32(42, offset, true);
        central.set(nameBytes, 46);
        centralRecords.push(central);

        offset += local.length + data.length;
    }

    const centralStart = offset;
    let centralSize = 0;
    for (const c of centralRecords) centralSize += c.length;

    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, entries.length, true);
    ev.setUint16(10, entries.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, centralStart, true);
    ev.setUint16(20, 0, true);

    return new Blob([...fileRecords, ...centralRecords, end], { type: "application/zip" });
}

const CRC_TABLE = (function () {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c >>> 0;
    }
    return table;
})();

function crc32(data) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
        c = CRC_TABLE[(c ^ data[i]) & 0xFF] ^ (c >>> 8);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (ch) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[ch]));
}

/**
 * Dispatch to the appropriate converter.
 * Returns { blob, filename } — caller handles download.
 */
export async function convertFile(file, sourceExt, targetExt) {
    const src = sourceExt.toLowerCase();
    const dst = targetExt.toLowerCase();
    const baseName = file.name.replace(/\.[^.]+$/, "");

    let blob;
    let outExt = dst;

    if (IMAGE_EXTS.has(src)) {
        if (dst === "pdf") blob = await imageToPdf(file);
        else if (IMAGE_EXTS.has(dst)) blob = await imageToImage(file, dst);
        else throw new Error("ไม่รองรับการแปลงนี้");
    } else if (src === "pdf") {
        if (dst === "txt") blob = await pdfToText(file);
        else if (dst === "docx") blob = await pdfToDocx(file);
        else if (["jpg", "png", "webp"].includes(dst)) {
            blob = await pdfToImages(file, dst);
            if (blob.type === "application/zip") outExt = "zip";
        } else throw new Error("ไม่รองรับการแปลงนี้");
    } else if (src === "docx") {
        if (dst === "html") blob = await docxToHtml(file);
        else if (dst === "txt") blob = await docxToText(file);
        else if (dst === "pdf") blob = await docxToPdf(file);
        else throw new Error("ไม่รองรับการแปลงนี้");
    } else if (src === "xlsx" || src === "xls") {
        blob = await spreadsheetTo(file, dst);
    } else if (src === "csv") {
        if (dst === "xlsx") blob = await csvToXlsx(file);
        else blob = await spreadsheetTo(file, dst);
    } else if (src === "json") {
        blob = await jsonToSpreadsheet(file, dst);
    } else if (src === "txt") {
        if (dst === "pdf") blob = await textToPdf(file);
        else throw new Error("ไม่รองรับการแปลงนี้");
    } else if (src === "html") {
        blob = await htmlConvert(file, dst);
    } else {
        throw new Error("ไม่รองรับไฟล์ต้นทาง: ." + src);
    }

    return { blob, filename: `${baseName}.${outExt}` };
}

/**
 * Build a small preview element for the given file (image or PDF first page).
 * Returns an HTMLElement; the caller appends it to the preview area.
 */
export async function buildPreviewElement(file, ext) {
    const e = ext.toLowerCase();
    if (IMAGE_EXTS.has(e)) {
        const url = await readAsDataURL(file);
        const img = new Image();
        img.src = url;
        img.alt = file.name;
        return img;
    }
    if (e === "pdf") {
        const pdfjsLib = await loadPdfJs();
        const buf = await readAsArrayBuffer(file);
        const doc = await pdfjsLib.getDocument({ data: buf }).promise;
        const page = await doc.getPage(1);
        const viewport = page.getViewport({ scale: 1.2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
        return canvas;
    }
    if (e === "txt" || e === "csv" || e === "json" || e === "html") {
        const text = await readAsText(file);
        const pre = document.createElement("pre");
        pre.textContent = text.length > 4000 ? text.slice(0, 4000) + "\n…" : text;
        return pre;
    }
    return null;
}
