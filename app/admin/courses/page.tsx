'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  BookOpen, 
  Eye, 
  Edit,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

interface Course {
  id: string
  title: string
  description: string
  difficulty: 'basic' | 'intermediate' | 'advanced' | 'expert'
  status: 'draft' | 'coming_soon' | 'available' | 'archived'
  icon: string
  color: string
  display_order: number
  estimated_days: number
  created_at: string
  updated_at: string
}

const statusConfig = {
  draft: { label: '下書き', color: 'bg-gray-100 text-gray-800', bgColor: 'bg-gray-50' },
  coming_soon: { label: '準備中', color: 'bg-yellow-100 text-yellow-800', bgColor: 'bg-yellow-50' },
  available: { label: '公開中', color: 'bg-green-100 text-green-800', bgColor: 'bg-green-50' },
  archived: { label: 'アーカイブ', color: 'bg-red-100 text-red-800', bgColor: 'bg-red-50' }
}

// スキルレベル設定（動的取得とフォールバック）
const defaultDifficultyConfig = {
  basic: { label: '基礎', color: 'bg-blue-100 text-blue-800' },
  intermediate: { label: '中級', color: 'bg-purple-100 text-purple-800' },
  advanced: { label: '上級', color: 'bg-orange-100 text-orange-800' },
  expert: { label: 'エキスパート', color: 'bg-red-100 text-red-800' }
}

const difficultyColors = ['bg-blue-100 text-blue-800', 'bg-purple-100 text-purple-800', 'bg-orange-100 text-orange-800', 'bg-red-100 text-red-800', 'bg-green-100 text-green-800']

