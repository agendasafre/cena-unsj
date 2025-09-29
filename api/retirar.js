// // api/retirar.js
// export default async function handler(req, res) {
//   if (req.method !== "POST") {
//     return res.status(405).send("Método no permitido");
//   }
  
//   const { dni, opciones, celiacos = 0, vegetarianos = 0, veganos = 0 } = req.body;

//   if (!dni) {
//     return res.status(400).send("❌ Falta el DNI.");
//   }

//   // 📅 Fecha límite
//   const limite = new Date("2025-11-28T23:59:59");
//   if (new Date() > limite) {
//     return res.status(403).send("⏰ El período de retiro ha finalizado.");
//   }

//   try {
//     const scriptUrl = process.env.SCRIPT_URL;
//     const query = new URLSearchParams({
//       action: "retirar",
//       dni,
//       opciones: opciones || 0,
//       celiacos: celiacos || 0,
//       vegetarianos: vegetarianos || 0,
//       veganos: veganos || 0
//     }).toString();

//     const response = await fetch(`${scriptUrl}?${query}`, { method: "POST" });
//     const text = await response.text();

//     if (!response.ok || !text.includes("✅")) {
//       return res.status(500).send("❌ Error al registrar el retiro.");
//     }

//     return res.status(200).send(text);
//   } catch (err) {
//     console.error("❌ Error al reenviar al script:", err);
//     return res.status(500).send("❌ No se pudo completar el retiro.");
//   }
// }
// api/retirar.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Método no permitido");
  }
  
  const { dni, opciones, celiacos = 0, vegetarianos = 0, veganos = 0 } = req.body;
  if (!dni) return res.status(400).send("❌ Falta el DNI.");

  try {
    // 🔹 asignar números en Supabase
    const { data, error } = await supabase
      .from("entradas")
      .select("numero")
      .eq("entregado", false)
      .order("random()")
      .limit(Number(opciones));

    if (error) throw error;
    const numeros = data.map(d => d.numero);

    await supabase
      .from("entradas")
      .update({ entregado: true, dni_titular: dni })
      .in("numero", numeros);

    // 🔹 seguir mandando al Apps Script (correo)
    const scriptUrl = process.env.SCRIPT_URL;
    const query = new URLSearchParams({
      action: "retirar",
      dni,
      opciones: opciones || 0,
      celiacos: celiacos || 0,
      vegetarianos: vegetarianos || 0,
      veganos: veganos || 0,
    }).toString();
    await fetch(`${scriptUrl}?${query}`, { method: "POST" });

    return res.status(200).send(`✅ Números entregados: ${numeros.join(", ")}`);
  } catch (err) {
    console.error(err);
    return res.status(500).send("❌ No se pudo completar el retiro.");
  }
}
