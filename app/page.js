"use client";
import { useState } from "react";

// MASTER PAGE - NRI - yuliahartati.com
// Kunci master dari gambar terakhir:
// - Header + foto 1 blok, header nempel di atas foto, bukan bar pisah
// - Logo samping teks NARRATIVE REASONING INTELLIGENCE
// - Tombol Analisis Gratis teal polos, tanpa bintang, tulisan gede, rata kiri
// - Blok NRI Analisis tanpa logo NRI
// - Artikel Terbaru 4, widget medsos DI DALAM tiap kolom artikel, rata 1 baris sama tanggal
// - Tanpa gold, tanpa lihat ig/fb/paket, tanpa harga/angka di halaman ini
// - Setelah 3x gratis habis -> lempar ke /pricing (halaman produk)

const ARTICLES = [
  {
    id: 1,
    cat: "Opini",
    title: "Mengapa Narasi Bisa Mengalahkan Data",
    excerpt: "Data tidak pernah bicara sendiri. Yang bicara adalah cara kita menyusunnya menjadi cerita.",
    date: "12 Okt 2024",
    read: "5 menit membaca",
    img: "/artikel-1.jpg",
    ig: "https://instagram.com/yuliahartati",
    threads: "https://threads.com/@yuliahartati",
    fb: "https://facebook.com/yulia.hartati",
  },
  {
    id: 2,
    cat: "Analisis",
    title: "Blind Spot: Yang Tidak Ditulis Justru Yang Penting",
    excerpt: "Dalam teks, yang hilang sering lebih jujur daripada yang ditulis.",
    date: "12 Okt 2024",
    read: "5 menit membaca",
    img: "/artikel-2.jpg",
    ig: "https://instagram.com/yuliahartati",
    threads: "https://threads.com/@yuliahartati",
    fb: "https://facebook.com/yulia.hartati",
  },
  {
    id: 3,
    cat: "Opini",
    title: "Berpikir Kritis Bukan Berarti Sinis",
    excerpt: "Kritis itu bertanya dengan struktur, bukan curiga tanpa bukti.",
    date: "12 Okt 2024",
    read: "5 menit membaca",
    img: "/artikel-3.jpg",
    ig: "https://instagram.com/yuliahartati",
    threads: "https://threads.com/@yuliahartati",
    fb: "https://facebook.com/yulia.hartati",
  },
  {
    id: 4,
    cat: "Analisis",
    title: "Cara Membaca Teks Tanpa Terkecoh Gaya Bahasa",
    excerpt: "Gaya bahasa bisa menutupi logika yang bolong. Ini cara membedahnya.",
    date: "12 Okt 2024",
    read: "5 menit membaca",
    img: "/artikel-4.jpg",
    ig: "https://instagram.com/yuliahartati",
    threads: "https://threads.com/@yuliahartati",
    fb: "https://facebook.com/yulia.hartati",
  },
];

function SocialWidget({ a }) {
  return (
    <div className="flex items-center gap-2 shrink-0" aria-label="Link artikel di medsos">
      <a href={a.ig} target="_blank" rel="noreferrer" title="Baca di Instagram" className="w-8 h-8 rounded-full bg-[#eef7f5] text-[#0f766e] flex items-center justify-center text-[11px] font-bold hover:bg-[#0f766e] hover:text-white transition">IG</a>
      <a href={a.threads} target="_blank" rel="noreferrer" title="Baca di Threads" className="w-8 h-8 rounded-full bg-[#eef7f5] text-[#0f766e] flex items-center justify-center text-[11px] font-bold hover:bg-[#0f766e] hover:text-white transition">TH</a>
      <a href={a.fb} target="_blank" rel="noreferrer" title="Baca di Facebook" className="w-8 h-8 rounded-full bg-[#eef7f5] text-[#0f766e] flex items-center justify-center text-[11px] font-bold hover:bg-[#0f766e] hover:text-white transition">FB</a>
    </div>
  );
}

