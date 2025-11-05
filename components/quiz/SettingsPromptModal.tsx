'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Settings, Play, ArrowRight } from 'lucide-react'

interface SettingsPromptModalProps {
  isOpen: boolean
  onClose: () => void
  onConfigureSettings: () => void
  onSkipToQuiz: () => void
}

export default function SettingsPromptModal({ 
  isOpen, 
  onClose, 
  onConfigureSettings, 
  onSkipToQuiz 
}: SettingsPromptModalProps) {
  const handleSkipClick = () => {
    console.log('✅ Button clicked: Skip to quiz')
    console.log('📞 Calling onSkipToQuiz...')
    onSkipToQuiz()
    console.log('📞 onSkipToQuiz call completed')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            セルフパーソナライズクイズ設定
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
              <Settings className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-gray-700" id="settings-prompt-description">
              あなた専用のクイズ体験をカスタマイズしませんか？
            </p>
            <p className="text-sm text-gray-500">
              学習レベルや興味のあるカテゴリーを設定することで、より効果的な学習ができます。
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={onConfigureSettings}
              className="w-full"
              size="lg"
            >
              <Settings className="h-4 w-4 mr-2" />
              設定をカスタマイズする
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleSkipClick}
              className="w-full"
              size="lg"
            >
              <Play className="h-4 w-4 mr-2" />
              デフォルト設定でクイズ開始
            </Button>
          </div>

          <div className="text-xs text-center text-gray-500">
            設定はプロフィール画面でいつでも変更できます
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}