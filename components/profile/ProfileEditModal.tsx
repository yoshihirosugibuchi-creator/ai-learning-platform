'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Edit, 
  User, 
  Target, 
  CheckCircle,
  Briefcase
} from 'lucide-react'
import { getCategories } from '@/lib/categories'
import type { IndustryCategory, MainCategory } from '@/lib/types/category'
import { 
  EXPERIENCE_OPTIONS, 
  JOB_TITLES, 
  LEARNING_GOALS, 
  WEEKLY_GOALS,
  POSITION_LEVELS,
  getLearningLevels,
  LEARNING_LEVELS_LEGACY
} from '@/lib/profile-options'

interface ProfileData {
  name: string
  displayName: string
  industry: string
  jobTitle: string
  experienceYears: number
  positionLevel: string
  learningLevel: string
  interestedIndustries: string[]
  learningGoals: string[]
  weeklyGoal: string
  selectedCategories: string[]
  selectedIndustryCategories: string[]
}

interface ProfileEditModalProps {
  initialData: Partial<ProfileData>
  onSave: (data: Partial<ProfileData>) => Promise<void>
  children: React.ReactNode
}

export default function ProfileEditModal({ initialData, onSave, children }: ProfileEditModalProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  const [formData, setFormData] = useState<Partial<ProfileData>>(initialData)
  const [saving, setSaving] = useState(false)
  const [learningLevels, setLearningLevels] = useState(LEARNING_LEVELS_LEGACY)
  const [industryCategories, setIndustryCategories] = useState<IndustryCategory[]>([])
  const [mainCategories, setMainCategories] = useState<MainCategory[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  // Reset form data when modal opens
  useEffect(() => {
    if (open) {
      setFormData(initialData)
    }
  }, [open, initialData])

  // Load learning levels and categories data
  useEffect(() => {
    const loadDynamicData = async () => {
      setCategoriesLoading(true)
      try {
        // Load learning levels from skill_levels table
        const levels = await getLearningLevels()
        setLearningLevels(levels)

        // Load categories from database
        const [allIndustryCategories, allMainCategories] = await Promise.all([
          getCategories({ type: 'industry', activeOnly: true }),
          getCategories({ type: 'main', activeOnly: true })
        ])

        setIndustryCategories(allIndustryCategories as IndustryCategory[])
        setMainCategories(allMainCategories as MainCategory[])
        
      } catch (error) {
        console.error('Failed to load dynamic data:', error)
        // Keep using fallbacks
      } finally {
        setCategoriesLoading(false)
      }
    }
    
    loadDynamicData()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(formData)
      setOpen(false)
    } catch (error) {
      console.error('Error saving profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const updateFormData = (field: keyof ProfileData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const toggleArrayItem = (field: keyof ProfileData, item: string) => {
    const currentArray = (formData[field] as string[]) || []
    const newArray = currentArray.includes(item)
      ? currentArray.filter(i => i !== item)
      : [...currentArray, item]
    updateFormData(field, newArray)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Edit className="h-5 w-5" />
            <span>プロフィール編集</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="basic" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>基本情報</span>
            </TabsTrigger>
            <TabsTrigger value="career" className="flex items-center space-x-2">
              <Briefcase className="h-4 w-4" />
              <span>キャリア</span>
            </TabsTrigger>
            <TabsTrigger value="interests" className="flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>学習設定</span>
            </TabsTrigger>
          </TabsList>

          {/* Basic Information Tab */}
          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>基本プロフィール</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">名前</Label>
                    <Input
                      id="name"
                      value={formData.name || ''}
                      onChange={(e) => updateFormData('name', e.target.value)}
                      placeholder="名前を入力"
                    />
                  </div>
                  <div>
                    <Label htmlFor="displayName">呼び名</Label>
                    <Input
                      id="displayName"
                      value={formData.displayName || ''}
                      onChange={(e) => updateFormData('displayName', e.target.value)}
                      placeholder="呼び名を入力"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Career Information Tab */}
          <TabsContent value="career" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Briefcase className="h-5 w-5" />
                  <span>キャリア</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Primary Industry */}
                <div>
                  <Label>所属業界</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto">
                    {categoriesLoading ? (
                      <div className="col-span-2 text-center py-4 text-gray-500">
                        読み込み中...
                      </div>
                    ) : (
                      <>
                        {industryCategories.map((industry) => (
                          <Button
                            key={industry.id}
                            variant={formData.industry === industry.id ? "default" : "outline"}
                            size="sm"
                            className="justify-start text-left h-auto py-2"
                            onClick={() => updateFormData('industry', industry.id)}
                          >
                            <div>
                              <div className="flex items-center space-x-2">
                                <span>{industry.icon}</span>
                                <span className="text-xs">{industry.name}</span>
                              </div>
                            </div>
                          </Button>
                        ))}
                        
                        {/* 追加の選択肢 */}
                        <Button
                          variant={formData.industry === 'student' ? "default" : "outline"}
                          size="sm"
                          className="justify-start text-left h-auto py-2"
                          onClick={() => updateFormData('industry', 'student')}
                        >
                          <div>
                            <div className="flex items-center space-x-2">
                              <span>🎓</span>
                              <span className="text-xs">学生</span>
                            </div>
                          </div>
                        </Button>
                        
                        <Button
                          variant={formData.industry === 'other' ? "default" : "outline"}
                          size="sm"
                          className="justify-start text-left h-auto py-2"
                          onClick={() => updateFormData('industry', 'other')}
                        >
                          <div>
                            <div className="flex items-center space-x-2">
                              <span>📝</span>
                              <span className="text-xs">その他</span>
                            </div>
                          </div>
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Job Title */}
                <div>
                  <Label>職種</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {JOB_TITLES.map((job) => (
                      <Button
                        key={job}
                        variant={formData.jobTitle === job ? "default" : "outline"}
                        size="sm"
                        className="justify-start"
                        onClick={() => updateFormData('jobTitle', job)}
                      >
                        {job}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Experience Years */}
                <div>
                  <Label>経験年数</Label>
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {EXPERIENCE_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        variant={formData.experienceYears === option.value ? "default" : "outline"}
                        size="sm"
                        className="justify-start"
                        onClick={() => updateFormData('experienceYears', option.value)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Position Level */}
                <div>
                  <Label>職位レベル</Label>
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {POSITION_LEVELS.map((level) => (
                      <Button
                        key={level.value}
                        variant={formData.positionLevel === level.value ? "default" : "outline"}
                        size="sm"
                        className="justify-start"
                        onClick={() => updateFormData('positionLevel', level.value)}
                      >
                        {level.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Learning Settings Tab */}
          <TabsContent value="interests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>学習設定</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Interested Industries outside own industry */}
                <div>
                  <Label>自分の業界以外で興味ある業界（複数選択可）</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto">
                    {categoriesLoading ? (
                      <div className="col-span-2 text-center py-4 text-gray-500">
                        読み込み中...
                      </div>
                    ) : (
                      industryCategories.map((industry) => (
                        <Button
                          key={industry.id}
                          variant={(formData.interestedIndustries || []).includes(industry.id) ? "default" : "outline"}
                          size="sm"
                          className="justify-start text-left h-auto py-2"
                          onClick={() => toggleArrayItem('interestedIndustries', industry.id)}
                        >
                          <div>
                            <div className="flex items-center space-x-2">
                              {(formData.interestedIndustries || []).includes(industry.id) && 
                                <CheckCircle className="h-3 w-3" />
                              }
                              <span>{industry.icon}</span>
                              <span className="text-xs">{industry.name}</span>
                            </div>
                          </div>
                        </Button>
                      ))
                    )}
                  </div>
                </div>

                {/* Main Categories for Learning */}
                <div>
                  <Label>重点的に学習したいメインカテゴリー（複数選択可）</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto">
                    {categoriesLoading ? (
                      <div className="col-span-2 text-center py-4 text-gray-500">
                        読み込み中...
                      </div>
                    ) : (
                      mainCategories.map((category) => (
                        <Button
                          key={category.id}
                          variant={(formData.selectedCategories || []).includes(category.id) ? "default" : "outline"}
                          size="sm"
                          className="justify-start text-left h-auto py-2"
                          onClick={() => toggleArrayItem('selectedCategories', category.id)}
                        >
                          <div>
                            <div className="flex items-center space-x-2">
                              {(formData.selectedCategories || []).includes(category.id) && 
                                <CheckCircle className="h-3 w-3" />
                              }
                              <span>{category.icon}</span>
                              <span className="text-xs">{category.name}</span>
                            </div>
                          </div>
                        </Button>
                      ))
                    )}
                  </div>
                </div>

                {/* Learning Level */}
                <div>
                  <Label>学習レベル</Label>
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {learningLevels.map((level) => (
                      <Button
                        key={level.value}
                        variant={formData.learningLevel === level.value ? "default" : "outline"}
                        size="sm"
                        className="justify-start h-auto py-3"
                        onClick={() => updateFormData('learningLevel', level.value)}
                      >
                        <div className="text-left">
                          <div className="font-medium">{level.label}</div>
                          <div className="text-xs text-gray-500">{level.description}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Learning Goals */}
                <div>
                  <Label>学習目標（複数選択可）</Label>
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {LEARNING_GOALS.map((goal) => (
                      <Button
                        key={goal}
                        variant={(formData.learningGoals || []).includes(goal) ? "default" : "outline"}
                        size="sm"
                        className="justify-start"
                        onClick={() => toggleArrayItem('learningGoals', goal)}
                      >
                        {(formData.learningGoals || []).includes(goal) && 
                          <CheckCircle className="h-4 w-4 mr-2" />
                        }
                        {goal}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Weekly Goal */}
                <div>
                  <Label>週間学習目標</Label>
                  <div className="grid grid-cols-1 gap-3 mt-2">
                    {WEEKLY_GOALS.map((goal) => (
                      <Button
                        key={goal.id}
                        variant={formData.weeklyGoal === goal.id ? "default" : "outline"}
                        size="lg"
                        className="justify-start p-4 h-auto"
                        onClick={() => updateFormData('weeklyGoal', goal.id)}
                      >
                        <div className="text-left">
                          <div className="font-semibold">{goal.label}</div>
                          <div className="text-xs text-gray-500">{goal.description}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}