export default function Home() {
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(3);
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleAnalisis() {
    if (!text.trim()) return;
    if (text.length > 8000) {
      alert("Teks melebihi batas. Maksimal 8000 karakter.");
      return;
    }
    if (remaining <= 0) {
      window.location.href = "/pricing";
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setResult(data.result || data.error || "Tidak ada hasil.");
      if (typeof data.remaining !== "undefined") setRemaining(data.remaining);
    } catch {
      setResult("Gagal menganalisis. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f1e7] text-[#1a2e2a] font-sans">
      {/* ============ HERO - 1 BLOK: HEADER + FOTO JADI SATU ============ */}
      <section className="relative w-full overflow-hidden">
        {/* Foto latar - ganti /hero-yulia.jpg dengan foto kamu, crop tanpa puncak gunung */}
        <img src="/hero-yulia.jpg" alt="Yulia Hartati" className="w-full h-[560px] object-cover object-[center_20%] block" />
        {/* Overlay tipis biar teks kebaca, bukan blok warna pisah */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/20 pointer-events-none" />

        {/* HEADER - nempel di atas foto, bukan bar pisah */}
        <header className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-5 z-20">
          <div className="flex items-center gap-2.5">
            {/* Logo transparan - file logo kamu */}
            <img src="/nri-logo-transparent.png" alt="NRI" className="w-11 h-11 rounded-full object-cover bg-white/10" />
            <span className="text-white text-[11px] leading-[1.1] font-bold tracking-[0.14em] drop-shadow">
              NARRATIVE<br />REASONING<br />INTELLIGENCE
            </span>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu" className="w-11 h-11 flex flex-col items-center justify-center gap-[5px] bg-black/25 rounded-full backdrop-blur">
            <span className="block w-5 h-[2px] bg-white rounded" />
            <span className="block w-5 h-[2px] bg-white rounded" />
            <span className="block w-5 h-[2px] bg-white rounded" />
          </button>
        </header>

        {menuOpen && (
          <nav className="absolute top-[70px] right-5 z-30 bg-white rounded-2xl shadow-xl p-3 w-[200px]">
            <a href="/" className="block px-3 py-2.5 rounded-xl hover:bg-[#eef7f5] font-semibold">Home</a>
            <a href="/nri" className="block px-3 py-2.5 rounded-xl hover:bg-[#eef7f5] font-semibold">NRI</a>
            <a href="/opini" className="block px-3 py-2.5 rounded-xl hover:bg-[#eef7f5] font-semibold">Opini</a>
            <a href="/projects" className="block px-3 py-2.5 rounded-xl hover:bg-[#eef7f5] font-semibold">Projects</a>
            <a href="/social-live" className="block px-3 py-2.5 rounded-xl hover:bg-[#eef7f5] font-semibold">Social Live</a>
          </nav>
        )}

        {/* Headline - di atas foto, rata kiri */}
        <div className="absolute left-5 right-5 bottom-[118px] z-10">
          <h1 className="text-white text-[42px] leading-[1.02] font-serif font-bold drop-shadow-lg">
            Baca, Pahami,<br />dan Analisis Teks<br />dalam Sekejap.
          </h1>
        </div>
      </section>

      {/* ============ BLOK NRI ANALISIS - PISAH DARI ARTIKEL ============ */}
      <section className="px-4 -mt-[92px] relative z-20">
        <div className="bg-white rounded-[28px] shadow-[0_12px_40px_rgba(0,0,0,0.12)] p-5">
          {/* Tombol Analisis Gratis - teal polos, tanpa bintang, tulisan gede, rata kiri */}
          <button
            onClick={handleAnalisis}
            disabled={loading}
            className="bg-[#0f766e] hover:bg-[#0d655e] text-white text-[19px] font-bold px-6 py-3.5 rounded-full text-left transition disabled:opacity-60"
          >
            {loading ? "Menganalisis..." : "Analisis Gratis"}
          </button>

          <div className="mt-4">
            <label className="block text-[17px] font-semibold mb-2 text-left">Tempel atau tulis teks di sini...</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              maxLength={8000}
              placeholder="Tempel atau tulis teks di sini..."
              className="w-full border border-[#d8e8e3] rounded-2xl p-4 text-[17px] leading-relaxed outline-none focus:border-[#0f766e] bg-[#fbfdfc] resize-none"
            />
            <div className="flex justify-between text-[13px] text-gray-500 mt-1.5">
              <span>{text.length} / 8000 karakter</span>
              {remaining <= 0 ? (
                <a href="/pricing" className="text-[#0f766e] font-bold underline">Gratis habis — Lanjut ke Produk</a>
              ) : (
                <span>Sisa gratis: {remaining}x</span>
              )}
            </div>
          </div>

          {result && (
            <div className="mt-4 bg-[#f0f7f5] rounded-2xl p-4 text-[16px] leading-relaxed whitespace-pre-wrap">
              {result}
            </div>
          )}
        </div>
      </section>

      {/* ============ BLOK ARTIKEL TERBARU - BLOK SENDIRI, DIPISAH ============ */}
      <section className="px-4 pt-10 pb-8">
        {/* Heading rata kiri, sejajar sama foto artikel, ada garis di kanan, tidak nempel ke batas blok */}
        <div className="flex items-center gap-3 px-1 mb-5">
          <h2 className="text-[24px] font-serif font-bold whitespace-nowrap text-left">Artikel Terbaru</h2>
          <span className="flex-1 h-[1.5px] bg-[#1a2e2a]/20" />
        </div>

        <div className="flex flex-col gap-5">
          {ARTICLES.map((a) => (
            <article key={a.id} className="bg-white rounded-[24px] overflow-hidden shadow-[0_8px_28px_rgba(0,0,0,0.07)]">
              <img src={a.img} alt={a.title} className="w-full h-[190px] object-cover block" />
              <div className="p-5">
                <span className="inline-block text-[12px] font-bold tracking-wide text-[#0f766e] bg-[#e6f3f0] px-3 py-1 rounded-full">{a.cat}</span>
                <h3 className="text-[21px] leading-snug font-bold mt-2.5 text-left">{a.title}</h3>
                <p className="text-[16px] leading-relaxed text-gray-600 mt-1.5 text-left">{a.excerpt}</p>

                {/* BARIS TANGGAL + WIDGET MEDSOS - 1 BARIS, DI DALAM KOLOM ARTIKEL */}
                <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-100">
                  <span className="text-[13px] text-gray-500">{a.read} • {a.date}</span>
                  <SocialWidget a={a} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="px-5 pb-8 pt-2 text-center text-[14px] text-gray-500">
        © 2024 yuliahartati.com • Tentang • Bantuan
      </footer>
    </main>
  );
}
