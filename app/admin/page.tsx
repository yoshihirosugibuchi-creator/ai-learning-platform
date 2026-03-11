'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FileText,
  Settings,
  Sliders,
  Target,
  Activity,
  Users,
  Shield,
  RefreshCw,
  Palette,
  Sparkles,
  Upload,
  ClipboardCheck,
  BarChart3,
  BookOpen,
  Briefcase,
  Database,
  Package
} from 'lucide-react'
import Link from 'next/link'
import { useUserRole } from '@/hooks/useUserRole'
import PageHeader from '@/components/layout/PageHeader'

export default function AdminPage() {
  const { isSystemAdmin } = useUserRole()

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Shield}
        title="管理者パネル"
        description="システム管理とデータメンテナンス"
      />
      
      {/* 管理者共通メニュー */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Settings className="h-5 w-5 mr-2 text-blue-600" />
          コンテンツ管理
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Link href="/admin/categories">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-green-600" />
                  <span>カテゴリー管理</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  カテゴリーとサブカテゴリーの<br/>
                  管理と設定を行います
                </p>
              </CardContent>
            </Card>
          </Link>


          <Link href="/admin/xp-settings">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sliders className="h-5 w-5 text-purple-600" />
                  <span>XP設定管理</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  XP・レベル・SKPの設定値を<br/>
                  動的に変更・管理します
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/difficulty-settings">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-orange-600" />
                  <span>難易度分布設定</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  正答率に応じた問題難易度の<br/>
                  出題比率を管理します
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/industry-targets">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-red-600" />
                  <span>業界目標管理</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  業界レベル別の目標XPと<br/>
                  レーダーチャート設定を管理
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/wisdom-cards">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="h-5 w-5 text-purple-600" />
                  <span>格言カード管理</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  格言カードの作成・編集・<br/>
                  ビジュアル設定を管理
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/quiz-generator">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  <span>クイズ問題生成</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  AIを活用してクイズ問題を<br/>
                  自動生成・レビュー管理
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/review-management">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ClipboardCheck className="h-5 w-5 text-blue-600" />
                  <span>クイズレビュー管理</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  AI生成問題のレビュー・<br/>
                  承認・編集を行います
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/production-import">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-5 w-5 text-green-600" />
                  <span>クイズ本番取込</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  承認済み問題を本番DBに<br/>
                  一括取込します
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/question-maintenance">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  <span>クイズ問題メンテナンス</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  既存問題の編集と<br/>
                  AIヒント生成・管理
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/quiz-packs">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-orange-600" />
                  <span>クイズパック管理</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  カテゴリー・難易度を条件設定した<br/>
                  クイズパックの作成・管理
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/ai-course-generation">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  <span>AIコース学習生成</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  AIを活用して学習コースの<br/>
                  階層構造と内容を自動生成
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/courses">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  <span>コース学習メンテナンス</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  学習コースの管理・公開状態の<br/>
                  変更・編集を行います
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/case-study">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Briefcase className="h-5 w-5 text-teal-600" />
                  <span>ケーススタディ管理</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  ケーススタディ問題の作成・<br/>
                  管理・ルーブリック設定
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/case-study/masters">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-cyan-600" />
                  <span>ケーススタディマスタ</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  オプション・ルーブリック軸の<br/>
                  マスタデータ管理
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* システム管理者専用メニュー */}
      {isSystemAdmin && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-red-600" />
            システム管理 <span className="text-sm text-red-600 ml-2">(システム管理者限定)</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/admin/system-status">
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-red-200">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-green-600" />
                    <span>システム監視</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    システム状態・アラート・<br/>
                    ヘルスチェックの監視
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/user-management">
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-red-200">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-indigo-600" />
                    <span>ユーザー管理</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    ユーザー権限設定・<br/>
                    アカウント管理
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/quiz-management">
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-red-200">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-orange-600" />
                    <span>クイズ問題管理</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    CSVインポート・エクスポートで<br/>
                    問題データを管理します
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/fallback-sync">
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-red-200">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <RefreshCw className="h-5 w-5 text-blue-600" />
                    <span>フォールバック同期</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    DB→ファイル同期・<br/>
                    フォールバックデータ管理
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/batch-analytics">
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-red-200">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    <span>日次分析バッチ管理</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    学習品質スコア・ピーク時間の<br/>
                    自動計算システム管理
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      )}

    </div>
  )
}