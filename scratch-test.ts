import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gwjivxybcvjztfdzhoyz.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3aml2eHliY3ZqenRmZHpob3l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyMjYwMjcsImV4cCI6MjA5ODgwMjAyN30.ZURby5sPtoqQzHZM_Ch1zHfSHZIy7nOsO8K6tlvWHSk'

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase.functions.invoke('manage-users', {
    body: { action: 'list' }
  })
  console.log("DATA:", JSON.stringify(data, null, 2))
  console.log("ERROR:", error)
}
run()
