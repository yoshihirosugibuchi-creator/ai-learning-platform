'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Check, BookOpen, Package, Briefcase, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

interface ContentItem {
  id: string
  name: string
  description?: string
}

interface Selection {
  content_id: string
  content_name: string | null
  selected_by: string
}

interface Selections {
  course: Selection | null
  quiz_pack: Selection | null
  case_study: Selection | null
}

interface ChallengeSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSave?: () => void
  currentSelections?: Selections
}

type SlotType = 'course' | 'quiz_pack' | 'case_study'

const slotConfig: Record<SlotType, {
  label: string
  icon: React.ReactNode
  iconBg: string
  selectedBg: string
  selectedText: string
  checkColor: string
  badgeBg: string
}> = {
  course: {
    label: 'コース',
    icon: <BookOpen className="h-4 w-4 text-emerald-600" />,
    iconBg: 'bg-emerald-100',
    selectedBg: 'bg-emerald-100',
    selectedText: 'text-emerald-900',
    checkColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-50 text-emerald-600'
  },
  quiz_pack: {
    label: 'クイズパック',
    icon: <Package className="h-4 w-4 text-sky-600" />,
    iconBg: 'bg-sky-100',
    selectedBg: 'bg-sky-100',
    selectedText: 'text-sky-900',
    checkColor: 'text-sky-600',
    badgeBg: 'bg-sky-50 text-sky-600'
  },
  case_study: {
    label: 'ケーススタディ',
    icon: <Briefcase className="h-4 w-4 text-violet-600" />,
    iconBg: 'bg-violet-100',
    selectedBg: 'bg-violet-100',
    selectedText: 'text-violet-900',
    checkColor: 'text-violet-600',
    badgeBg: 'bg-violet-50 text-violet-600'
  }
}

export default function ChallengeSettingsModal({
  isOpen,
  onClose,
  onSave,
  currentSelections
}: ChallengeSettingsModalProps) {
  const { toast } = useToast()
  const [selections, setSelections] = useState<Record<SlotType, ContentItem | null>>({
    course: null,
    quiz_pack: null,
    case_study: null
  })
  const [searchQueries, setSearchQueries] = useState<Record<SlotType, string>>({
    course: '',
    quiz_pack: '',
    case_study: ''
  })
  const [searchResults, setSearchResults] = useState<Record<SlotType, ContentItem[]>>({
    course: [],
    quiz_pack: [],
    case_study: []
  })
  const [loading, setLoading] = useState<Record<SlotType, boolean>>({
    course: false,
    quiz_pack: false,
    case_study: false
  })
  const [saving, setSaving] = useState(false)

  // 現在の選択を初期化
  useEffect(() => {
    if (currentSelections) {
      setSelections({
        course: currentSelections.course ? {
          id: currentSelections.course.content_id,
          name: currentSelections.course.content_name || ''
        } : null,
        quiz_pack: currentSelections.quiz_pack ? {
          id: currentSelections.quiz_pack.content_id,
          name: currentSelections.quiz_pack.content_name || ''
        } : null,
        case_study: currentSelections.case_study ? {
          id: currentSelections.case_study.content_id,
          name: currentSelections.case_study.content_name || ''
        } : null
      })
    }
  }, [currentSelections, isOpen])

  // 検索実行
  const performSearch = useCallback(async (type: SlotType, query: string) => {
    setLoading(prev => ({ ...prev, [type]: true }))

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      if (!token) return

      const response = await fetch(
        `/api/challenge-selections/search?type=${type}&q=${encodeURIComponent(query)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.ok) {
        const data = await response.json()
        setSearchResults(prev => ({ ...prev, [type]: data.items || [] }))
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }))
    }
  }, [])

  // 初期読み込み（全タイプ）
  useEffect(() => {
    if (isOpen) {
      (['course', 'quiz_pack', 'case_study'] as SlotType[]).forEach(type => {
        performSearch(type, '')
      })
    }
  }, [isOpen, performSearch])

  // 検索クエリ変更時
  useEffect(() => {
    const timeouts: Record<string, NodeJS.Timeout> = {}

    Object.entries(searchQueries).forEach(([type, query]) => {
      timeouts[type] = setTimeout(() => {
        performSearch(type as SlotType, query)
      }, 300)
    })

    return () => {
      Object.values(timeouts).forEach(t => clearTimeout(t))
    }
  }, [searchQueries, performSearch])

  // 選択
  const handleSelect = (type: SlotType, item: ContentItem) => {
    setSelections(prev => ({ ...prev, [type]: item }))
  }

  // 保存
  const handleSave = async () => {
    setSaving(true)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      if (!token) {
        toast({ title: '認証エラー', variant: 'destructive' })
        return
      }

      // 各スロットを保存
      for (const [type, selection] of Object.entries(selections)) {
        if (selection) {
          const response = await fetch('/api/challenge-selections', {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              slot_type: type,
              content_id: selection.id,
              content_name: selection.name
            })
          })

          if (!response.ok) {
            throw new Error(`Failed to save ${type}`)
          }
        }
      }

      toast({ title: '設定を保存しました' })
      onSave?.()
      onClose()
    } catch (error) {
      console.error('Save error:', error)
      toast({ title: '保存に失敗しました', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const renderSlotSection = (type: SlotType) => {
    const config = slotConfig[type]
    const query = searchQueries[type]
    const results = searchResults[type]
    const selected = selections[type]
    const isLoading = loading[type]

    return (
      <div key={type} className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <span className={`p-1 rounded ${config.iconBg}`}>
            {config.icon}
          </span>
          {config.label}
        </Label>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="検索..."
            value={query}
            onChange={(e) => setSearchQueries(prev => ({ ...prev, [type]: e.target.value }))}
            className="pl-9 text-sm"
          />
        </div>

        <ScrollArea className="h-28 border rounded-md">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
              該当なし
            </div>
          ) : (
            <div className="p-1">
              {results.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(type, item)}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors ${
                    selected?.id === item.id
                      ? `${config.selectedBg} ${config.selectedText}`
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {selected?.id === item.id && (
                      <Check className={`h-3 w-3 ${config.checkColor} shrink-0`} />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate text-xs">{item.name}</div>
                      {item.description && (
                        <div className="text-[10px] text-muted-foreground truncate">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {selected && (
          <div className={`text-xs px-2 py-1 rounded truncate ${config.badgeBg}`}>
            選択中: {selected.name}
          </div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex flex-col max-h-[80vh] p-0">
        <DialogHeader className="px-4 pt-4 pb-2 shrink-0">
          <DialogTitle className="text-base">選ばれし課題の設定</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 space-y-4">
          {renderSlotSection('course')}
          {renderSlotSection('quiz_pack')}
          {renderSlotSection('case_study')}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t shrink-0">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            キャンセル
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              '保存'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
