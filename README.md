# zwitchfile — Browser File Converter

แปลงไฟล์ในเบราว์เซอร์ **โดยไม่อัปโหลดไปยัง server ใดๆ** ทั้งสิ้น — ไฟล์อยู่บนเครื่องคุณตลอด

โฮสต์ฟรีได้ทันทีบน **GitHub Pages**

---

## รูปแบบที่รองรับ

| Source         | Targets                       |
| -------------- | ----------------------------- |
| PDF            | DOCX, JPG, PNG, WebP, TXT     |
| Word (.docx)   | HTML, TXT, PDF                |
| Excel (.xlsx)  | CSV, JSON, HTML               |
| Excel (.xls)   | CSV, JSON, HTML               |
| CSV            | XLSX, JSON, HTML              |
| JSON           | CSV, XLSX                     |
| TXT            | PDF                           |
| HTML           | PDF, TXT                      |
| JPG/JPEG       | PNG, WebP, BMP, PDF           |
| PNG            | JPG, WebP, BMP, PDF           |
| WebP           | JPG, PNG, BMP, PDF            |
| BMP            | JPG, PNG, WebP, PDF           |
| GIF            | JPG, PNG, WebP, PDF (frame 1) |

> PDF หลายหน้าที่แปลงเป็นรูปภาพจะถูกบีบเป็น `.zip` ให้ดาวน์โหลดเป็นชุดเดียว

---

## รันทดสอบบนเครื่อง

ไฟล์เป็น static HTML/CSS/JS ทั้งหมด — ต้องเสิร์ฟผ่าน HTTP (เปิด `file://` จะมีปัญหา CORS กับ pdf.js):

```powershell
cd C:\Users\IT-MED\Documents\file-converter-web
python -m http.server 8080
```

แล้วเปิด http://localhost:8080

---

## ตั้งค่า GitHub Pages

### ขั้นตอนแบบเร็ว

1. **สร้าง repo บน GitHub** ผ่านเว็บ https://github.com/new
   - ตั้งชื่อ เช่น `zwitchfile` (ใช้ชื่อนี้ในตัวอย่างข้างล่าง)
   - เลือก Public
   - **ไม่ต้อง** ติ๊ก Add README

2. **อัปโหลดโค้ดขึ้น GitHub** (ใน PowerShell):
   ```powershell
   cd C:\Users\IT-MED\Documents\file-converter-web
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/zwitchfile.git
   git push -u origin main
   ```

3. **เปิดใช้งาน GitHub Pages**
   - ไปที่ repo บน github.com
   - คลิก **Settings** → ซ้ายมือคลิก **Pages**
   - **Source**: Deploy from a branch
   - **Branch**: `main` / `/ (root)` → Save
   - รอ ~30 วินาที จะได้ URL เช่น `https://<YOUR_USERNAME>.github.io/zwitchfile/`

4. **แชร์ลิงก์** ให้ใครก็ใช้ได้ — และไฟล์ของเขาก็ยังคงอยู่ในเบราว์เซอร์ของเขาเอง

### หาก git ยังไม่ได้ติดตั้ง

ดาวน์โหลดที่ https://git-scm.com/download/win — ติดตั้งด้วยค่า default

### หรืออัปโหลดผ่านหน้าเว็บ GitHub โดยไม่ใช้ git

1. สร้าง repo ตามข้อ 1
2. บนหน้า repo คลิก "uploading an existing file"
3. ลากไฟล์ทั้งหมดในโฟลเดอร์ `file-converter-web/` เข้าไป
4. Commit ตามปกติ
5. ทำข้อ 3 (เปิด GitHub Pages) ต่อ

---

## โครงสร้างไฟล์

```
file-converter-web/
├── index.html        # โครงหน้าเว็บ
├── css/style.css     # ธีม คราม / ครีม / แดงเลือดหมู
├── js/
│   ├── mascots.js    # SVG ตัวการ์ตูนของแต่ละชนิดไฟล์
│   ├── converters.js # หัวใจการแปลง (modular, ESM)
│   └── app.js        # UI / event wiring / modal
├── .nojekyll         # บอก GitHub Pages ไม่ต้องผ่าน Jekyll
└── README.md
```

---

## เทคโนโลยีที่ใช้ (ทั้งหมดผ่าน CDN — ไม่มี build step)

- **pdf.js** — render PDF เป็น canvas, อ่าน text content
- **pdf-lib** — manipulate PDF (สำหรับฟีเจอร์ในอนาคต)
- **jsPDF** — สร้าง PDF จาก image/html/text
- **mammoth.js** — แปลง DOCX → HTML / TXT
- **SheetJS (xlsx)** — แปลง XLSX / CSV / JSON

ทั้งหมดทำงาน in-browser ผ่าน WebAssembly + JavaScript เพียวๆ

---

## ข้อจำกัด

- **DOCX → PDF**: ภายในใช้ `jsPDF.html()` ซึ่งรองรับ CSS/font ได้จำกัด — เอกสารซับซ้อนอาจวาง layout ไม่เป๊ะ 100%
- **Office ↔ Office** (เช่น docx → xlsx): ทำในเบราว์เซอร์ตรงๆ ไม่ได้ — ต้องผ่าน server ที่มี LibreOffice
- **ไฟล์ใหญ่มาก** (>50 MB): จำกัดไว้เพราะ memory ของ browser
- **GIF เคลื่อนไหว**: ดึงเฉพาะ frame แรก
- **PDF ที่เป็น scan image**: แปลงเป็น text ได้แต่เป็นข้อความว่าง — ไม่มี OCR

---

## License

MIT

---

## OPD Queue 3D (demo) — `opd-queue/index.html`

แดชบอร์ดสาธิต 3 มิติ ติดตามคิวและความหนาแน่นผู้ป่วยนอก (ข้อมูลจำลองทั้งหมด) — ไฟล์เดียว ไม่ต้อง build

- `opd-queue/index.html` — ศูนย์สั่งการ (ค่าเริ่มต้น)
- `?mode=tv` — จอทีวี/ล็อบบี้ · `?mode=mobile` — ตรวจสอบคิวบนมือถือ
- `?debug=1` — FPS, seed, ปุ่มเพิ่มผู้ป่วยฉับพลัน · `?date=YYYY-MM-DD` — เปิดแบบย้อนหลัง
- `?layout=<url>.json` — ใช้แผนผังจริงแทนแผนผังตัวอย่าง (schema อยู่ในหัวข้อ `// ===== 2. LAYOUT` ในไฟล์)
