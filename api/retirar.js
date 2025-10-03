export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Método no permitido");
  }

  const { dni, comun = 0, celiacos = 0, vegetarianos = 0, veganos = 0 } = req.body;

  if (!dni) {
    return res.status(400).send("❌ Falta el DNI.");
  }

  const numComun = parseInt(comun ?? 0, 10) || 0;
  const numCeliacos = parseInt(celiacos ?? 0, 10) || 0;
  const numVegetarianos = parseInt(vegetarianos ?? 0, 10) || 0;
  const numVeganos = parseInt(veganos ?? 0, 10) || 0;

  const total = numComun + numCeliacos + numVegetarianos + numVeganos;

  if (total < 1) {
    return res.status(400).send("❌ Debés retirar al menos un menú.");
  }

  if (numComun < 0 || numCeliacos < 0 || numVegetarianos < 0 || numVeganos < 0) {
    return res.status(400).send("❌ Los menús no pueden ser negativos.");
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
      comun: String(numComun),
      celiacos: String(numCeliacos),
      vegetarianos: String(numVegetarianos),
      veganos: String(numVeganos),
    }).toString();

    const response = await fetch(`${scriptUrl}?${query}`, { method: "POST" });
    const text = await response.text();

    return res.status(response.ok ? 200 : 500).send(text);
  } catch (err) {
    console.error("❌ Error al reenviar al script:", err);
    return res.status(500).send("❌ No se pudo completar el retiro.");
  }
}
