import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')

  if (error) {
    console.error('Auth callback error:', error, error_description)
    // エラーがあってもホームページにリダイレクト
    return NextResponse.redirect(`${requestUrl.origin}/?error=auth_error`)
  }

  if (code) {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Error exchanging code for session:', error)
        return NextResponse.redirect(`${requestUrl.origin}/?error=session_error`)
      }
      
      console.log('Email confirmation successful for user:', data.user?.email)
      
      // メール確認完了、ホームページにリダイレクト
      return NextResponse.redirect(`${requestUrl.origin}/?confirmed=true`)
      
    } catch (error) {
      console.error('Unexpected error during auth callback:', error)
      return NextResponse.redirect(`${requestUrl.origin}/?error=unexpected`)
    }
  }

  // コードがない場合もホームページにリダイレクト
  return NextResponse.redirect(`${requestUrl.origin}/`)
}