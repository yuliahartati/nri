export default function PricingPage() {
  return (
    <div style={{ background: "#0a0a0a", color: "white", minHeight: "100vh", padding: "40px 20px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto", textAlign: "center" }}>
        <h1 style={{ fontSize: "32px", marginBottom: "8px" }}>Pilih Paket NRI</h1>
        <p style={{ color: "#a1a1a1", marginBottom: "32px" }}>
          Habis 3x gratis? Lanjut di sini. Bayar buat buka field yang dikunci, bukan cuma nambah jatah.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", textAlign: "left" }}>
          
          <div style={{ border: "1px solid #333", borderRadius: "16px", padding: "20px" }}>
            <h2>Free</h2>
            <p style={{ fontSize: "24px", fontWeight: "bold" }}>Rp0</p>
            <p style={{ color: "#a1a1a1" }}>3x analisis, buat nyoba</p>
            <ul>
              <li>5 bagian dasar</li>
              <li>Tanpa PDF</li>
              <li>Cocok buat tes pertama</li>
            </ul>
            <a href="/" style={{ display: "block", textAlign: "center", background: "#333", color: "white", padding: "10px", borderRadius: "10px", textDecoration: "none" }}>Coba Gratis</a>
          </div>

          <div style={{ border: "1px solid #333", borderRadius: "16px", padding: "20px" }}>
            <h2>Basic</h2>
            <p style={{ fontSize: "24px", fontWeight: "bold" }}>Rp49.000<span style={{ fontSize: "14px", color: "#a1a1a1" }}>/ bulan</span></p>
            <p style={{ color: "#a1a1a1" }}>30x analisis / bulan</p>
            <ul>
              <li>7 field: Overview, Claim, Evidence, Assumptions, Framing, Missing Context, Reasoning Risks</li>
              <li>4 field masih dikunci</li>
              <li>Cocok buat personal</li>
            </ul>
            <a href="https://wa.me/6289518935001?text=Halo, saya mau pilih paket Basic NRI Rp49.900" style={{ display: "block", textAlign: "center", background: "white", color: "black", padding: "10px", borderRadius: "10px", textDecoration: "none", fontWeight: "bold" }}>Pilih Basic</a>
          </div>

          <div style={{ border: "2px solid white", borderRadius: "16px", padding: "20px" }}>
            <h2>Pro ⭐ Paling Populer</h2>
            <p style={{ fontSize: "24px", fontWeight: "bold" }}>Rp149.000<span style={{ fontSize: "14px", color: "#a1a1a1" }}>/ bulan</span></p>
            <p style={{ color: "#a1a1a1" }}>100x analisis / bulan</p>
            <ul>
              <li>Semua 11 field kebuka</li>
              <li>Download .MD rapi</li>
              <li>Termasuk Emotional Triggers, Alternative Interpretations, Verification Questions, Uncertainty</li>
            </ul>
            <a href="https://wa.me/6289518935001?text=Halo, saya mau pilih paket Pro NRI Rp149.000" style={{ display: "block", textAlign: "center", background: "white", color: "black", padding: "10px", borderRadius: "10px", textDecoration: "none", fontWeight: "bold" }}>Pilih Pro</a>
          </div>

          <div style={{ border: "1px solid #333", borderRadius: "16px", padding: "20px" }}>
            <h2>Enterprise</h2>
            <p style={{ fontSize: "24px", fontWeight: "bold" }}>Custom</p>
            <p style={{ color: "#a1a1a1" }}>150x+ / bulan, API + Embed</p>
            <ul>
              <li>Semua 11 field kebuka</li>
              <li>API key khusus + Embed ke web mereka</li>
              <li>Untuk sekolah, komunitas, perusahaan</li>
              <li>Analisa marketing, komentar konsumen, narasi pegawai</li>
            </ul>
            <a href="https://wa.me/6289518935001?text=Halo, saya mau tanya paket Enterprise NRI / API" style={{ display: "block", textAlign: "center", background: "#333", color: "white", padding: "10px", borderRadius: "10px", textDecoration: "none" }}>Hubungi Kami</a>
          </div>

        </div>

        <p style={{ color: "#666", marginTop: "32px", fontSize: "13px" }}>
          Untuk awal, pembayaran via WhatsApp manual dulu. Setelah kamu pilih paket, kami kirim cara bayar dan aktivasi.
        </p>
      </div>
    </div>
  );
}
