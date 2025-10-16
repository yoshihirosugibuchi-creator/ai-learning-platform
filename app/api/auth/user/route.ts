import { NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'

export async function GET(request: Request) {
  try {
    const { userId, role: userRole } = await getCurrentUserRole(request)
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    console.log('🔐 User auth successful:', { userId, role: userRole })

    // Define permissions based on role
    const permissions = {
      can_view_users: userRole === 'admin' || userRole === 'system_admin',
      can_edit_roles: userRole === 'system_admin',
      can_access_admin: userRole === 'admin' || userRole === 'system_admin'
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: null, // We don't expose email in this endpoint
        role: userRole
      },
      permissions
    })
  } catch (error) {
    console.error('Error in auth/user API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}