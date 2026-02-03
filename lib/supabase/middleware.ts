import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // DEVELOPMENT MODE: Auth disabled for easier development
  // TODO: Re-enable auth before production by uncommenting below

  // Refresh session if it exists
  // const { data: { user } } = await supabase.auth.getUser()

  // Protected routes - redirect to login if not authenticated
  // const protectedPaths = ['/']
  // const isProtectedPath = protectedPaths.some(
  //   (path) => request.nextUrl.pathname === path ||
  //             request.nextUrl.pathname.startsWith('/api/assets') ||
  //             request.nextUrl.pathname.startsWith('/api/search')
  // )

  // if (!user && isProtectedPath) {
  //   const loginUrl = new URL('/login', request.url)
  //   loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
  //   return NextResponse.redirect(loginUrl)
  // }

  // Auth routes - redirect to home if already authenticated
  // const authPaths = ['/login']
  // const isAuthPath = authPaths.some((path) =>
  //   request.nextUrl.pathname.startsWith(path)
  // )

  // if (user && isAuthPath) {
  //   return NextResponse.redirect(new URL('/', request.url))
  // }

  return response
}
