import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { SignJWT } from 'jose'

// GET /api/auth/figma-callback - Handle Figma plugin OAuth callback
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const state = searchParams.get('state')
  const code = searchParams.get('code')

  if (!state) {
    return new Response('Missing state parameter', { status: 400 })
  }

  const supabase = await createServerSupabaseClient()

  // If there's an auth code, exchange it for a session
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error || !data.user) {
      return new Response('Auth failed', { status: 401 })
    }

    // Validate email domain
    if (!data.user.email?.endsWith('@superpower.com')) {
      return new Response('Must use @superpower.com email', { status: 403 })
    }

    // Generate plugin token (7 day expiry)
    const secret = new TextEncoder().encode(
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'secret'
    )

    const token = await new SignJWT({ user_id: data.user.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(secret)

    const pluginToken = {
      token,
      user_id: data.user.id,
      email: data.user.email,
      expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000,
    }

    const encodedToken = Buffer.from(JSON.stringify(pluginToken)).toString('base64')

    // Redirect back to Figma plugin
    // Note: figma:// protocol doesn't work from server redirects
    // Instead, we'll show a page that the user can use to complete auth
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Superpower Library - Auth Complete</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #f5f5f5;
            }
            .card {
              background: white;
              padding: 2rem;
              border-radius: 1rem;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              text-align: center;
              max-width: 400px;
            }
            h1 { color: #22C55E; margin-bottom: 0.5rem; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>✓ Signed In</h1>
            <p>You can close this window and return to Figma.</p>
            <p style="font-size: 12px; color: #999;">
              If the plugin didn't receive the auth, run "Sign In" again.
            </p>
          </div>
          <script>
            // Try to send token back to plugin via opener
            if (window.opener) {
              window.opener.postMessage({
                type: 'figma-auth-callback',
                token: '${encodedToken}',
                state: '${state}'
              }, '*');
            }
          </script>
        </body>
      </html>
      `,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    )
  }

  // No code, check if user is already logged in
  const { data: { user } } = await supabase.auth.getUser()

  if (user && user.email?.endsWith('@superpower.com')) {
    // Generate token for existing session
    const secret = new TextEncoder().encode(
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'secret'
    )

    const token = await new SignJWT({ user_id: user.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(secret)

    const pluginToken = {
      token,
      user_id: user.id,
      email: user.email,
      expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000,
    }

    const encodedToken = Buffer.from(JSON.stringify(pluginToken)).toString('base64')

    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Superpower Library - Auth Complete</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #f5f5f5;
            }
            .card {
              background: white;
              padding: 2rem;
              border-radius: 1rem;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              text-align: center;
              max-width: 400px;
            }
            h1 { color: #22C55E; margin-bottom: 0.5rem; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>✓ Signed In</h1>
            <p>You can close this window and return to Figma.</p>
          </div>
        </body>
      </html>
      `,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    )
  }

  // Redirect to login
  const loginUrl = new URL('/login', origin)
  loginUrl.searchParams.set('redirect', `/api/auth/figma-callback?state=${state}`)

  return NextResponse.redirect(loginUrl)
}
