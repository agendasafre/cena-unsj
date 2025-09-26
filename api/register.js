export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Método no permitido");
  }

  const { dni, nombre, correo, lugar, opciones } = req.body;

  if (!dni || !nombre || !correo || !lugar) {
    return res.status(400).send("❌ Faltan datos obligatorios.");
  }

  // 📅 Fecha límite
  const limite = new Date("2025-11-28T23:59:59");
  if (new Date() > limite) {
    return res.status(403).send("⏰ El período de registro ha finalizado.");
  }

  try {
    // 🔐 Reenviamos el formulario al Apps Script (oculto con ENV)
    const scriptUrl = process.env.SCRIPT_URL;
    const query = new URLSearchParams({ dni, nombre, correo, lugar, opciones }).toString();

    const response = await fetch(`${scriptUrl}?${query}`, { method: "POST" });
    const text = await response.text();

    if (!response.ok || !text.includes("✅")) {
      return res.status(500).send("❌ Error al procesar el registro.");
    }

    return res.status(200).send(text);
  } catch (err) {
    console.error("❌ Error al reenviar al script:", err);
    return res.status(500).send("❌ No se pudo completar el registro.");
  }
}
