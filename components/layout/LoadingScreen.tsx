'use client'

interface LoadingScreenProps {
  message?: string
}

export default function LoadingScreen({ 
  message = "AIが学習データを分析中..." 
}: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}