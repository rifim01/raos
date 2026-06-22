export interface SuratData {
  nomor_surat:        string;
  tanggal_surat:      string;
  perihal:            string;
  tujuan:             string;
  lampiran?:          string;
  isi_surat:          string;
  data_surat?:        any;
  nama_penandatangan?: string;
  jabatan_penandatangan?: string;
  ttd_url?:           string;
  stempel_url?:       string;
  qr_code_url?:       string;
  logo_url?:          string;
  nama_perusahaan:    string;
  alamat?:            string;
  telepon?:           string;
  website?:           string;
}

/** Renders dynamic {{tabel_lampiran}} from data_surat.tabel array */
function renderTabel(data: any): string {
  if (!data?.tabel || !Array.isArray(data.tabel) || data.tabel.length === 0) return "";
  const cols: string[] = data.kolom ?? Object.keys(data.tabel[0] ?? {});
  const header = cols.map(c => `<th style="border:1px solid #C62828;padding:6px 10px;background:#C62828;color:white;font-size:11px;text-align:left">${c}</th>`).join("");
  const rows = data.tabel.map((row: any, i: number) =>
    `<tr style="background:${i%2===0?"#fff":"#fef2f2"}">
      ${cols.map(c => `<td style="border:1px solid #ddd;padding:6px 10px;font-size:11px">${row[c] ?? ""}</td>`).join("")}
    </tr>`
  ).join("");
  return `<table style="width:100%;border-collapse:collapse;margin:12px 0">${header}${rows}</table>`;
}

/** Replace template placeholders with actual values */
function renderTemplate(template: string, data: SuratData, qrDataUrl?: string): string {
  const ttdHtml    = data.ttd_url
    ? `<img src="${data.ttd_url}" style="height:60px;display:block;margin-bottom:4px" />`
    : '<div style="height:60px"></div>';
  const stempelHtml = data.stempel_url
    ? `<img src="${data.stempel_url}" style="height:80px;opacity:0.85;display:block" />`
    : "";
  const qrHtml = qrDataUrl
    ? `<img src="${qrDataUrl}" style="width:64px;height:64px" />`
    : "";

  return template
    .replace(/\{\{nomor_surat\}\}/g,        data.nomor_surat ?? "")
    .replace(/\{\{tanggal\}\}/g,             data.tanggal_surat ?? "")
    .replace(/\{\{perihal\}\}/g,             data.perihal ?? "")
    .replace(/\{\{tujuan\}\}/g,              data.tujuan ?? "")
    .replace(/\{\{isi_surat\}\}/g,           data.isi_surat ?? "")
    .replace(/\{\{nama_penandatangan\}\}/g,  data.nama_penandatangan ?? "")
    .replace(/\{\{jabatan\}\}/g,             data.jabatan_penandatangan ?? "")
    .replace(/\{\{tanda_tangan\}\}/g,        ttdHtml)
    .replace(/\{\{stempel\}\}/g,             stempelHtml)
    .replace(/\{\{qr_code\}\}/g,             qrHtml)
    .replace(/\{\{tabel_lampiran\}\}/g,      renderTabel(data.data_surat));
}

/** Generate full printable HTML for a surat */
export function generateSuratHTML(surat: SuratData, templateIsi: string, qrDataUrl?: string): string {
  const body = renderTemplate(templateIsi, surat, qrDataUrl);

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <title>${surat.nomor_surat}</title>
  <style>
    @page { size: A4; margin: 30mm 25mm 30mm 35mm; }
    * { box-sizing: border-box; font-family: "Times New Roman", Times, serif; }
    body { margin: 0; padding: 0; font-size: 12pt; color: #111; background: #fff; }
    .letterhead {
      display: flex; align-items: center; gap: 16px;
      border-bottom: 3px solid #C62828; padding-bottom: 12px; margin-bottom: 18px;
    }
    .letterhead img { height: 72px; flex-shrink: 0; }
    .letterhead-text { flex: 1; }
    .letterhead-text h1 { margin: 0 0 2px; font-size: 15pt; font-weight: bold; color: #C62828; letter-spacing: 0.5px; }
    .letterhead-text p  { margin: 0; font-size: 9pt; color: #555; line-height: 1.4; }
    .divider { border: none; border-top: 1px solid #C62828; margin: 4px 0 18px; }
    h2.judul { text-align: center; font-size: 13pt; text-decoration: underline; margin: 20px 0 16px; letter-spacing: 0.5px; }
    table.info { width: 100%; font-size: 11pt; margin-bottom: 18px; border-collapse: collapse; }
    table.info td { padding: 2px 0; vertical-align: top; }
    table.info td:first-child { width: 140px; }
    .isi { font-size: 12pt; line-height: 1.8; text-align: justify; }
    .ttd-section { margin-top: 40px; display: flex; justify-content: flex-end; }
    .ttd-box { text-align: center; min-width: 200px; }
    .ttd-box p { margin: 4px 0; font-size: 11pt; }
    .footer-qr { position: fixed; bottom: 15mm; right: 15mm; text-align: center; }
    .footer-qr p { font-size: 7pt; color: #888; margin: 2px 0; }
    @media print { body { -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="letterhead">
    ${surat.logo_url ? `<img src="${surat.logo_url}" alt="Logo" />` : '<div style="width:72px;height:72px;background:#C62828;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:20px">R</div>'}
    <div class="letterhead-text">
      <h1>${surat.nama_perusahaan}</h1>
      <p>${surat.alamat ?? ""}</p>
      <p>${[surat.telepon, surat.website].filter(Boolean).join(" · ")}</p>
    </div>
  </div>
  <hr class="divider" />
  <div class="isi">${body}</div>
  ${qrDataUrl ? `<div class="footer-qr"><img src="${qrDataUrl}" style="width:56px;height:56px" /><p>Scan untuk verifikasi</p><p style="font-size:6pt">${surat.nomor_surat}</p></div>` : ""}
</body>
</html>`;
}

/** Default template for letters that have no custom template */
export const DEFAULT_TEMPLATE = `<h2 class="judul">{{perihal}}</h2>
<table class="info">
  <tr><td>Nomor</td><td>: {{nomor_surat}}</td></tr>
  <tr><td>Kepada</td><td>: {{tujuan}}</td></tr>
  <tr><td>Tanggal</td><td>: {{tanggal}}</td></tr>
  <tr><td>Perihal</td><td>: {{perihal}}</td></tr>
</table>
<div style="margin-bottom:16px">Dengan hormat,</div>
<div>{{isi_surat}}</div>
{{tabel_lampiran}}
<div style="margin-top:16px">Demikian surat ini disampaikan. Atas perhatiannya kami ucapkan terima kasih.</div>
<div class="ttd-section">
  <div class="ttd-box">
    <p>{{tujuan}}, {{tanggal}}</p>
    <p>{{nama_perusahaan}}</p>
    <div style="height:80px;position:relative">{{tanda_tangan}}{{stempel}}</div>
    <p><strong>{{nama_penandatangan}}</strong></p>
    <p>{{jabatan}}</p>
  </div>
</div>`;
