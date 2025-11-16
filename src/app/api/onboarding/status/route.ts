import { NextRequest, NextResponse } from 'next/server'
import { getOnboardingStatus } from '@/app/provider/onboarding/actions'

export async function POST(req: NextRequest) {
  try {
    const { providerId } = await req.json()
    
    if (!providerId) {
      return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 })
    }
    
    const status = await getOnboardingStatus(providerId)
    
    return NextResponse.json(status)
  } catch (error) {
    console.error('Error getting onboarding status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}