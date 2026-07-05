import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
}

const ORG_ID = '00000000-0000-0000-0000-000000000001'

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization header" }), {
      status: 401,
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

  // Admin client to create auth users
  const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Verify the user is authenticated and has permission
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }

  // Get requesting user's employee record to check role
  const { data: requestingEmp } = await adminClient
    .from('employees')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const allowedRoles = ['super_admin', 'admin', 'hr_manager']
  if (!requestingEmp || !allowedRoles.includes(requestingEmp.role)) {
    return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }

  // Parse request body
  let body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }

  const { email, password, first_name, last_name, phone, position, department_id, role, employment_type } = body

  if (!email || !password || !first_name) {
    return new Response(JSON.stringify({ error: "Missing required fields: email, password, first_name" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }

  // Create auth user with email confirmation disabled
  const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email
    user_metadata: {
      first_name,
      last_name: last_name || '',
    }
  })

  if (createError) {
    return new Response(JSON.stringify({ error: createError.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }

  const userId = authData.user.id

  // Create employee record
  const employeeId = `EMP-${Date.now().toString().slice(-4)}`
  const { data: employee, error: empError } = await adminClient
    .from('employees')
    .insert({
      user_id: userId,
      org_id: ORG_ID,
      employee_id: employeeId,
      email,
      first_name,
      last_name: last_name || '',
      phone: phone || null,
      position: position || null,
      department_id: department_id || null,
      role: role || 'employee',
      employment_type: employment_type || 'full_time',
      status: 'active',
    })
    .select('*, departments(*)')
    .single()

  if (empError) {
    // Rollback: delete the auth user we just created
    await adminClient.auth.admin.deleteUser(userId)
    return new Response(JSON.stringify({ error: empError.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }

  return new Response(JSON.stringify({ employee }), {
    status: 201,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  })
})
