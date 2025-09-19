'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  User, 
  Flame, 
  Trophy, 
  TrendingUp, 
  History, 
  BarChart3,
  Crown,
  Calendar,
  Coins,
  Building2,
  BookOpen,
  Settings,
  Award,
  Zap,
  Users,
  Briefcase,
  Target,
  Clock,
  Edit,
  Mail,
  Plus,
  Minus,
  Filter,
  MapPin,
  Sparkles
} from 'lucide-react'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import { useAuth } from '@/components/auth/AuthProvider'
import { getUserStats } from '@/lib/supabase-quiz'
import { getUserSKPBalance, getUserSKPTransactions } from '@/lib/supabase-learning'
import { getUserBadges } from '@/lib/supabase-badges'
import { updateUserProfile } from '@/lib/supabase-user'
import { mainCategories, industryCategories } from '@/lib/categories'
import { getUserLevelSystem, LevelSystem } from '@/lib/xp-level-system'

export default function ProfilePage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { user, profile, loading } = useAuth()
  const [activeTab, setActiveTab] = useState('basic')
  
  // データ状態
  const [quizStats, setQuizStats] = useState({
    totalQuestions: 0,
    correctAnswers: 0,
    accuracy: 0,
    totalQuizzes: 0,
    averageScore: 0,
    totalTimeSpent: 0
  })
  const [skpBalance, setSkpBalance] = useState(0)
  const [allTransactions, setAllTransactions] = useState<any[]>([]) // 全トランザクション（統計用）
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]) // 表示用履歴
  const [userBadges, setUserBadges] = useState<any[]>([])
  const [levelSystem, setLevelSystem] = useState<LevelSystem | null>(null)
  
  // SKPフィルター状態
  const [skpFilter, setSkpFilter] = useState<'all' | 'earned' | 'spent'>('all')
  
  // プロフィール編集状態
  const [editMode, setEditMode] = useState(false)
  const [profileData, setProfileData] = useState({
    name: '',
    displayName: '',
    industry: '',
    experienceYears: '',
    interestedIndustries: [],
    learningGoals: [],
    selectedCategories: [],
    selectedIndustryCategories: []
  })

  // データ取得
  useEffect(() => {
    if (user && profile) {
      // クイズ統計を取得
      getUserStats(user.id).then(stats => {
        setQuizStats(stats)
      }).catch(error => {
        console.error('Error fetching quiz stats:', error)
      })
      
      // SKPバランスを取得
      getUserSKPBalance(user.id).then(balance => {
        setSkpBalance(balance)
      }).catch(error => {
        console.error('Error fetching SKP balance:', error)
      })
      
      // SKP取引を取得（全件と表示用）
      getUserSKPTransactions(user.id).then(transactions => {
        setAllTransactions(transactions) // 全件（統計計算用）
        setRecentTransactions(transactions.slice(0, 10)) // 最新10件（簡易表示用）
      }).catch(error => {
        console.error('Error fetching SKP transactions:', error)
      })
      
      // ユーザーバッジを取得
      getUserBadges(user.id).then(badges => {
        setUserBadges(badges)
      }).catch(error => {
        console.error('Error fetching user badges:', error)
      })
      
      // 🆕 新しいレベルシステム情報を取得
      getUserLevelSystem(user.id).then(levels => {
        setLevelSystem(levels)
      }).catch(error => {
        console.error('Error fetching level system:', error)
      })
      
      // プロフィールデータを初期化
      setProfileData({
        name: profile.name || '',
        displayName: profile.display_name || '',
        industry: profile.industry || '',
        experienceYears: profile.experience_years?.toString() || '',
        interestedIndustries: profile.interested_industries || [],
        learningGoals: profile.learning_goals || [],
        selectedCategories: profile.selected_categories || [],
        selectedIndustryCategories: profile.selected_industry_categories || []
      })
    }
  }, [user, profile])

  // 認証ガード
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>
  }

  if (!user) {
    return <div className="min-h-screen bg-background flex items-center justify-center">ログインが必要です</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)} />
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <main className="container mx-auto px-4 py-6">
        {/* プロフィールヘッダー */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-3xl font-bold shadow-lg">
                {(profileData.displayName || profileData.name || user.email)?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-gray-900 break-words word-break-all overflow-hidden">
                  {profileData.displayName || profileData.name || 'ユーザー'}
                </h1>
                <p className="text-gray-600 flex items-center text-sm sm:text-base min-w-0">
                  <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate min-w-0">{user.email}</span>
                </p>
                {profileData.industry && (
                  <p className="text-gray-600 flex items-center">
                    <Building2 className="h-4 w-4 mr-2" />
                    {profileData.industry}
                    {profileData.experienceYears && ` (${profileData.experienceYears}年)`}
                  </p>
                )}
                <div className="flex items-center space-x-4 pt-2">
                  <Badge variant="outline" className="flex items-center space-x-1">
                    <Trophy className="h-3 w-3" />
                    <span>レベル {profile?.current_level || 1}</span>
                  </Badge>
                  <Badge variant="outline" className="flex items-center space-x-1">
                    <Flame className="h-3 w-3" />
                    <span>{profile?.streak || 0}日連続</span>
                  </Badge>
                  <Badge variant="outline" className="flex items-center space-x-1 text-yellow-600">
                    <Coins className="h-3 w-3" />
                    <span>{skpBalance} SKP</span>
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* タブメニュー */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>基本情報</span>
            </TabsTrigger>
            <TabsTrigger value="skills" className="flex items-center space-x-2">
              <Award className="h-4 w-4" />
              <span>スキル評価</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>スキル活用</span>
            </TabsTrigger>
          </TabsList>

          {/* 基本情報タブ */}
          <TabsContent value="basic" className="space-y-6">
            {/* プロフィール情報 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>プロフィール情報</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* システム管理項目（編集不可） */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">システム情報</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">ID（メールアドレス）</label>
                      <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded border">{user.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">登録日</label>
                      <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded border">
                        {new Date(user.created_at || Date.now()).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 編集可能項目 */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-800">基本プロフィール</h4>
                    {!editMode && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditMode(true)}
                        className="text-xs"
                      >
                        編集
                      </Button>
                    )}
                  </div>
                  
                  {editMode ? (
                    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">名前</label>
                          <input
                            type="text"
                            value={profileData.name}
                            onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                            placeholder="名前を入力"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">呼び名</label>
                          <input
                            type="text"
                            value={profileData.displayName}
                            onChange={(e) => setProfileData({...profileData, displayName: e.target.value})}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                            placeholder="呼び名を入力"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">所属業界</label>
                          <input
                            type="text"
                            value={profileData.industry}
                            onChange={(e) => setProfileData({...profileData, industry: e.target.value})}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                            placeholder="所属業界を入力"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">経験年数</label>
                          <input
                            type="number"
                            value={profileData.experienceYears}
                            onChange={(e) => setProfileData({...profileData, experienceYears: e.target.value})}
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                            placeholder="経験年数"
                          />
                        </div>
                      </div>
                      <div className="flex space-x-2 pt-2">
                        <Button size="sm" onClick={() => setEditMode(false)}>
                          保存
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>
                          キャンセル
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">名前</label>
                        <p className="text-sm text-gray-600 bg-white p-2 rounded border">
                          {profileData.name || '未設定'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">呼び名</label>
                        <p className="text-sm text-gray-600 bg-white p-2 rounded border">
                          {profileData.displayName || '未設定'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">所属業界</label>
                        <p className="text-sm text-gray-600 bg-white p-2 rounded border">
                          {profileData.industry || '未設定'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">経験年数</label>
                        <p className="text-sm text-gray-600 bg-white p-2 rounded border">
                          {profileData.experienceYears ? `${profileData.experienceYears}年` : '未設定'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 興味・目的（簡易版編集可能） */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">興味・学習目的</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">興味のある業界</label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {profileData.interestedIndustries.length > 0 ? (
                          profileData.interestedIndustries.map((industry) => (
                            <Badge key={industry} variant="secondary">{industry}</Badge>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">未設定</p>
                        )}
                        <Button variant="outline" size="sm" className="text-xs">
                          編集
                        </Button>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">学習目的</label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {profileData.learningGoals.length > 0 ? (
                          profileData.learningGoals.map((goal) => (
                            <Badge key={goal} variant="outline">{goal}</Badge>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">未設定</p>
                        )}
                        <Button variant="outline" size="sm" className="text-xs">
                          編集
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 選択学習分野 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5" />
                  <span>選択学習分野</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">重点メインカテゴリー</label>
                    <Button variant="outline" size="sm" className="text-xs">
                      選択・編集
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {profileData.selectedCategories.length > 0 ? (
                      profileData.selectedCategories.map((categoryId) => {
                        const category = mainCategories.find(cat => cat.id === categoryId)
                        return category ? (
                          <Badge key={categoryId} className="flex items-center space-x-1">
                            <span>{category.icon}</span>
                            <span>{category.name}</span>
                          </Badge>
                        ) : null
                      })
                    ) : (
                      <p className="text-sm text-gray-500">重点的に学習したいメインカテゴリーを選択してください</p>
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">業界カテゴリー</label>
                    <Button variant="outline" size="sm" className="text-xs">
                      選択・編集
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {profileData.selectedIndustryCategories.length > 0 ? (
                      profileData.selectedIndustryCategories.map((categoryId) => {
                        const category = industryCategories.find(cat => cat.id === categoryId)
                        return category ? (
                          <Badge key={categoryId} variant="outline" className="flex items-center space-x-1">
                            <span>{category.icon}</span>
                            <span>{category.name}</span>
                          </Badge>
                        ) : null
                      })
                    ) : (
                      <p className="text-sm text-gray-500">関心のある業界カテゴリーを選択してください</p>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded">
                  💡 選択した分野は、スキル評価タブでの業界スキルレベル表示や、おすすめ学習コンテンツの提案に使用されます。
                </div>
              </CardContent>
            </Card>

            {/* アカウント管理（準備中） */}
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>アカウント管理</span>
                  <Badge variant="secondary" className="text-xs">準備中</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-blue-700">
                  <p className="mb-3">以下の機能を準備中です：</p>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <p className="font-medium text-xs mb-1">セキュリティ</p>
                      <ul className="space-y-1 text-xs list-disc list-inside">
                        <li>パスワード変更・二段階認証</li>
                        <li>ログインセッション管理</li>
                        <li>セキュリティ設定管理</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-xs mb-1">プライバシー・データ管理</p>
                      <ul className="space-y-1 text-xs list-disc list-inside">
                        <li>プライバシー・通知設定</li>
                        <li>学習データエクスポート</li>
                        <li>アカウント削除・一時停止</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 企業情報（準備中） */}
            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <span>企業情報</span>
                  <Badge variant="secondary" className="text-xs">準備中</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-orange-700">
                  <p className="mb-3">企業内利用時に利用できる機能です（将来実装予定）：</p>
                  <ul className="space-y-1 text-xs list-disc list-inside">
                    <li>企業ID、企業名、企業メール</li>
                    <li>認証コード、部署情報</li>
                    <li>企業内学習管理</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* スキル評価タブ */}
          <TabsContent value="skills" className="space-y-6">
            {/* 全体スキルレベル */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-5 w-5" />
                  <span>全体スキルレベル</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <Trophy className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                    <div className="text-2xl font-bold">{levelSystem?.overall.level || 1}</div>
                    <p className="text-sm text-muted-foreground">現在レベル</p>
                  </div>
                  <div className="text-center">
                    <Crown className="h-8 w-8 mx-auto text-purple-500 mb-2" />
                    <div className="text-2xl font-bold">{levelSystem?.overall.xp || 0}</div>
                    <p className="text-sm text-muted-foreground">総獲得XP</p>
                  </div>
                  <div className="text-center">
                    <TrendingUp className="h-8 w-8 mx-auto text-green-500 mb-2" />
                    <div className="text-2xl font-bold">
                      {quizStats.totalQuestions > 0 ? `${quizStats.accuracy}%` : '-%'}
                    </div>
                    <p className="text-sm text-muted-foreground">全体正答率</p>
                  </div>
                  <div className="text-center">
                    <BarChart3 className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                    <div className="text-2xl font-bold">{quizStats.totalQuestions}</div>
                    <p className="text-sm text-muted-foreground">総解答数</p>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span>次のレベルまで</span>
                    <span>{levelSystem?.overall.nextLevelXP || 1000}/1000 XP</span>
                  </div>
                  <Progress value={((1000 - (levelSystem?.overall.nextLevelXP || 1000)) / 1000) * 100} />
                </div>
              </CardContent>
            </Card>

            {/* メインカテゴリー別スキルレベル */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>メインカテゴリー別スキルレベル</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {mainCategories.map((category) => {
                    const categoryLevel = levelSystem?.mainCategories[category.id]
                    console.log(`🔍 Main category ${category.id}:`, JSON.stringify(categoryLevel, null, 2))
                    return (
                      <div key={category.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">{category.icon}</div>
                          <div>
                            <h4 className="font-medium">{category.name}</h4>
                            <p className="text-sm text-muted-foreground">{category.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">レベル {categoryLevel?.level || 1}</div>
                          <p className="text-sm text-muted-foreground">{categoryLevel?.xp || 0} XP</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 業界スキルレベル */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <span>業界スキルレベル</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {industryCategories.map((category) => {
                    const industryLevel = levelSystem?.industryCategories[category.id]
                    console.log(`🔍 Industry category ${category.id}:`, industryLevel)
                    return (
                      <div key={category.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">{category.icon}</div>
                          <div>
                            <h4 className="font-medium">{category.name}</h4>
                            <p className="text-sm text-muted-foreground">{category.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">レベル {industryLevel?.level || 1}</div>
                          <p className="text-sm text-muted-foreground">{industryLevel?.xp || 0} XP</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 獲得バッジ */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5" />
                  <span>獲得バッジ</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userBadges.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {userBadges.map((badge) => (
                      <div key={badge.id} className="text-center p-4 border rounded-lg">
                        <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                          <Trophy className="h-8 w-8 text-white" />
                        </div>
                        <h4 className="font-medium text-sm">{badge.badge_name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {new Date(badge.earned_at).toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>まだバッジを獲得していません</p>
                    <p className="text-sm">コース学習を完了してバッジを獲得しましょう！</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 獲得称号（準備中） */}
            <Card className="border-purple-200 bg-purple-50/50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Crown className="h-5 w-5" />
                  <span>ALE認定称号</span>
                  <Badge variant="secondary" className="text-xs">準備中</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-purple-700">
                  <p className="mb-3">スキルレベルに応じた認定称号システム（将来実装予定）：</p>
                  <ul className="space-y-1 text-xs list-disc list-inside">
                    <li>ALE認定アナリスト（基礎スキル達成）</li>
                    <li>ALE認定コンサルタント（中級スキル達成）</li>
                    <li>ALE認定エキスパート（上級スキル達成）</li>
                    <li>業界特化認定資格</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* スキル活用タブ */}
          <TabsContent value="activity" className="space-y-6">
            {/* SKPポイント管理 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Coins className="h-5 w-5 text-yellow-500" />
                  <span>SKPポイント管理</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 統計カード */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <div className="flex flex-col items-center space-y-2">
                        <Coins className="h-8 w-8 text-yellow-500" />
                        <div className="text-2xl font-bold text-yellow-600">{skpBalance}</div>
                        <div className="text-xs text-muted-foreground">現在残高</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6 text-center">
                      <div className="flex flex-col items-center space-y-2">
                        <Plus className="h-8 w-8 text-green-500" />
                        <div className="text-2xl font-bold text-green-600">
                          {allTransactions.filter(t => t.type === 'earned').reduce((sum, t) => sum + t.amount, 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">累計獲得</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6 text-center">
                      <div className="flex flex-col items-center space-y-2">
                        <Minus className="h-8 w-8 text-red-500" />
                        <div className="text-2xl font-bold text-red-600">
                          {allTransactions.filter(t => t.type === 'spent').reduce((sum, t) => sum + t.amount, 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">累計使用</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6 text-center">
                      <div className="flex flex-col items-center space-y-2">
                        <TrendingUp className="h-8 w-8 text-blue-500" />
                        <div className="text-2xl font-bold text-blue-600">{allTransactions.length}</div>
                        <div className="text-xs text-muted-foreground">取引回数</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* フィルター機能 */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4" />
                    <span className="text-sm font-medium">フィルター:</span>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant={skpFilter === 'all' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setSkpFilter('all')}
                    >
                      全て
                    </Button>
                    <Button 
                      variant={skpFilter === 'earned' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setSkpFilter('earned')}
                    >
                      獲得
                    </Button>
                    <Button 
                      variant={skpFilter === 'spent' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setSkpFilter('spent')}
                    >
                      使用
                    </Button>
                  </div>
                </div>

                {/* トランザクション履歴 */}
                <div className="space-y-4">
                  <h4 className="font-medium">取引履歴</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {allTransactions
                      .filter(transaction => skpFilter === 'all' || transaction.type === skpFilter)
                      .slice(0, 20) // 最新20件を表示
                      .map((transaction, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              transaction.type === 'earned' ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                              {transaction.type === 'earned' ? (
                                <Plus className="h-4 w-4 text-green-600" />
                              ) : (
                                <Minus className="h-4 w-4 text-red-600" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{transaction.description}</p>
                              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(transaction.timestamp).toLocaleDateString('ja-JP', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}</span>
                                <Badge variant="outline" className="text-xs">
                                  {transaction.source}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className={`text-sm font-bold ${
                            transaction.type === 'earned' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'earned' ? '+' : '-'}{transaction.amount} SKP
                          </div>
                        </div>
                      ))}
                  </div>
                  {allTransactions.filter(t => skpFilter === 'all' || t.type === skpFilter).length > 20 && (
                    <p className="text-sm text-muted-foreground text-center">
                      ...他 {allTransactions.filter(t => skpFilter === 'all' || t.type === skpFilter).length - 20} 件
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* SKP利用チャンネル（準備中） */}
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>SKP利用チャンネル</span>
                  <Badge variant="secondary" className="text-xs">準備中</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-green-700">
                  <p className="mb-3">SKPポイントの活用機能（将来実装予定）：</p>
                  <ul className="space-y-1 text-xs list-disc list-inside">
                    <li>有料学習コンテンツ購入</li>
                    <li>トークン市場での売買</li>
                    <li>仲間へのSKP送金</li>
                    <li>特別イベント参加権購入</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* その他の機能（準備中） */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>仲間管理</span>
                    <Badge variant="secondary" className="text-xs">準備中</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-blue-700">
                    <p className="mb-2">学習仲間との連携機能：</p>
                    <ul className="text-xs list-disc list-inside space-y-1">
                      <li>仲間検索・申請</li>
                      <li>チャット機能</li>
                      <li>学習進捗共有</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Briefcase className="h-5 w-5" />
                    <span>キャリア支援</span>
                    <Badge variant="secondary" className="text-xs">準備中</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-orange-700">
                    <p className="mb-2">AIマッチング機能：</p>
                    <ul className="text-xs list-disc list-inside space-y-1">
                      <li>プロジェクト案件推奨</li>
                      <li>転職情報推奨</li>
                      <li>企業内人材推奨</li>
                      <li>起業支援サービス</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}