import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization header" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

  // Client with user's JWT to verify permissions
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  })

  // Admin client to manage auth users
  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Verify the user is authenticated and has permission
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }

  // Get requesting user's employee record to check role
  const { data: requestingEmp } = await adminClient
    .from('employees')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const allowedRoles = ['super_admin', 'admin'] // Allow admins as well
  if (!requestingEmp || !allowedRoles.includes(requestingEmp.role)) {
    return new Response(JSON.stringify({ error: "Insufficient permissions. Only super admins and admins can manage auth users." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }

  // Parse request body
  let body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }

  const { action, userId, newPassword } = body

  if (!action) {
    return new Response(JSON.stringify({ error: "Missing action" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }

  try {
    switch (action) {
      case 'list': {
        // Fetch users using direct Postgres to completely bypass GoTrue JSON parsing crashes
        const dbUrl = Deno.env.get("SUPABASE_DB_URL")
        if (dbUrl) {
          const { Pool } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts")
          const pool = new Pool(dbUrl, 1, true)
          const connection = await pool.connect()
          try {
            const result = await connection.queryObject`
              SELECT id, email, created_at, last_sign_in_at, email_confirmed_at, banned_until 
              FROM auth.users;
            `
            return new Response(JSON.stringify({ users: result.rows }), {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            })
          } finally {
            connection.release()
            await pool.end()
          }
        } else {
          // Fallback if DB_URL missing
          const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'apikey': supabaseServiceKey,
              'Content-Type': 'application/json'
            }
          })
          if (!res.ok) {
            const errText = await res.text()
            return new Response(JSON.stringify({ error: `HTTP ${res.status}: ${errText}` }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
          }
          const data = await res.json()
          const users = Array.isArray(data) ? data : (data.users || [])
          return new Response(JSON.stringify({ users }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          })
        }
      }

      case 'update_password': {
        if (!userId || !newPassword) throw new Error("Missing userId or newPassword")
        const { error: pwdError } = await adminClient.auth.admin.updateUserById(userId, {
          password: newPassword
        })
        if (pwdError) throw pwdError
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }

      case 'suspend': {
        if (!userId) throw new Error("Missing userId")
        // To suspend a user, we can ban them until year 3000
        const { error: banError } = await adminClient.auth.admin.updateUserById(userId, {
          ban_duration: '8760000h' // 1000 years
        })
        if (banError) throw banError
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }

      case 'unsuspend': {
        if (!userId) throw new Error("Missing userId")
        // Remove ban
        const { error: unbanError } = await adminClient.auth.admin.updateUserById(userId, {
          ban_duration: 'none'
        })
        if (unbanError) throw unbanError
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }

      case 'delete': {
        if (!userId) throw new Error("Missing userId")
        
        // Delete employee record first
        await adminClient.from('employees').delete().eq('user_id', userId)

        const { error: delError } = await adminClient.auth.admin.deleteUser(userId)
        if (delError) throw delError
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }

      default:
        throw new Error("Invalid action")
    }
  } catch (err: any) {
    const message = err?.message || (typeof err === 'string' ? err : 'Unknown error occurred')
    return new Response(JSON.stringify({ error: message, rawError: JSON.stringify(err) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
