import { createClient } from '@/lib/supabase/server'
import { generateAnalytics } from '@/lib/analytics'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const studentId = searchParams.get('studentId')

    if (!studentId) {
        return NextResponse.json({ error: 'studentId parametresi zorunludur' }, { status: 400 })
    }

    const supabase = createClient()

    // Support both Web (Cookies) and iOS Native (Bearer Token)
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null

    let userObj = null

    if (token) {
        const { data: { user }, error } = await supabase.auth.getUser(token)
        if (error || !user) {
            return NextResponse.json({ error: 'Invalid Bearer Token' }, { status: 401 })
        }
        userObj = user
    } else {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        userObj = user
    }

    // Check ownership
    const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('id', studentId)
        .eq('parent_id', userObj.id)
        .single()

    if (!student) {
        return NextResponse.json({ error: 'Öğrenci bulunamadı veya yetkiniz yok' }, { status: 403 })
    }

    try {
        const analytics = await generateAnalytics(studentId, supabase)
        return NextResponse.json(analytics)
    } catch (e: unknown) {
        return NextResponse.json({ error: (e as Error).message || 'Analiz oluşturulurken hata' }, { status: 500 })
    }
}
