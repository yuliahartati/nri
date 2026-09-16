export const metadata = {
  title: "NRI — Narrative Reasoning Intelligence",
  description: "Understand the narrative. Don't just react to it.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}