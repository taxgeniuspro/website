'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Download } from 'lucide-react'
import AccountWrapper from '@/components/account/account-wrapper'

export default function DownloadsPage() {
  return (
    <AccountWrapper>
      <div className="max-w-4xl">
        <h1 className="text-3xl font-bold mb-2">Downloads</h1>
        <p className="text-muted-foreground mb-8">Access your digital files and design assets</p>

        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Download className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="mb-4">No downloads available</p>
              <p className="text-sm">Digital downloads will appear here after purchase</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AccountWrapper>
  )
}
