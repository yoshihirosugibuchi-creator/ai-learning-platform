'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Plus, Pencil, Trash2, Save, X, Loader2 } from 'lucide-react'

// 認証ヘッダー取得
async function getAuthHeaders(): Promise<HeadersInit> {
  if (typeof window !== 'undefined') {
    const { supabase } = await import('@/lib/supabase')
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` }
    }
  }
  return {}
}

// ========== 型定義 ==========

interface OptionItem {
  id: string
  option_type: string
  code: string
  name: string
  name_en?: string
  description?: string
  display_order: number
  is_active: boolean
  target_skills?: string[]
  is_extended?: boolean
}

interface RubricAxis {
  id: string
  axis_code: string
  axis_name: string
  rubric_group_code: string
  rubric_group_name: string
  definition: string
  evaluation_points?: string[]
  score_anchors: Record<string, string>
  display_order: number
  is_active: boolean
}

const OPTION_TYPE_LABELS: Record<string, string> = {
  job_role: '職種',
  business_phase: 'フェーズ',
  scenario_type: 'シナリオタイプ',
  info_clarity: '情報明確さ',
}

const RUBRIC_GROUPS = [
  { code: 'A', name: '思考基盤' },
  { code: 'B', name: '価値創造' },
  { code: 'C', name: '分析・検証' },
  { code: 'D', name: '実務適用' },
  { code: 'E', name: 'コミュニケーション' },
  { code: 'F', name: '技術実務' },
  { code: 'G', name: 'ビジネススキル' },
  { code: 'H', name: 'AI活用スキル' },
]

// ========== オプションマスタタブ ==========

function OptionsTab() {
  const { toast } = useToast()
  const [options, setOptions] = useState<OptionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedType, setSelectedType] = useState<string>('job_role')
  const [editItem, setEditItem] = useState<OptionItem | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isNewItem, setIsNewItem] = useState(false)

  const fetchOptions = useCallback(async () => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/admin/case-study/options?active_only=false`, { headers })
      const data = await res.json()
      if (data.success) {
        setOptions(data.options || [])
      }
    } catch (error) {
      console.error('Fetch error:', error)
      toast({ title: 'オプションの取得に失敗しました', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchOptions()
  }, [fetchOptions])

  const filteredOptions = options.filter(o => o.option_type === selectedType)

  const handleNew = () => {
    setEditItem({
      id: '',
      option_type: selectedType,
      code: '',
      name: '',
      name_en: '',
      description: '',
      display_order: filteredOptions.length + 1,
      is_active: true,
      target_skills: [],
      is_extended: false,
    })
    setIsNewItem(true)
    setIsDialogOpen(true)
  }

  const handleEdit = (item: OptionItem) => {
    setEditItem({ ...item })
    setIsNewItem(false)
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!editItem) return
    if (!editItem.code || !editItem.name) {
      toast({ title: 'コードと名前は必須です', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const headers = await getAuthHeaders()
      const url = isNewItem
        ? '/api/admin/case-study/options'
        : `/api/admin/case-study/options/${editItem.id}`
      const method = isNewItem ? 'POST' : 'PUT'

      const res = await fetch(url, {
        method,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(editItem),
      })

      const data = await res.json()
      if (data.success) {
        toast({ title: isNewItem ? '作成しました' : '更新しました' })
        setIsDialogOpen(false)
        fetchOptions()
      } else {
        toast({ title: data.error || '保存に失敗しました', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Save error:', error)
      toast({ title: '保存に失敗しました', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item: OptionItem) => {
    if (!confirm(`「${item.name}」を削除しますか？`)) return

    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/admin/case-study/options/${item.id}`, {
        method: 'DELETE',
        headers,
      })

      const data = await res.json()
      if (data.success) {
        toast({ title: '削除しました' })
        fetchOptions()
      } else {
        toast({ title: data.error || '削除に失敗しました', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast({ title: '削除に失敗しました', variant: 'destructive' })
    }
  }

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(OPTION_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" />
          新規追加
        </Button>
      </div>

      <div className="border rounded-lg">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="p-3 text-left text-sm font-medium">コード</th>
              <th className="p-3 text-left text-sm font-medium">名前</th>
              <th className="p-3 text-left text-sm font-medium">英語名</th>
              <th className="p-3 text-center text-sm font-medium">順序</th>
              <th className="p-3 text-center text-sm font-medium">状態</th>
              <th className="p-3 text-center text-sm font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredOptions.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-muted-foreground">
                  データがありません
                </td>
              </tr>
            ) : (
              filteredOptions.map(item => (
                <tr key={item.id} className="border-t">
                  <td className="p-3 font-mono text-sm">{item.code}</td>
                  <td className="p-3">{item.name}</td>
                  <td className="p-3 text-muted-foreground">{item.name_en || '-'}</td>
                  <td className="p-3 text-center">{item.display_order}</td>
                  <td className="p-3 text-center">
                    <Badge variant={item.is_active ? 'default' : 'secondary'}>
                      {item.is_active ? '有効' : '無効'}
                    </Badge>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(item)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isNewItem ? '新規作成' : '編集'}</DialogTitle>
            <DialogDescription>
              {OPTION_TYPE_LABELS[selectedType]}マスタ
            </DialogDescription>
          </DialogHeader>

          {editItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>コード *</Label>
                  <Input
                    value={editItem.code}
                    onChange={e => setEditItem({ ...editItem, code: e.target.value })}
                    disabled={!isNewItem}
                  />
                </div>
                <div>
                  <Label>表示順</Label>
                  <Input
                    type="number"
                    value={editItem.display_order}
                    onChange={e => setEditItem({ ...editItem, display_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <Label>名前 *</Label>
                <Input
                  value={editItem.name}
                  onChange={e => setEditItem({ ...editItem, name: e.target.value })}
                />
              </div>

              <div>
                <Label>英語名</Label>
                <Input
                  value={editItem.name_en || ''}
                  onChange={e => setEditItem({ ...editItem, name_en: e.target.value })}
                />
              </div>

              <div>
                <Label>説明</Label>
                <Textarea
                  value={editItem.description || ''}
                  onChange={e => setEditItem({ ...editItem, description: e.target.value })}
                  rows={3}
                />
              </div>


              <div className="flex items-center space-x-2">
                <Switch
                  checked={editItem.is_active}
                  onCheckedChange={checked => setEditItem({ ...editItem, is_active: checked })}
                />
                <Label>有効</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ========== ルーブリック軸タブ ==========

function RubricAxesTab() {
  const { toast } = useToast()
  const [axes, setAxes] = useState<RubricAxis[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editItem, setEditItem] = useState<RubricAxis | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isNewItem, setIsNewItem] = useState(false)

  const fetchAxes = useCallback(async () => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/case-study/rubric-axes?include_inactive=true', { headers })
      const data = await res.json()
      if (data.success) {
        setAxes(data.axes || [])
      }
    } catch (error) {
      console.error('Fetch error:', error)
      toast({ title: 'ルーブリック軸の取得に失敗しました', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchAxes()
  }, [fetchAxes])

  const handleNew = () => {
    setEditItem({
      id: '',
      axis_code: '',
      axis_name: '',
      rubric_group_code: 'A',
      rubric_group_name: '思考基盤',
      definition: '',
      evaluation_points: [],
      score_anchors: {
        '1': '',
        '2': '',
        '3': '',
        '4': '',
        '5': '',
      },
      display_order: axes.length + 1,
      is_active: true,
    })
    setIsNewItem(true)
    setIsDialogOpen(true)
  }

  const handleEdit = (item: RubricAxis) => {
    setEditItem({ ...item })
    setIsNewItem(false)
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!editItem) return
    if (!editItem.axis_code || !editItem.axis_name || !editItem.definition) {
      toast({ title: 'コード、名前、定義は必須です', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const headers = await getAuthHeaders()
      const url = isNewItem
        ? '/api/admin/case-study/rubric-axes'
        : `/api/admin/case-study/rubric-axes/${editItem.id}`
      const method = isNewItem ? 'POST' : 'PUT'

      const res = await fetch(url, {
        method,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(editItem),
      })

      const data = await res.json()
      if (data.success) {
        toast({ title: isNewItem ? '作成しました' : '更新しました' })
        setIsDialogOpen(false)
        fetchAxes()
      } else {
        toast({ title: data.error || '保存に失敗しました', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Save error:', error)
      toast({ title: '保存に失敗しました', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item: RubricAxis) => {
    if (!confirm(`「${item.axis_name}」を削除しますか？`)) return

    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/admin/case-study/rubric-axes/${item.id}`, {
        method: 'DELETE',
        headers,
      })

      const data = await res.json()
      if (data.success) {
        toast({ title: '削除しました' })
        fetchAxes()
      } else {
        toast({ title: data.error || '削除に失敗しました', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast({ title: '削除に失敗しました', variant: 'destructive' })
    }
  }

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  // グループ別に整理
  const groupedAxes = RUBRIC_GROUPS.map(group => ({
    ...group,
    axes: axes.filter(a => a.rubric_group_code === group.code),
  }))

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" />
          新規追加
        </Button>
      </div>

      <div className="space-y-6">
        {groupedAxes.map(group => (
          <Card key={group.code}>
            <CardHeader className="py-3">
              <CardTitle className="text-base">
                グループ{group.code}: {group.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {group.axes.length === 0 ? (
                <p className="text-muted-foreground text-sm">軸がありません</p>
              ) : (
                <div className="space-y-2">
                  {group.axes.map(axis => (
                    <div
                      key={axis.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-muted px-1 rounded">{axis.axis_code}</code>
                          <span className="font-medium">{axis.axis_name}</span>
                          {!axis.is_active && (
                            <Badge variant="secondary">無効</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{axis.definition}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(axis)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(axis)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNewItem ? '新規作成' : '編集'}</DialogTitle>
            <DialogDescription>ルーブリック評価軸</DialogDescription>
          </DialogHeader>

          {editItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>軸コード *</Label>
                  <Input
                    value={editItem.axis_code}
                    onChange={e => setEditItem({ ...editItem, axis_code: e.target.value })}
                    placeholder="problem_setting"
                    disabled={!isNewItem}
                  />
                </div>
                <div>
                  <Label>軸名 *</Label>
                  <Input
                    value={editItem.axis_name}
                    onChange={e => setEditItem({ ...editItem, axis_name: e.target.value })}
                    placeholder="問題設定力"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>グループ *</Label>
                  <Select
                    value={editItem.rubric_group_code}
                    onValueChange={value => {
                      const group = RUBRIC_GROUPS.find(g => g.code === value)
                      setEditItem({
                        ...editItem,
                        rubric_group_code: value,
                        rubric_group_name: group?.name || '',
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RUBRIC_GROUPS.map(g => (
                        <SelectItem key={g.code} value={g.code}>
                          {g.code}: {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>表示順</Label>
                  <Input
                    type="number"
                    value={editItem.display_order}
                    onChange={e => setEditItem({ ...editItem, display_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <Label>定義 *</Label>
                <Textarea
                  value={editItem.definition}
                  onChange={e => setEditItem({ ...editItem, definition: e.target.value })}
                  rows={2}
                  placeholder="事象や課題の本質を見抜き、解くべき問いを適切に設定する力"
                />
              </div>

              <div>
                <Label>評価ポイント（改行区切り）</Label>
                <Textarea
                  value={(editItem.evaluation_points || []).join('\n')}
                  onChange={e => setEditItem({
                    ...editItem,
                    evaluation_points: e.target.value.split('\n').filter(Boolean)
                  })}
                  rows={3}
                  placeholder="表層的な現象と本質的な課題の区別&#10;因果関係の正確な把握&#10;優先順位の妥当性"
                />
              </div>

              <div>
                <Label>スコアアンカー（1-5点）</Label>
                <div className="space-y-2 mt-2">
                  {[1, 2, 3, 4, 5].map(score => (
                    <div key={score} className="flex items-center gap-2">
                      <Badge variant="outline" className="w-8 justify-center">{score}</Badge>
                      <Input
                        value={editItem.score_anchors?.[String(score)] || ''}
                        onChange={e => setEditItem({
                          ...editItem,
                          score_anchors: {
                            ...editItem.score_anchors,
                            [String(score)]: e.target.value,
                          }
                        })}
                        placeholder={`${score}点の基準...`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={editItem.is_active}
                  onCheckedChange={checked => setEditItem({ ...editItem, is_active: checked })}
                />
                <Label>有効</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ========== メインページ ==========

export default function CaseStudyMastersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">マスタメンテナンス</h1>
        <p className="text-muted-foreground">ケーススタディ用マスタデータの管理</p>
      </div>

      <Tabs defaultValue="options" className="space-y-4">
        <TabsList>
          <TabsTrigger value="options">オプションマスタ</TabsTrigger>
          <TabsTrigger value="rubric">ルーブリック軸</TabsTrigger>
        </TabsList>

        <TabsContent value="options">
          <Card>
            <CardHeader>
              <CardTitle>オプションマスタ</CardTitle>
              <CardDescription>
                職種、フェーズ、シナリオタイプ、情報明確さレベル、ステップフレームワーク
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OptionsTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rubric">
          <Card>
            <CardHeader>
              <CardTitle>ルーブリック評価軸</CardTitle>
              <CardDescription>
                ルーブリック評価システムの軸定義とスコアアンカー
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RubricAxesTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
