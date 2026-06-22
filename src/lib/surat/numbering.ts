const ROMAWI = ["","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];

export function formatNomorSurat(
  template: string,
  nomor: number,
  kodeJenis: string,
  kodeLokasi: string,
  tanggal: Date,
): string {
  const pad   = String(nomor).padStart(3, "0");
  const bulan = ROMAWI[tanggal.getMonth() + 1];
  const tahun = String(tanggal.getFullYear());

  return template
    .replace("{nomor}",        pad)
    .replace("{jenis}",        kodeJenis)
    .replace("{lokasi}",       kodeLokasi)
    .replace("{bulan_romawi}", bulan)
    .replace("{tahun}",        tahun);
}
