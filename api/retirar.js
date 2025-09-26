// api/retirar.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Método no permitido");
  }
  
  const { dni, opciones, celiacos = 0, vegetarianos = 0, veganos = 0 } = req.body;

  if (!dni) {
    return res.status(400).send("❌ Falta el DNI.");
  }

  // 📅 Fecha límite
  const limite = new Date("2025-11-28T23:59:59");
  if (new Date() > limite) {
    return res.status(403).send("⏰ El período de retiro ha finalizado.");
  }

  try {
    const scriptUrl = process.env.SCRIPT_URL;
    const query = new URLSearchParams({
      action: "retirar",
      dni,
      opciones: opciones || 0,
      celiacos: celiacos || 0,
      vegetarianos: vegetarianos || 0,
      veganos: veganos || 0
    }).toString();

    const response = await fetch(`${scriptUrl}?${query}`, { method: "POST" });
    const text = await response.text();

    if (!response.ok || !text.includes("✅")) {
      return res.status(500).send("❌ Error al registrar el retiro.");
    }

    return res.status(200).send(text);
  } catch (err) {
    console.error("❌ Error al reenviar al script:", err);
    return res.status(500).send("❌ No se pudo completar el retiro.");
  }
}
