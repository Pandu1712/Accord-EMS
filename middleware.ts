import { NextRequest, NextResponse } from 'next/server'

// Routes that don't require authentication
const publicRoutes = ['/login', '/reset-password', '/', '/api/health']

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Protected routes - redirect to login if not authenticated
  if (pathname.startsWith('/dashboard')) {
    // This check will be done on the client side through the auth context
    // Server-side auth is handled via auth context provider
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
