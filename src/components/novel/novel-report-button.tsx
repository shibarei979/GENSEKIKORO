'use client'

import { useState } from 'react'
import ReportModal from '@/components/report-modal'

interface Props {
  novelId: string
  novelTitle: string
  userId: string
}

export default function NovelReportButton({ novelId, novelTitle, userId }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={()=>setOpen(true)}
        style={{fontSize:11,color:'var(--color-text-faint)',background:'none',border:'1px solid var(--color-brand-border)',borderRadius:10,padding:'3px 10px',cursor:'pointer'}}>
        通報する
      </button>
      {open && (
        <ReportModal
          targetType="novel" targetId={novelId} targetName={novelTitle}
          userId={userId} onClose={()=>setOpen(false)}
        />
      )}
    </>
  )
}