export default function CoursesManagementPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')
  const [skillLevels, setSkillLevels] = useState<Array<{id: string, name: string, displayOrder: number}>>([])
  const [difficultyConfig, setDifficultyConfig] = useState<Record<string, {label: string, color: string}>>(defaultDifficultyConfig)
  
  // ソート機能
  const [sortField, setSortField] = useState<string>('display_order')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  const { toast } = useToast()

  // スキルレベル取得
  const fetchSkillLevels = async () => {
    try {
      const { getSkillLevels } = await import('@/lib/categories')
      const levels = await getSkillLevels()
      setSkillLevels(levels)
      
      // 動的にdifficultyConfigを生成
      const dynamicConfig: Record<string, {label: string, color: string}> = {}
      levels.forEach((level, index) => {
        dynamicConfig[level.id] = {
          label: level.name,
          color: difficultyColors[index % difficultyColors.length]
        }
      })
      setDifficultyConfig(dynamicConfig)
    } catch (error) {
      console.error('Error loading skill levels:', error)
      // フォールバック: デフォルト設定を使用
      setSkillLevels([
        { id: 'basic', name: '基礎', displayOrder: 1 },
        { id: 'intermediate', name: '中級', displayOrder: 2 },
        { id: 'advanced', name: '上級', displayOrder: 3 },
        { id: 'expert', name: 'エキスパート', displayOrder: 4 }
      ])
    }
  }

  // データ取得
  const fetchCourses = async () => {
    setLoading(true)
    try {
      // 🔐 CLAUDE.md準拠：クライアントサイドでsupabaseを使用して認証ヘッダー取得
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('認証が必要です')
      }

      const response = await fetch('/api/admin/courses', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setCourses(data.courses)
        // 初期ソートを適用（display_order昇順）
        const sortedCourses = [...data.courses].sort((a, b) => Number(a.display_order) - Number(b.display_order))
        setFilteredCourses(sortedCourses)
      } else {
        throw new Error('コースデータの取得に失敗しました')
      }
    } catch (error) {
      console.error('Fetch courses error:', error)
      toast({
        title: "エラー",
        description: "コースデータの取得に失敗しました",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // ステータス変更
  const changeStatus = async (courseId: string, newStatus: string) => {
    try {
      // 🔐 CLAUDE.md準拠：認証ヘッダー追加
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('認証が必要です')
      }

      const response = await fetch(`/api/admin/courses/${courseId}/status`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        toast({
          title: "ステータス更新",
          description: "コースステータスが更新されました"
        })
        await fetchCourses() // データを再取得
      } else {
        throw new Error('ステータス更新に失敗しました')
      }
    } catch (error) {
      console.error('Status change error:', error)
      toast({
        title: "エラー", 
        description: "ステータス更新に失敗しました",
        variant: "destructive"
      })
    }
  }

  // 表示順変更
  const changeDisplayOrder = async (courseId: string, newDisplayOrder: number) => {
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('認証が必要です')
      }

      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ display_order: newDisplayOrder })
      })

      if (response.ok) {
        toast({
          title: "表示順更新",
          description: "コースの表示順が更新されました"
        })
        await fetchCourses() // データを再取得
      } else {
        throw new Error('表示順更新に失敗しました')
      }
    } catch (error) {
      console.error('Display order change error:', error)
      toast({
        title: "エラー", 
        description: "表示順更新に失敗しました",
        variant: "destructive"
      })
    }
  }

  // ソート機能
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // フィルタリング&ソート
  useEffect(() => {
    let filtered = courses

    // 検索フィルター
    if (searchTerm) {
      filtered = filtered.filter(course => 
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // ステータスフィルター
    if (statusFilter !== 'all') {
      filtered = filtered.filter(course => course.status === statusFilter)
    }

    // 難易度フィルター
    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(course => course.difficulty === difficultyFilter)
    }

    // ソート処理
    filtered.sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortField) {
        case 'display_order':
          aValue = Number(a.display_order)
          bValue = Number(b.display_order)
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'difficulty':
          // 難易度は順序があるため、skill levelsの順序で比較
          const difficultyOrder = { basic: 1, intermediate: 2, advanced: 3, expert: 4 }
          aValue = difficultyOrder[a.difficulty as keyof typeof difficultyOrder] || 999
          bValue = difficultyOrder[b.difficulty as keyof typeof difficultyOrder] || 999
          break
        case 'updated_at':
          aValue = new Date(a.updated_at).getTime()
          bValue = new Date(b.updated_at).getTime()
          break
        case 'title':
          aValue = a.title
          bValue = b.title
          break
        default:
          aValue = Number(a.display_order)
          bValue = Number(b.display_order)
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
      }
    })

    setFilteredCourses(filtered)
  }, [courses, searchTerm, statusFilter, difficultyFilter, sortField, sortDirection])

  // 初期データ取得
  useEffect(() => {
    fetchSkillLevels()
    fetchCourses()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-6">
      
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-2" />
              管理者パネル
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <BookOpen className="h-6 w-6 mr-2 text-blue-600" />
              コース学習管理
            </h1>
            <p className="text-muted-foreground">学習コースの管理・公開状態の変更</p>
          </div>
        </div>
        
        <Button onClick={fetchCourses} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          更新
        </Button>
      </div>

      {/* フィルターセクション */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            フィルター・検索
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* 検索 */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="コース名・説明で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* ステータスフィルター */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="ステータスで絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのステータス</SelectItem>
                <SelectItem value="draft">下書き</SelectItem>
                <SelectItem value="coming_soon">準備中</SelectItem>
                <SelectItem value="available">公開中</SelectItem>
                <SelectItem value="archived">アーカイブ</SelectItem>
              </SelectContent>
            </Select>

            {/* 難易度フィルター */}
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="難易度で絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべての難易度</SelectItem>
                {skillLevels.map((level) => (
                  <SelectItem key={level.id} value={level.id}>
                    {level.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* コース学習一覧テーブル */}
      <Card>
        <CardHeader>
          <CardTitle>コース学習一覧 ({filteredCourses.length}件)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              読み込み中...
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              条件に一致するコースがありません
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">アイコン</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('title')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>コース名</span>
                        {sortField === 'title' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                        {sortField !== 'title' && <ArrowUpDown className="h-4 w-4 text-gray-400" />}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>ステータス</span>
                        {sortField === 'status' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                        {sortField !== 'status' && <ArrowUpDown className="h-4 w-4 text-gray-400" />}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="w-20 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('display_order')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>表示順</span>
                        {sortField === 'display_order' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                        {sortField !== 'display_order' && <ArrowUpDown className="h-4 w-4 text-gray-400" />}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('difficulty')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>難易度</span>
                        {sortField === 'difficulty' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                        {sortField !== 'difficulty' && <ArrowUpDown className="h-4 w-4 text-gray-400" />}
                      </div>
                    </TableHead>
                    <TableHead className="w-24">予想日数</TableHead>
                    <TableHead 
                      className="w-32 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('updated_at')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>更新日</span>
                        {sortField === 'updated_at' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        )}
                        {sortField !== 'updated_at' && <ArrowUpDown className="h-4 w-4 text-gray-400" />}
                      </div>
                    </TableHead>
                    <TableHead className="w-64">アクション</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCourses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell>
                        <div className="text-2xl">{course.icon}</div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{course.title}</div>
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {course.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[course.status].color}>
                          {statusConfig[course.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm text-center">
                          {course.display_order}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={difficultyConfig[course.difficulty].color}>
                          {difficultyConfig[course.difficulty].label}
                        </Badge>
                      </TableCell>
                      <TableCell>{course.estimated_days}日</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(course.updated_at).toLocaleDateString('ja-JP')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col space-y-2">
                          {/* 上段: ステータス・表示順変更 */}
                          <div className="flex items-center space-x-2">
                            <Select 
                              value={course.status} 
                              onValueChange={(newStatus) => changeStatus(course.id, newStatus)}
                            >
                              <SelectTrigger className="w-24 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="draft">下書き</SelectItem>
                                <SelectItem value="coming_soon">準備中</SelectItem>
                                <SelectItem value="available">公開中</SelectItem>
                                <SelectItem value="archived">アーカイブ</SelectItem>
                              </SelectContent>
                            </Select>

                            <Input
                              type="number"
                              defaultValue={course.display_order}
                              onBlur={(e) => {
                                const newValue = parseInt(e.target.value)
                                if (newValue && newValue !== course.display_order) {
                                  changeDisplayOrder(course.id, newValue)
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const newValue = parseInt(e.currentTarget.value)
                                  if (newValue && newValue !== course.display_order) {
                                    changeDisplayOrder(course.id, newValue)
                                  }
                                }
                              }}
                              className="w-16 h-8 text-xs font-mono text-center"
                              min="1"
                              max="999"
                              title="表示順を変更してEnterキーまたはフォーカスを外してください"
                            />
                          </div>
                          
                          {/* 下段: 編集・プレビューボタン */}
                          <div className="flex items-center space-x-1">
                            <Link href={`/admin/courses/${course.id}/edit`}>
                              <Button variant="outline" size="sm" className="h-8">
                                <Edit className="h-3 w-3" />
                              </Button>
                            </Link>

                            <Link href={`/learning/${course.id}?preview=admin`} target="_blank">
                              <Button variant="outline" size="sm" className="h-8">
                                <Eye className="h-3 w-3" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}