// /api/mesas.js
export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).send("Configuración de Supabase incompleta");
  }

  const HEADERS = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: "Bearer " + SUPABASE_SERVICE_KEY,
    "Content-Type": "application/json",
  };

  const token = req.method === "GET" ? req.query.token : req.body.token;
  if (!token) {
    return res.status(400).send("Falta el token");
  }

  try {
    // Validar invitado con token
    const invitadoResp = await fetch(
      `${SUPABASE_URL}/rest/v1/invitados?mesa_token=eq.${token}&select=id,nombre,correo,dni,opciones,retiro`,
      { headers: HEADERS }
    );
    const invitadoData = await invitadoResp.json();
    const invitado = invitadoData?.[0];

    if (!invitado) {
      return res.status(404).send("Token inválido");
    }

    if (!invitado.retiro) {
      return res
        .status(403)
        .send("Todavía no retiraste tu entrada, no podés elegir mesa");
    }

    if (req.method === "GET") {
      // Devolver estado de mesas + ocupación + invitado
      const mesasResp = await fetch(
        `${SUPABASE_URL}/rest/v1/mesas?select=id,numero,capacidad,mesa_asientos(id,posicion,invitado_id,invitados(nombre))`,
        { headers: HEADERS }
      );
      const mesas = await mesasResp.json();

      // Calcular asientos ocupados por este invitado
      const ocupadosResp = await fetch(
        `${SUPABASE_URL}/rest/v1/mesa_asientos?invitado_id=eq.${invitado.id}`,
        { headers: HEADERS }
      );
      const ocupados = await ocupadosResp.json();

      return res.status(200).json({
        invitado: {
          id: invitado.id,
          nombre: invitado.nombre,
          correo: invitado.correo,
          dni: invitado.dni,
          max_asientos: invitado.opciones,
          asientos_ocupados: ocupados.map((a) => ({
            mesa_id: a.mesa_id,
            posicion: a.posicion,
          })),
        },
        mesas,
      });
    }

    if (req.method === "POST") {
      // Confirmar selección de asientos
      const { seleccionados } = req.body;

      if (!Array.isArray(seleccionados) || seleccionados.length === 0) {
        return res.status(400).send("No se recibieron asientos seleccionados");
      }

      if (seleccionados.length !== invitado.opciones) {
        return res
          .status(400)
          .send(`Debés elegir exactamente ${invitado.opciones} asientos`);
      }

      // Borrar asientos previos del invitado
      await fetch(
        `${SUPABASE_URL}/rest/v1/mesa_asientos?invitado_id=eq.${invitado.id}`,
        { method: "DELETE", headers: HEADERS }
      );

      // Insertar todos los nuevos
      const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/mesa_asientos`, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify(
          seleccionados.map((s) => ({
            mesa_id: s.mesa_id,
            posicion: s.posicion,
            invitado_id: invitado.id,
          }))
        ),
      });

      if (!insertResp.ok) {
        const txt = await insertResp.text();
        return res
          .status(400)
          .send(`No se pudo confirmar la selección. ${txt}`);
      }

      // Notificar al App Script para enviar correo resumen
      try {
        await fetch(process.env.SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "resumen_mesas",
            dni: invitado.dni,
            nombre: invitado.nombre,
            correo: invitado.correo,
            asientos: seleccionados,
          }),
        });
      } catch (err) {
        console.error("No se pudo notificar a App Script:", err);
      }

      return res.status(200).send("Selección de asientos confirmada");
    }

    return res.status(405).send("Método no permitido");
  } catch (err) {
    console.error("Error en /api/mesas:", err);
    return res.status(500).send("Error interno en el servidor");
  }
}