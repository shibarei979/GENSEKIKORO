'use client'
import StoryBoard from '@/components/StoryBoard'

export default function StoryBoardPage({ userId }: { userId: string }) {
  return <StoryBoard userId={userId} isModal={false}/>
}
