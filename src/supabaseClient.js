import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://kqsfaqbxyaiyrkwqarew.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtxc2ZhcWJ4eWFpeXJrd3FhcmV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NTU2OTgsImV4cCI6MjA3MzIzMTY5OH0.RLOkYMzrNFDHqJEmgYbvpTE-N0a8MZn-uaQ545raLNg"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)