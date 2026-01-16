'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Edit, Save, X, FileText, Clock } from 'lucide-react'

interface Content {
  id: string
  session_id: string
  content_type: string
  title: string | null
  content: string
  duration: number | null
  display_order: number
}

interface ContentEditModalProps {
  content: Content | null
  isOpen: boolean
  onClose: () => void
  onSave: (contentId: string, data: Partial<Content>) => Promise<void>
  onDelete?: (contentId: string) => Promise<void>
}

// Phase1準拠のコンテンツタイプ制限
const contentTypeOptions = [
  { value: 'text', label: 'テキスト', description: 'プレーンテキスト形式（基本）', phase: 1 },
  { value: 'example', label: '事例・例題', description: '具体的な事例や例題', phase: 1 },
  { value: 'key_points', label: '重要ポイント', description: 'まとめ・要点整理', phase: 1 },
  // Phase2機能（グレーアウト表示）
  { value: 'markdown', label: 'マークダウン', description: 'Markdown記法対応（Phase2予定）', phase: 2, disabled: true },
  { value: 'video', label: '動画', description: '動画コンテンツ（Phase2予定）', phase: 2, disabled: true },
  { value: 'audio', label: '音声', description: '音声ファイル（Phase2予定）', phase: 2, disabled: true },
  { value: 'image', label: '画像', description: '画像ファイル（Phase2予定）', phase: 2, disabled: true },
  { value: 'interactive', label: 'インタラクティブ', description: 'インタラクティブコンテンツ（Phase3予定）', phase: 3, disabled: true }
]

export function ContentEditModal({ 
  content, 
  isOpen, 
  onClose, 
  onSave,
  onDelete 
}: ContentEditModalProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    content_type: 'text',
    title: '',
    content: '',
    duration: null as number | null,
    display_order: 1
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (content) {
      setFormData({
        content_type: content.content_type,
        title: content.title || '',
        content: content.content,
        duration: content.duration,
        display_order: content.display_order
      })
    } else {
      // 新規作成時のデフォルト値
      setFormData({
        content_type: 'text',
        title: '',
        content: '',
        duration: null,
        display_order: 1
      })
    }
  }, [content])

  const handleSave = async () => {
    if (!content) return

    // バリデーション
    if (!formData.content.trim()) {
      toast({
        title: "入力エラー",
        description: "コンテンツの内容を入力してください",
        variant: "destructive"
      })
      return
    }

    setSaving(true)
    try {
      await onSave(content.id, {
        content_type: formData.content_type,
        title: formData.title || null,
        content: formData.content,
        duration: formData.duration,
        display_order: formData.display_order
      })
      
      toast({
        title: "保存完了",
        description: "コンテンツが正常に保存されました"
      })
      
      onClose()
    } catch (error) {
      console.error('Content save error:', error)
      toast({
        title: "保存エラー",
        description: "コンテンツの保存に失敗しました",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!content || !onDelete) return

    const confirmResult = window.confirm('このコンテンツを削除してもよろしいですか？この操作は取り消せません。')
    if (!confirmResult) return

    setDeleting(true)
    try {
      await onDelete(content.id)
      onClose()
    } catch (error) {
      console.error('Content delete error:', error)
    } finally {
      setDeleting(false)
    }
  }

  const selectedContentType = contentTypeOptions.find(opt => opt.value === formData.content_type)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Edit className="h-5 w-5 mr-2" />
            {content ? 'コンテンツ編集' : 'コンテンツ作成'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 基本情報 */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">コンテンツタイプ</label>
              <Select 
                value={formData.content_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, content_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contentTypeOptions.map(option => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      disabled={option.disabled}
                    >
                      <div className={option.disabled ? "opacity-50" : ""}>
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{option.label}</div>
                          {option.phase && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              option.phase === 1 
                                ? 'bg-green-100 text-green-700' 
                                : option.phase === 2 
                                  ? 'bg-orange-100 text-orange-700' 
                                  : 'bg-purple-100 text-purple-700'
                            }`}>
                              Phase{option.phase}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedContentType && (
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedContentType.description}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                タイトル
                <span className="text-xs text-muted-foreground ml-1">(オプション)</span>
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="コンテンツのタイトルを入力..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  予想時間（分）
                  <span className="text-xs text-muted-foreground ml-1">(オプション)</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  max="180"
                  value={formData.duration || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    duration: e.target.value ? parseInt(e.target.value) : null 
                  }))}
                  placeholder="時間を入力..."
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">表示順序</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.display_order}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    display_order: parseInt(e.target.value) || 1 
                  }))}
                />
              </div>
            </div>
          </div>

          {/* コンテンツ本文 */}
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center">
              <FileText className="h-4 w-4 mr-1" />
              コンテンツ本文
            </label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="コンテンツの内容を入力..."
              rows={12}
              className="font-mono text-sm"
            />
            {formData.content_type === 'markdown' && (
              <p className="text-xs text-muted-foreground mt-1">
                Markdown記法が使用できます。**太字**、*斜体*、`コード`、[リンク](URL)など
              </p>
            )}
            {formData.content_type === 'video' && (
              <p className="text-xs text-muted-foreground mt-1">
                動画URLまたは埋め込みコードを入力してください
              </p>
            )}
            {formData.content_type === 'audio' && (
              <p className="text-xs text-muted-foreground mt-1">
                音声ファイルURLまたは埋め込みコードを入力してください
              </p>
            )}
            {formData.content_type === 'image' && (
              <p className="text-xs text-muted-foreground mt-1">
                画像URLまたはbase64エンコードされた画像データを入力してください
              </p>
            )}
          </div>

          {/* プレビュー */}
          {formData.content && formData.content_type === 'markdown' && (
            <div className="border-t pt-4">
              <label className="text-sm font-medium mb-2 block">プレビュー</label>
              <div className="p-3 border rounded-lg bg-gray-50 text-sm">
                {/* 簡易マークダウンプレビュー */}
                <div className="prose prose-sm max-w-none">
                  {formData.content.split('\n').map((line, index) => (
                    <p key={index} className="mb-2 last:mb-0">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex justify-between w-full">
            <div>
              {content && onDelete && (
                <Button 
                  variant="destructive" 
                  onClick={handleDelete}
                  disabled={deleting}
                  size="sm"
                >
                  {deleting ? '削除中...' : '削除'}
                </Button>
              )}
            </div>
            <div className="space-x-2">
              <Button variant="outline" onClick={onClose}>
                <X className="h-4 w-4 mr-2" />
                キャンセル
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}