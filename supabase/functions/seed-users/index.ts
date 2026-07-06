import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const dbUrl = Deno.env.get("SUPABASE_DB_URL")
    if (!dbUrl) throw new Error("No SUPABASE_DB_URL")

    const { Pool } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts")
    const pool = new Pool(dbUrl, 1, true)
    const connection = await pool.connect()
    try {
      await connection.queryObject`UPDATE auth.users SET is_super_admin = false WHERE is_super_admin IS NULL;`
      await connection.queryObject`UPDATE auth.users SET is_sso_user = false WHERE is_sso_user IS NULL;`
      await connection.queryObject`UPDATE auth.users SET is_anonymous = false WHERE is_anonymous IS NULL;`
      
      const result = await connection.queryObject`SELECT * FROM auth.users;`
      return new Response(JSON.stringify({ success: true, users: result.rows }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    } finally {
      connection.release()
      await pool.end()
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || JSON.stringify(err) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
