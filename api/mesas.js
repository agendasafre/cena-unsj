export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).send("❌ Configuración de Supabase incompleta");
  }

  const HEADERS = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: "Bearer " + SUPABASE_SERVICE_KEY,
    "Content-Type": "application/json",
  };

  const token = req.method === "GET" ? req.query.token : req.body.token;
  if (!token) {
    return res.status(400).send("❌ Falta el token");
  }

  try {
    // 1. Validar invitado con token
    const invitadoResp = await fetch(
      `${SUPABASE_URL}/rest/v1/invitados?mesa_token=eq.${token}&select=id,nombre,opciones,retiro`,
      { headers: HEADERS }
    );
    const invitadoData = await invitadoResp.json();
    const invitado = invitadoData?.[0];

    if (!invitado) {
      return res.status(404).send("Token inválido");
    }

    if (!invitado.retiro) {
      return res.status(403).send("Todavía no retiraste tu entrada, no podés elegir mesa");
    }

    if (req.method === "GET") {
      // 2. Devolver estado de mesas + ocupación + invitado
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
          max_asientos: invitado.opciones,
          asientos_ocupados: ocupados.map(a => ({ mesa_id: a.mesa_id, posicion: a.posicion })),
        },
        mesas,
      });
    }

    if (req.method === "POST") {
      // 3. Asignar asiento
      const { mesa_id, posicion } = req.body;

      if (!mesa_id || !posicion) {
        return res.status(400).send("Faltan mesa_id o posicion");
      }

      // Verificar cuántos asientos ya tiene ocupados
      const ocupadosResp = await fetch(
        `${SUPABASE_URL}/rest/v1/mesa_asientos?invitado_id=eq.${invitado.id}`,
        { headers: HEADERS }
      );
      const ocupados = await ocupadosResp.json();

      if (ocupados.length >= invitado.opciones) {
        return res.status(400).send("Ya ocupaste todos los asientos que te corresponden");
      }

      // Intentar insertar asiento
      const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/mesa_asientos`, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({
          mesa_id,
          posicion,
          invitado_id: invitado.id,
        }),
      });

      if (!insertResp.ok) {
        const txt = await insertResp.text();
        return res.status(400).send(`No se pudo asignar asiento (quizás ya está ocupado). ${txt}`);
      }

      return res.status(200).send("Asiento asignado correctamente");
    }

    if (req.method === "DELETE") {
      // 4. Liberar asiento
      const { mesa_id, posicion } = req.body;

      if (!mesa_id || !posicion) {
        return res.status(400).send("Faltan mesa_id o posicion");
      }

      const deleteResp = await fetch(
        `${SUPABASE_URL}/rest/v1/mesa_asientos?mesa_id=eq.${mesa_id}&posicion=eq.${posicion}&invitado_id=eq.${invitado.id}`,
        { method: "DELETE", headers: HEADERS }
      );

      if (!deleteResp.ok) {
        return res.status(400).send("No se pudo liberar el asiento");
      }

      return res.status(200).send("Asiento liberado");
    }

    return res.status(405).send("Método no permitido");
  } catch (err) {
    console.error("❌ Error en /api/mesas:", err);
    return res.status(500).send("❌ Error interno en el servidor");
  }
}
