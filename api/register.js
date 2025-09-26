export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Método no permitido");
  }

  const {
    dni,
    nombre,
    correo,
    lugar,
    opciones,
    celiacos = 0,
    vegetarianos = 0,
    veganos = 0,
  } = req.body;

  if (!dni || !nombre || !correo || !lugar) {
    return res.status(400).send("❌ Faltan datos obligatorios.");
  }

  const numOpciones = parseInt(opciones ?? 0, 10) || 0;
  const numCeliacos = parseInt(celiacos ?? 0, 10) || 0;
  const numVegetarianos = parseInt(vegetarianos ?? 0, 10) || 0;
  const numVeganos = parseInt(veganos ?? 0, 10) || 0;

  if (numCeliacos < 0 || numVegetarianos < 0 || numVeganos < 0) {
    return res.status(400).send("❌ Los menús especiales no pueden ser negativos.");
  }

  const sumaEspeciales = numCeliacos + numVegetarianos + numVeganos;
  if (sumaEspeciales > numOpciones) {
    return res.status(400).send("❌ La suma de menús especiales no puede superar la cantidad de opciones.");
  }

  // 📅 Fecha límite
  const limite = new Date("2025-11-28T23:59:59");
  if (new Date() > limite) {
    return res.status(403).send("⏰ El período de registro ha finalizado.");
  }

  try {
    // 🔐 Reenviamos el formulario al Apps Script (oculto con ENV)
    const scriptUrl = process.env.SCRIPT_URL;
    const query = new URLSearchParams({
      dni,
      nombre,
      correo,
      lugar,
      opciones: String(numOpciones),
      celiacos: String(numCeliacos),
      vegetarianos: String(numVegetarianos),
      veganos: String(numVeganos),
    }).toString();

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
