import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SERVICE_ROLE_KEY")!;

serve(async (_req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Llama a la función SQL que registra al ganador en sorteos y devuelve el id
    const { data: ganadorId, error } = await supabase.rpc("sortear_asistente");
    if (error) return new Response(error.message, { status: 500 });

    if (!ganadorId) return new Response(JSON.stringify(null), { status: 200 });

    const { data: ganador, error: e2 } = await supabase
      .from("asistentes")
      .select("id, nombre, dni, rol, lugar")
      .eq("id", ganadorId)
      .single();

    if (e2) return new Response(e2.message, { status: 500 });

    return new Response(JSON.stringify(ganador), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error(e);
    return new Response("Server error", { status: 500 });
  }
});
