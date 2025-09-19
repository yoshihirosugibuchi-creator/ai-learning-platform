'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft,
  Zap, 
  Plus,
  Minus,
  Clock,
  Filter,
  Calendar,
  TrendingUp
} from 'lucide-react'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import { useAuth } from '@/components/auth/AuthProvider'
import { useRouter } from 'next/navigation'
import { getUserSKPTransactions, getUserSKPBalance } from '@/lib/supabase-learning'

type FilterType = 'all' | 'earned' | 'spent'

export default function SkpHistoryPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [transactions, setTransactions] = useState<any[]>([])
  const [currentBalance, setCurrentBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()

  // Load SKP transactions and balance
  useEffect(() => {
    if (user?.id) {
      const loadData = async () => {
        try {
          setLoading(true)
          const [transactionsData, balance] = await Promise.all([
            getUserSKPTransactions(user.id),
            getUserSKPBalance(user.id)
          ])
          
          
          setTransactions(transactionsData)
          setCurrentBalance(balance)
        } catch (error) {
          console.error('Error loading SKP data:', error)
        } finally {
          setLoading(false)
        }
      }
      loadData()
    }
  }, [user])

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)} />
        <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
        <main className="container mx-auto px-4 py-6">
          <div className="text-center py-12">
            <p>ログインが必要です</p>
          </div>
        </main>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)} />
        <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
        <main className="container mx-auto px-4 py-6">
          <div className="text-center py-12">
            <p>データを読み込んでいます...</p>
          </div>
        </main>
      </div>
    )
  }
  
  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'all') return true
    return transaction.type === filter
  })

  const earnedTransactions = transactions.filter(t => t.type === 'earned')
  const totalEarned = earnedTransactions.reduce((sum, t) => sum + t.amount, 0)
  
  const spentTransactions = transactions.filter(t => t.type === 'spent')
  const totalSpent = spentTransactions.reduce((sum, t) => sum + t.amount, 0)
  

  const getTransactionIcon = (type: string) => {
    return type === 'earned' ? (
      <Plus className="h-4 w-4 text-green-500" />
    ) : (
      <Minus className="h-4 w-4 text-red-500" />
    )
  }

  const getTransactionColor = (type: string) => {
    return type === 'earned' ? 'text-green-600' : 'text-red-600'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'quiz_completion':
        return 'bg-blue-100 text-blue-800'
      case 'account_creation':
        return 'bg-green-100 text-green-800'
      case 'daily_bonus':
        return 'bg-yellow-100 text-yellow-800'
      case 'achievement':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)} />
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/profile')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>プロフィールに戻る</span>
          </Button>
        </div>

        {/* Page Title */}
        <div className="text-center">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold flex items-center justify-center space-x-2 mb-2">
            <Zap className="h-8 w-8 text-yellow-500" />
            <span>SKPポイント履歴</span>
          </h1>
          <p className="text-muted-foreground">すべてのポイント獲得・使用履歴を確認できます</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="flex flex-col items-center space-y-2">
                <Zap className="h-8 w-8 text-yellow-500" />
                <div className="text-2xl font-bold text-yellow-600">{currentBalance}</div>
                <div className="text-xs text-muted-foreground">現在のポイント</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="flex flex-col items-center space-y-2">
                <Plus className="h-8 w-8 text-green-500" />
                <div className="text-2xl font-bold text-green-600">{totalEarned}</div>
                <div className="text-xs text-muted-foreground">累計獲得</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="flex flex-col items-center space-y-2">
                <Minus className="h-8 w-8 text-red-500" />
                <div className="text-2xl font-bold text-red-600">{totalSpent}</div>
                <div className="text-xs text-muted-foreground">累計使用</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="flex flex-col items-center space-y-2">
                <TrendingUp className="h-8 w-8 text-blue-500" />
                <div className="text-2xl font-bold text-blue-600">{transactions.length}</div>
                <div className="text-xs text-muted-foreground">取引回数</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Buttons */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>履歴フィルター</span>
              </CardTitle>
              <Badge variant="outline">
                {filteredTransactions.length}件表示中
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
                className="flex items-center space-x-1"
              >
                <span>すべて</span>
              </Button>
              <Button
                variant={filter === 'earned' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('earned')}
                className="flex items-center space-x-1"
              >
                <Plus className="h-3 w-3" />
                <span>獲得</span>
              </Button>
              <Button
                variant={filter === 'spent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('spent')}
                className="flex items-center space-x-1"
              >
                <Minus className="h-3 w-3" />
                <span>使用</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>取引履歴</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length > 0 ? (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredTransactions
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((transaction) => (
                    <div 
                      key={transaction.id} 
                      className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start space-x-3 flex-1">
                        {getTransactionIcon(transaction.type)}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <div className="font-medium text-sm">{transaction.description}</div>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getSourceBadgeColor(transaction.source)}`}
                            >
                              {transaction.source === 'quiz_completion' ? 'クイズ' :
                               transaction.source === 'account_creation' ? '登録' :
                               transaction.source === 'daily_bonus' ? 'デイリー' :
                               transaction.source === 'achievement' ? '達成' : transaction.source}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(transaction.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className={`font-bold text-lg ${getTransactionColor(transaction.type)}`}>
                        {transaction.type === 'earned' ? '+' : '-'}{transaction.amount} SKP
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  {filter === 'all' ? '履歴がありません' :
                   filter === 'earned' ? '獲得履歴がありません' : '使用履歴がありません'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {filter === 'all' ? 'クイズを完了してポイントを獲得しましょう！' :
                   filter === 'earned' ? 'クイズを完了してポイントを獲得しましょう！' : 'まだポイントを使用していません。'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}