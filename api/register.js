import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // 📅 Fecha límite global
  const limite = new Date("2025-11-28T23:59:59");
  if (new Date() > limite) {
    return res.status(403).send("⏰ El período de registro ha finalizado.");
  }

  // 📌 GET → Validación de DNI (blur del input)
  if (req.method === "GET") {
    const { dni } = req.query;
    if (!dni) return res.status(400).json({ error: "DNI requerido" });

    const { data, error } = await supabase
      .from("invitados")
      .select("dni, estado, retiro")
      .eq("dni", dni)
      .maybeSingle();

    if (error) {
      console.error("❌ Error al buscar DNI:", error);
      return res.status(500).json({ error: "Error al buscar el DNI." });
    }

    if (!data) {
      return res.status(200).json({ habilitado: false });
    }

    return res.status(200).json({
      habilitado: true,
      estado: data.estado,
      retiro: data.retiro,
    });
  }

  // 📌 POST → Registro o actualización
  if (req.method === "POST") {
    const { dni, nombre, correo, lugar, opciones } = req.body;

    if (!dni || !nombre || !correo || !lugar) {
      return res.status(400).send("❌ Faltan datos obligatorios.");
    }

    // Verificar si existe y su estado
    const { data: registros, error: selError } = await supabase
      .from("invitados")
      .select("*")
      .eq("dni", dni);

    if (selError) {
      console.error("❌ Error al consultar:", selError);
      return res.status(500).send("❌ Error al consultar la base.");
    }

    if (!registros?.length) {
      return res.status(404).send("❌ El DNI no está autorizado para inscribirse.");
    }

    const invitado = registros[0];
    if (invitado.retiro === true) {
      return res.status(403).send("⚠️ Este DNI ya retiró su entrada. No puede registrarse.");
    }

    // Actualizar datos
    const { error: updError } = await supabase
      .from("invitados")
      .update({
        nombre,
        correo,
        lugar_trabajo: lugar,
        estado: "inscripto",
        opciones,
        acepto_terminos: true,
        retiro: false,
      })
      .eq("dni", dni);

    if (updError) {
      console.error("❌ Error al actualizar:", updError);
      return res.status(500).send("❌ No se pudo actualizar el registro.");
    }

    return res.status(200).send("✅ Tu registro fue procesado correctamente.");
  }

  // 🚫 Otros métodos no permitidos
  return res.status(405).send("Método no permitido");
}
