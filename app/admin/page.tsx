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
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { useUserRole } from '@/hooks/useUserRole'

export default function AdminPage() {
  const { isSystemAdmin } = useUserRole()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">管理者パネル</h1>
        <p className="text-muted-foreground">システム管理とデータメンテナンス</p>
      </div>
      
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
          
          <Link href="/admin/quiz-management">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
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
          </div>
        </div>
      )}

    </div>
  )
}