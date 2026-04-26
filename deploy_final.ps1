$env:SUPABASE_ACCESS_TOKEN = 'sbp_e662a12c12759a080b3fa9e456e2f87151260f7a'
npx supabase functions deploy whatsapp-webhook --project-ref nglwscakhhdhelhbqkyb --no-verify-jwt
npx supabase functions deploy whatsapp-send --project-ref nglwscakhhdhelhbqkyb --no-verify-jwt
