'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Fingerprint } from 'lucide-react'

type BiometricEnableDialogProps = {
  open: boolean
  biometryLabel: string
  onEnable: () => void
  onSkip: () => void
}

export default function BiometricEnableDialog({
  open,
  biometryLabel,
  onEnable,
  onSkip,
}: BiometricEnableDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onSkip() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <div className="rounded-full bg-indigo-100 p-3">
              <Fingerprint className="h-8 w-8 text-indigo-600" />
            </div>
          </div>
          <DialogTitle className="text-center">
            {biometryLabel}を有効にしますか？
          </DialogTitle>
          <DialogDescription className="text-center">
            次回から{biometryLabel}で素早くログインできます。
            いつでも設定から変更できます。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          <Button onClick={onEnable} className="w-full">
            {biometryLabel}を有効にする
          </Button>
          <Button variant="ghost" onClick={onSkip} className="w-full">
            あとで
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
