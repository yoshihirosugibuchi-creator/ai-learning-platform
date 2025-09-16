'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Brain, 
  Building, 
  Briefcase, 
  Clock, 
  Target, 
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles
} from 'lucide-react'
import { useUserContext } from '@/contexts/UserContext'
import { updateUserProfile, markOnboardingComplete } from '@/lib/storage'

// 業界選択肢
const INDUSTRIES = [
  'コンサルティング',
  'IT・システム開発', 
  '製造業',
  '金融・保険',
  '商社・貿易',
  '小売・サービス',
  '医療・ヘルスケア',
  '教育・研修',
  'その他'
]

// 職種選択肢
const JOB_TITLES = [
  '経営・管理職',
  '営業・マーケティング',
  '企画・戦略',
  'エンジニア・技術職',
  'コンサルタント',
  '人事・総務',
  '財務・経理',
  'その他'
]

// 経験年数選択肢
const EXPERIENCE_OPTIONS = [
  { value: 0, label: '1年未満' },
  { value: 2, label: '1-3年' },
  { value: 5, label: '4-7年' },
  { value: 10, label: '8-15年' },
  { value: 16, label: '16年以上' }
]

// 学習目標選択肢
const LEARNING_GOALS = [
  'スキルアップ・キャリア向上',
  '資格取得・認定試験対策', 
  '転職・就職準備',
  '業務効率化',
  '新しい知識の習得',
  'チームメンバーの育成'
]

// 週間学習目標
const WEEKLY_GOALS = [
  { id: 'light', label: 'ライト', description: '週2-3回、1回10分程度' },
  { id: 'medium', label: 'ミディアム', description: '週4-5回、1回15分程度' },
  { id: 'heavy', label: 'ヘビー', description: '毎日、1回20分以上' }
]

interface OnboardingData {
  industry?: string
  jobTitle?: string
  experienceYears?: number
  learningGoals?: string[]
  weeklyGoal?: 'light' | 'medium' | 'heavy'
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user, updateUser } = useUserContext()
  const [currentStep, setCurrentStep] = useState(1)
  const [data, setData] = useState<OnboardingData>({})
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])

  const totalSteps = 4
  const progress = (currentStep / totalSteps) * 100

  useEffect(() => {
    // ログインしていない場合はログインページにリダイレクト
    if (!user) {
      router.push('/login')
      return
    }

    // すでにオンボーディング済みの場合はホームにリダイレクト
    if (user.auth.isOnboarded) {
      router.push('/')
      return
    }
  }, [user, router])

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    if (!user) return

    try {
      // プロフィール情報を更新
      const success = updateUserProfile(user.id, {
        industry: data.industry,
        jobTitle: data.jobTitle,
        experienceYears: data.experienceYears,
        learningGoals: selectedGoals,
        weeklyGoal: data.weeklyGoal
      })

      if (success) {
        // オンボーディング完了マーク
        markOnboardingComplete(user.id)
        
        // UserContextの更新
        updateUser({
          auth: {
            ...user.auth,
            isOnboarded: true
          },
          profile: {
            ...user.profile,
            industry: data.industry,
            jobTitle: data.jobTitle,
            experienceYears: data.experienceYears,
            learningGoals: selectedGoals,
            weeklyGoal: data.weeklyGoal
          }
        })

        router.push('/')
      }
    } catch (error) {
      console.error('Onboarding completion error:', error)
    }
  }

  const toggleGoal = (goal: string) => {
    setSelectedGoals(prev => 
      prev.includes(goal) 
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    )
  }

  if (!user) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* ヘッダー */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-gray-900">初期設定</h1>
          </div>
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-gray-600">
              ステップ {currentStep} / {totalSteps}
            </p>
          </div>
        </div>

        {/* メインコンテンツ */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {currentStep === 1 && <Building className="h-5 w-5" />}
              {currentStep === 2 && <Briefcase className="h-5 w-5" />}
              {currentStep === 3 && <Target className="h-5 w-5" />}
              {currentStep === 4 && <Clock className="h-5 w-5" />}
              <span>
                {currentStep === 1 && '基本情報'}
                {currentStep === 2 && '職歴情報'}
                {currentStep === 3 && '学習目標'}
                {currentStep === 4 && '学習スタイル'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ステップ1: 基本情報 */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold">ようこそ、{user.name}さん！</h3>
                  <p className="text-gray-600">
                    あなたに最適な学習体験を提供するため、少しお聞かせください。
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label>業界を選択してください</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {INDUSTRIES.map((industry) => (
                        <Button
                          key={industry}
                          variant={data.industry === industry ? "default" : "outline"}
                          size="sm"
                          className="justify-start"
                          onClick={() => setData(prev => ({ ...prev, industry }))}
                        >
                          {industry}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ステップ2: 職歴情報 */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <Label>職種を選択してください</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {JOB_TITLES.map((job) => (
                      <Button
                        key={job}
                        variant={data.jobTitle === job ? "default" : "outline"}
                        size="sm"
                        className="justify-start"
                        onClick={() => setData(prev => ({ ...prev, jobTitle: job }))}
                      >
                        {job}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>経験年数を選択してください</Label>
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {EXPERIENCE_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        variant={data.experienceYears === option.value ? "default" : "outline"}
                        size="sm"
                        className="justify-start"
                        onClick={() => setData(prev => ({ ...prev, experienceYears: option.value }))}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ステップ3: 学習目標 */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <Label>学習目標を選択してください（複数選択可）</Label>
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {LEARNING_GOALS.map((goal) => (
                      <Button
                        key={goal}
                        variant={selectedGoals.includes(goal) ? "default" : "outline"}
                        size="sm"
                        className="justify-start"
                        onClick={() => toggleGoal(goal)}
                      >
                        {selectedGoals.includes(goal) && <CheckCircle className="h-4 w-4 mr-2" />}
                        {goal}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ステップ4: 学習スタイル */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div>
                  <Label>週間学習目標を選択してください</Label>
                  <div className="grid grid-cols-1 gap-3 mt-2">
                    {WEEKLY_GOALS.map((goal) => (
                      <Button
                        key={goal.id}
                        variant={data.weeklyGoal === goal.id ? "default" : "outline"}
                        size="lg"
                        className="justify-start p-4 h-auto"
                        onClick={() => setData(prev => ({ ...prev, weeklyGoal: goal.id as any }))}
                      >
                        <div className="text-left">
                          <div className="font-semibold">{goal.label}</div>
                          <div className="text-xs text-gray-500">{goal.description}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <Sparkles className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">準備完了！</h4>
                      <p className="text-sm text-blue-800">
                        設定した目標に基づいて、あなた専用の学習プランを作成します。
                        いつでも設定は変更できます。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ナビゲーションボタン */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                戻る
              </Button>

              <Button
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && !data.industry) ||
                  (currentStep === 2 && (!data.jobTitle || data.experienceYears === undefined)) ||
                  (currentStep === 3 && selectedGoals.length === 0) ||
                  (currentStep === 4 && !data.weeklyGoal)
                }
              >
                {currentStep === totalSteps ? '完了' : '次へ'}
                {currentStep === totalSteps ? (
                  <CheckCircle className="h-4 w-4 ml-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 ml-2" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}