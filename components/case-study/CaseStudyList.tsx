'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, Filter, RefreshCw } from 'lucide-react'
import CaseStudyCard from './CaseStudyCard'
import { useAuth } from '@/components/auth/AuthProvider'

interface Problem {
  id: string
  title: string
  primary_category_id: string
  primary_subcategory_id: string
  difficulty: 'basic' | 'intermediate' | 'advanced' | 'expert'
  industry: string | null
  estimated_minutes: number
  step_count: number
  user_completed: boolean
  user_best_score: number | null
  avg_score: number | null
}

interface CaseStudyListProps {
  initialProblems?: Problem[]
}

export default function CaseStudyList({ initialProblems }: CaseStudyListProps) {
  const { user } = useAuth()
  const [problems, setProblems] = useState<Problem[]>(initialProblems || [])
  const [loading, setLoading] = useState(!initialProblems)
  const [keyword, setKeyword] = useState('')
  const [difficulty, setDifficulty] = useState<string>('all')
  const [industry, setIndustry] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  const fetchProblems = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      if (!token) return

      const params = new URLSearchParams()
      if (keyword) params.set('keyword', keyword)
      if (difficulty !== 'all') params.set('difficulty', difficulty)
      if (industry !== 'all') params.set('industry', industry)
      params.set('limit', '20')

      const response = await fetch(`/api/case-study/problems?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setProblems(data.problems)
        }
      }
    } catch (error) {
      console.error('Failed to fetch problems:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!initialProblems) {
      fetchProblems()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleSearch = () => {
    fetchProblems()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 検索・フィルター */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="キーワードで検索..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4" />
          </Button>
          <Button onClick={handleSearch}>検索</Button>
        </div>

        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="難易度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全ての難易度</SelectItem>
                <SelectItem value="basic">初級</SelectItem>
                <SelectItem value="intermediate">中級</SelectItem>
                <SelectItem value="advanced">上級</SelectItem>
                <SelectItem value="expert">超上級</SelectItem>
              </SelectContent>
            </Select>

            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="業界" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全ての業界</SelectItem>
                <SelectItem value="IT">IT</SelectItem>
                <SelectItem value="製造業">製造業</SelectItem>
                <SelectItem value="金融">金融</SelectItem>
                <SelectItem value="小売">小売</SelectItem>
                <SelectItem value="サービス">サービス</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* 問題一覧 */}
      {problems.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          該当する問題がありません
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {problems.map((problem) => (
            <CaseStudyCard key={problem.id} problem={problem} />
          ))}
        </div>
      )}
    </div>
  )
}
