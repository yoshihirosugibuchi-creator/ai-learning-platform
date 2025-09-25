'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  FileText, 
  BarChart3,
  Settings,
  Sliders
} from 'lucide-react'
import Link from 'next/link'

export default function AdminPage() {

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">管理者パネル</h1>
        <p className="text-muted-foreground">システム管理とデータメンテナンス</p>
      </div>
      
      {/* 管理者メニュー */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Link href="/admin/xp-verification">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <span>XPシステム検証</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                統一XPシステムのデータ整合性と<br/>
                統計情報を確認します
              </p>
            </CardContent>
          </Card>
        </Link>
        
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
      </div>

    </div>
  )
}