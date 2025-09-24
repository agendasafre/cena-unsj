// Deno Edge Function
// POST { dni: string, pin: string, estado?: 'asistio'|'no_identificado' }
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!; // el CLI lo setea automáticamente
const SERVICE_ROLE = Deno.env.get("SERVICE_ROLE_KEY")!;
const CONTROL_PIN = Deno.env.get("CONTROL_PIN")!;

serve(async (req) => {

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",       // ⚠️ podés restringir a tu dominio si querés
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Manejo de preflight (OPTIONS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const { dni, pin, estado } = await req.json();
    if (!dni || !pin) return new Response("Falta dni o pin", { status: 400 });

    if (pin !== CONTROL_PIN) {
      return new Response("PIN inválido", { status: 401 });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const newEstado = estado === "no_identificado" ? "no_identificado" : "asistio";

    const { error } = await supabase
      .from("asistentes")
      .update({ estado: newEstado, hora_checkin: new Date().toISOString() })
      .eq("dni", String(dni)); // podés afinar por rol si quisieras

    if (error) {
      console.error(error);
      return new Response("Error actualizando", { status: 500 });
    }

    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response("Server error", { status: 500 });
  }
});