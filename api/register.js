export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Método no permitido");
  }

  const {
    dni,
    nombre,
    correo,
    lugar,
    comun = 0,
    celiacos = 0,
    vegetarianos = 0,
    veganos = 0,
  } = req.body;

  if (!dni || !nombre || !correo || !lugar) {
    return res.status(400).send("❌ Faltan datos obligatorios.");
  }

  const numComun = parseInt(comun ?? 0, 10) || 0;
  const numCeliacos = parseInt(celiacos ?? 0, 10) || 0;
  const numVegetarianos = parseInt(vegetarianos ?? 0, 10) || 0;
  const numVeganos = parseInt(veganos ?? 0, 10) || 0;

  const total = numComun + numCeliacos + numVegetarianos + numVeganos;

  if (total < 1) {
    return res.status(400).send("❌ Debés seleccionar al menos un menú.");
  }

  if (numComun < 0 || numCeliacos < 0 || numVegetarianos < 0 || numVeganos < 0) {
    return res.status(400).send("❌ Los menús no pueden ser negativos.");
  }

  // 📅 Fecha límite
  const limite = new Date("2025-11-28T23:59:59");
  if (new Date() > limite) {
    return res.status(403).send("⏰ El período de registro ha finalizado.");
  }

  try {
    // 🔐 Reenviamos al Apps Script
    const scriptUrl = process.env.SCRIPT_URL;
    const query = new URLSearchParams({
      dni,
      nombre,
      correo,
      lugar,
      comun: String(numComun),
      celiacos: String(numCeliacos),
      vegetarianos: String(numVegetarianos),
      veganos: String(numVeganos),
      opciones: String(total),
    }).toString();

    const response = await fetch(`${scriptUrl}?${query}`, { method: "POST" });
    const text = await response.text();

    console.log("Respuesta Apps Script:", text);
    
    if (!response.ok || !text.includes("✅")) {
      return res.status(500).send("❌ Error al procesar el registro.");
    }

    return res.status(200).send(text);
  } catch (err) {
    console.error("❌ Error al reenviar al script:", err);
    return res.status(500).send("❌ No se pudo completar el registro.");
  }
}
