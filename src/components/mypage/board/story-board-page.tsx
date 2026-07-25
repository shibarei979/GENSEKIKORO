'use client'
import StoryBoard from '@/components/story-board'

export default function StoryBoardPage({ userId }: { userId: string }) {
  return <StoryBoard userId={userId} isModal={false}/>
}
