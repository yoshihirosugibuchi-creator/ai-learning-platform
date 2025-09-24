'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import { 
  mainCategories, 
  industryCategories, 
  getSubcategoriesByParent 
} from '@/lib/categories'
import { 
  ArrowLeft, 
  Play, 
  BookOpen, 
  Clock,
  CheckCircle,
  Lock
} from 'lucide-react'

export default function CoursePage() {
  const params = useParams()
  const router = useRouter()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const categoryId = params.categoryId as string
  const category = [...mainCategories, ...industryCategories]
    .find(cat => cat.id === categoryId)
  
  if (!category) {
    return (
      <div className="min-h-screen bg-background">
        <Header onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)} />
        <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
        <main className="container mx-auto px-4 py-6">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">カテゴリーが見つかりません</h1>
            <Button onClick={() => router.back()}>戻る</Button>
          </div>
        </main>
      </div>
    )
  }

  const subcategories = getSubcategoriesByParent(categoryId)

  const handleStartSubcategoryCourse = (subcategoryId: string) => {
    // サブカテゴリー別のクイズを開始
    router.push(`/quiz?category=${categoryId}&subcategory=${subcategoryId}&mode=course`)
  }

  // Mock data for course progress
  const getCourseProgress = (_subcategoryId: string) => {  // eslint-disable-line @typescript-eslint/no-unused-vars
    // TODO: Implement actual progress calculation using subcategoryId
    return Math.floor(Math.random() * 100)
  }

  const isUnlocked = (index: number) => {
    // 最初のコースは常にアンロック、それ以外は前のコースが70%以上完了している場合
    if (index === 0) return true
    const previousProgress = getCourseProgress(`prev_${index}`)
    return previousProgress >= 70
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)}
        showBackButton={true}
        onBackClick={() => router.back()}
      />
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Course Header */}
          <div className="flex items-center space-x-4">
            <div 
              className="text-4xl p-4 rounded-xl"
              style={{ 
                backgroundColor: `${category.color}20`,
                border: `2px solid ${category.color}40`
              }}
            >
              {category.icon}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{category.name} - コース学習</h1>
              <p className="text-lg text-muted-foreground">
                サブカテゴリー別に体系的に学習を進めていきます
              </p>
              <div className="flex items-center space-x-4 mt-3">
                <Badge variant="default">
                  {subcategories.length} コース
                </Badge>
                <div className="text-sm text-muted-foreground">
                  順次アンロック形式
                </div>
              </div>
            </div>
          </div>

          {/* Course Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>コース一覧</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subcategories.length > 0 ? subcategories.map((subcat, index) => {
                  const progress = getCourseProgress(subcat.id)
                  const unlocked = isUnlocked(index)
                  
                  return (
                    <Card 
                      key={subcat.id} 
                      className={`transition-all ${
                        unlocked 
                          ? 'hover:shadow-lg cursor-pointer border-2 hover:border-primary/50' 
                          : 'opacity-50 cursor-not-allowed bg-muted/30'
                      }`}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <div className="flex items-center space-x-2">
                                {unlocked ? (
                                  progress === 100 ? (
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                  ) : (
                                    <BookOpen className="h-5 w-5 text-blue-500" />
                                  )
                                ) : (
                                  <Lock className="h-5 w-5 text-gray-400" />
                                )}
                                <h3 className="font-semibold text-lg">
                                  コース {index + 1}: {subcat.name}
                                </h3>
                              </div>
                              {progress === 100 && (
                                <Badge className="bg-green-100 text-green-800">完了</Badge>
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-4">
                              {subcat.description || `${subcat.name}に関する専門知識とスキルを体系的に学習します。`}
                            </p>
                            
                            {unlocked && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">進捗</span>
                                  <span className="font-medium">{progress}%</span>
                                </div>
                                <Progress value={progress} className="h-2" />
                              </div>
                            )}
                            
                            <div className="flex items-center space-x-4 mt-4 text-sm text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <BookOpen className="h-4 w-4" />
                                <span>5-8問</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="h-4 w-4" />
                                <span>10-15分</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="ml-4">
                            <Button
                              onClick={() => unlocked && handleStartSubcategoryCourse(subcat.id)}
                              disabled={!unlocked}
                              size="lg"
                              className="px-6"
                            >
                              {unlocked ? (
                                <>
                                  <Play className="h-4 w-4 mr-2" />
                                  {progress === 100 ? '復習' : progress > 0 ? '続ける' : '開始'}
                                </>
                              ) : (
                                <>
                                  <Lock className="h-4 w-4 mr-2" />
                                  ロック中
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                }) : (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-muted-foreground">
                        このカテゴリーのコースはまもなく追加されます。
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => router.push(`/categories/${categoryId}`)}
              className="px-6"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              カテゴリーページに戻る
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}