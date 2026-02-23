import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Refresh session — do not remove this block
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const { pathname } = request.nextUrl
    const publicPaths = ['/login', '/register']
    const isPublic = publicPaths.some((p) => pathname.startsWith(p))

    // Not authenticated → redirect to login
    if (!user && !isPublic) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // Authenticated + public path → redirect to own dashboard
    if (user && isPublic) {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile?.role) {
            console.error('[middleware] Profile/role missing for user:', user.id, profileError?.message)
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }

        const url = request.nextUrl.clone()
        url.pathname = `/${profile.role}/dashboard`
        return NextResponse.redirect(url)
    }

    // Authenticated + protected path → enforce role boundaries
    if (user && !isPublic) {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile?.role) {
            console.error('[middleware] Profile/role missing for user:', user.id, profileError?.message)
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }

        const role = profile.role

        // Root → dashboard
        if (pathname === '/') {
            const url = request.nextUrl.clone()
            url.pathname = `/${role}/dashboard`
            return NextResponse.redirect(url)
        }

        // Cross-role access guard
        if (pathname.startsWith('/parent') && role !== 'parent') {
            const url = request.nextUrl.clone()
            url.pathname = '/student/dashboard'
            return NextResponse.redirect(url)
        }

        if (pathname.startsWith('/student') && role !== 'student') {
            const url = request.nextUrl.clone()
            url.pathname = '/parent/dashboard'
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}
