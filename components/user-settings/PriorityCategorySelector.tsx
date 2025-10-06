'use client'

import { useState, useEffect } from 'react'
import { getAllCategories } from '@/lib/categories'
import { getUserLearningPreferences, updateUserLearningPreferences } from '@/lib/user-preferences'
import type { MainCategory, IndustryCategory } from '@/lib/types/category'

interface PriorityCategorySelectorProps {
  userId: string
  onUpdate?: (categories: string[]) => void
}

export default function PriorityCategorySelector({ userId, onUpdate }: PriorityCategorySelectorProps) {
  const [categories, setCategories] = useState<(MainCategory | IndustryCategory)[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // カテゴリーと設定を並列取得
      const [allCategories, preferences] = await Promise.all([
        getAllCategories(),
        getUserLearningPreferences(userId)
      ])

      setCategories(allCategories)
      setSelectedCategories(preferences.priorityCategories || [])
      
    } catch (error) {
      console.error('Error loading data:', error)
      setMessage({ type: 'error', text: 'データの読み込みに失敗しました' })
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => {
      const newSelection = prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
      
      // 最大5個まで
      if (newSelection.length > 5) {
        setMessage({ type: 'error', text: '重点カテゴリーは最大5個まで選択できます' })
        return prev
      }
      
      return newSelection
    })
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setMessage(null)

      const result = await updateUserLearningPreferences(userId, {
        priorityCategories: selectedCategories
      })

      if (result.success) {
        setMessage({ type: 'success', text: '重点カテゴリーを更新しました' })
        onUpdate?.(selectedCategories)
      } else {
        setMessage({ type: 'error', text: result.message })
      }

    } catch (error) {
      console.error('Error saving preferences:', error)
      setMessage({ type: 'error', text: '保存中にエラーが発生しました' })
    } finally {
      setSaving(false)
    }
  }

  const getCategoryTypeLabel = (category: MainCategory | IndustryCategory) => {
    return category.type === 'main' ? 'メイン' : '業界'
  }

  const getCategoryDescription = (selectedCount: number) => {
    if (selectedCount === 0) {
      return '重点的に学習したいカテゴリーを選択してください（最大5個）'
    }
    return `${selectedCount}/5個のカテゴリーを選択中`
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          重点カテゴリー設定
        </h3>
        <p className="text-sm text-gray-600">
          {getCategoryDescription(selectedCategories.length)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          選択したカテゴリーは通常の2倍の確率で出題されます
        </p>
      </div>

      {/* メッセージ表示 */}
      {message && (
        <div className={`mb-4 p-3 rounded-md text-sm ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* カテゴリー選択 */}
      <div className="space-y-3 mb-6">
        {categories.map(category => (
          <div
            key={category.id}
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              selectedCategories.includes(category.id)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleCategoryToggle(category.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    selectedCategories.includes(category.id)
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedCategories.includes(category.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-xl">{category.icon}</span>
                  <div>
                    <div className="font-medium text-gray-900">
                      {category.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {category.description}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex-shrink-0">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  category.type === 'main' 
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {getCategoryTypeLabel(category)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 選択したカテゴリーのプレビュー */}
      {selectedCategories.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            選択中のカテゴリー
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedCategories.map(categoryId => {
              const category = categories.find(cat => cat.id === categoryId)
              return category ? (
                <span
                  key={categoryId}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700"
                >
                  <span className="mr-1">{category.icon}</span>
                  {category.name}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCategoryToggle(categoryId)
                    }}
                    className="ml-2 text-blue-500 hover:text-blue-700"
                  >
                    ×
                  </button>
                </span>
              ) : null
            })}
          </div>
        </div>
      )}

      {/* 保存ボタン */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-6 py-2 rounded-md font-medium transition-colors ${
            saving
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {saving ? '保存中...' : '設定を保存'}
        </button>
      </div>

      {/* 出題確率の説明 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          📊 出題確率について
        </h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• 通常カテゴリー: 各10%の確率で出題</p>
          <p>• 重点カテゴリー: 各20%の確率で出題（2倍）</p>
          <p>• 復習問題が最優先で選択されます</p>
        </div>
      </div>
    </div>
  )
}