import { NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json({
      MAINTENANCE_MODE: process.env.MAINTENANCE_MODE,
      MAINTENANCE_MESSAGE: process.env.MAINTENANCE_MESSAGE,
      MAINTENANCE_END_TIME: process.env.MAINTENANCE_END_TIME,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Environment check failed' }, { status: 500 })
  }
}