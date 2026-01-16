'use client'
import { Button } from '@/components/ui/button'
import { 
  BookOpen, 
  FolderOpen, 
  BookOpenText, 
  FileText, 
  HelpCircle,
  Edit, 
  Trash2, 
  Plus,
  Text,
  Target,
  Lightbulb
} from 'lucide-react'

// 既存の型定義を使用（app/admin/courses/[id]/edit/page.tsxから）
interface Content {
  id: string
  session_id: string
  content_type: string
  title: string | null
  content: string
  duration: number | null
  display_order: number
}

interface Quiz {
  id: string
  session_id: string
  question: string
  options: string[]
  correct_answer: number
  explanation: string
  quiz_type: string
  display_order: number
}

interface Session {
  id: string
  theme_id: string
  title: string
  session_type: string
  display_order: number
  estimated_minutes: number
  contents: Content[]
  quizzes: Quiz[]
}

interface BadgeData {
  id: string
  icon: string
  color: string
  title: string
  description: string
  badgeImageUrl?: string
  validityPeriodMonths?: number | null
  badgeDisplayName?: string
}

interface RewardCardData {
  id: string
  icon: string
  color: string
  title: string
  summary: string
  keyPoints: string[]
}

interface Theme {
  id: string
  genre_id: string
  title: string
  description: string
  display_order: number
  estimated_minutes: number
  reward_card_data: RewardCardData | null
  sessions: Session[]
}

interface Genre {
  id: string
  course_id: string
  title: string
  description: string
  display_order: number
  estimated_days: number
  badge_data: BadgeData | null
  themes: Theme[]
}

interface Course {
  id: string
  title: string
  description: string
  difficulty: string
  status: 'draft' | 'coming_soon' | 'available' | 'archived'
  icon: string
  color: string
  display_order: number
  estimated_days: number
  genres?: Genre[]
}

interface CourseStructureViewProps {
  course: Course | null
  onEditGenre: (genre: Genre) => void
  onDeleteGenre: (genreId: string, genreTitle: string) => Promise<void>
  onAddGenre: () => void
  onEditTheme: (theme: Theme, genreId: string) => void
  onDeleteTheme: (themeId: string, themeTitle: string) => Promise<void>
  onAddTheme: (genreId: string) => void
  onEditSession: (session: Session, themeId: string) => void
  onDeleteSession: (sessionId: string, sessionTitle: string) => Promise<void>
  onAddSession: (themeId: string) => void
  onEditContent: (content: Content, sessionId: string) => void
  onDeleteContent: (contentId: string, contentTitle: string) => Promise<void>
  onAddContent: (sessionId: string) => void
  onEditQuiz: (quiz: Quiz, sessionId: string) => void
  onDeleteQuiz: (quizId: string) => Promise<void>
  onAddQuiz: (sessionId: string) => void
}

// Phase1仕様のアイコンマッピング
const contentTypeIcons: { [key: string]: React.ReactNode } = {
  text: <Text className="h-4 w-4 text-blue-600" />,
  example: <Target className="h-4 w-4 text-green-600" />,
  key_points: <Lightbulb className="h-4 w-4 text-orange-600" />,
  // Phase2対応（グレーアウト表示）
  image: <FileText className="h-4 w-4 text-gray-400" />,
  video: <FileText className="h-4 w-4 text-gray-400" />,
  interactive: <FileText className="h-4 w-4 text-gray-400" />
}

const contentTypeLabels: { [key: string]: string } = {
  text: 'テキスト',
  example: '事例',
  key_points: '重要ポイント',
  // Phase2対応（グレーアウト表示）
  image: '画像 (Phase2)',
  video: '動画 (Phase2)',
  interactive: 'インタラクティブ (Phase2)'
}

const sessionTypeLabels = {
  knowledge: '知識定着型',
  practice: '実践応用型',
  case_study: '事例学習型'
}

export function CourseStructureView({
  course,
  onEditGenre,
  onDeleteGenre,
  onAddGenre,
  onEditTheme,
  onDeleteTheme,
  onAddTheme,
  onEditSession,
  onDeleteSession,
  onAddSession,
  onEditContent,
  onDeleteContent,
  onAddContent,
  onEditQuiz,
  onDeleteQuiz,
  onAddQuiz
}: CourseStructureViewProps) {
  if (!course) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">コース情報を読み込んでいます...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Phase1-3仕様表示 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-3">
          <div className="text-blue-600 font-semibold">📋 段階的実装仕様（COURSE_LEARNING_CONTENT_ARCHITECTURE準拠）</div>
        </div>
        
        {/* Phase 1: 現在の制約 */}
        <div className="mb-3">
          <div className="text-blue-800 font-medium mb-1">🔵 Phase 1: 基盤強化・既存不具合修正（現在）</div>
          <div className="text-xs text-blue-700 grid grid-cols-1 md:grid-cols-3 gap-2">
            <div><strong>セッション:</strong> knowledge, practice, case_study</div>
            <div><strong>コンテンツ:</strong> text, example, key_points (139件保持)</div>
            <div><strong>クイズ:</strong> single_choice, multiple_choice (1セッション1問・56件保持)</div>
          </div>
        </div>

        {/* Phase 2: 機能拡張 */}
        <div className="mb-3">
          <div className="text-green-700 font-medium mb-1">🟢 Phase 2: 機能拡張・制約解除（予定）</div>
          <div className="text-xs text-green-600 grid grid-cols-1 md:grid-cols-3 gap-2">
            <div><strong>セッション:</strong> + review（復習・スペースドリピティション）</div>
            <div><strong>コンテンツ:</strong> + image, video（マルチメディア対応）</div>
            <div><strong>クイズ:</strong> + true_false, sorting（複数問対応・制約解除）</div>
          </div>
        </div>

        {/* Phase 3: 高度機能 */}
        <div>
          <div className="text-purple-700 font-medium mb-1">🟣 Phase 3: 高度機能・AI採点（将来）</div>
          <div className="text-xs text-purple-600 grid grid-cols-1 md:grid-cols-3 gap-2">
            <div><strong>セッション:</strong> + assessment（総合評価・認定試験）</div>
            <div><strong>コンテンツ:</strong> + interactive（ドラッグ&ドロップ・シミュレーション）</div>
            <div><strong>クイズ:</strong> + fill_blank, essay（AI採点・記述問題）</div>
          </div>
        </div>
      </div>

      {/* コース階層 */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <BookOpen className="h-5 w-5 text-purple-600" />
          <h2 className="text-lg font-semibold">{course.title}</h2>
          <span className="text-sm text-muted-foreground">
            ({course.estimated_days}日間)
          </span>
        </div>
      </div>

      {/* ジャンル階層 */}
      <div className="space-y-4">
        {(course.genres || []).map((genre) => (
          <div key={`genre-${genre.id}`}>
          <div className="border rounded-lg p-4 ml-4 bg-gray-50">
            {/* ジャンルヘッダー */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <FolderOpen className="h-5 w-5 text-blue-600" />
                <span className="font-medium">{genre.title}</span>
                <span className="text-sm text-muted-foreground">
                  ({genre.estimated_days}日間)
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEditGenre(genre)}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  編集
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDeleteGenre(genre.id, genre.title)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  削除
                </Button>
              </div>
            </div>

            {/* テーマ階層 */}
            <div className="space-y-3">
              {genre.themes.map((theme) => (
                <div key={theme.id} className="border rounded-lg p-4 ml-4 bg-white">
                  {/* テーマヘッダー */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <BookOpenText className="h-4 w-4 text-green-600" />
                      <span className="font-medium">{theme.title}</span>
                      <span className="text-sm text-muted-foreground">
                        ({theme.estimated_minutes}分)
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditTheme(theme, genre.id)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        編集
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDeleteTheme(theme.id, theme.title)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        削除
                      </Button>
                    </div>
                  </div>

                  {/* セッション階層 */}
                  <div className="space-y-3">
                    {theme.sessions.map((session) => (
                      <div key={session.id} className="border rounded-lg p-3 ml-4 bg-gray-50">
                        {/* セッションヘッダー */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-orange-600" />
                            <span className="font-medium">{session.title}</span>
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                              {sessionTypeLabels[session.session_type as keyof typeof sessionTypeLabels] || session.session_type}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              ({session.estimated_minutes}分)
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onEditSession(session, theme.id)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              編集
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onDeleteSession(session.id, session.title)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              削除
                            </Button>
                          </div>
                        </div>

                        {/* コンテンツ階層 */}
                        <div className="space-y-2 mb-3">
                          {session.contents.map((content) => (
                            <div key={content.id} className="flex items-center justify-between p-2 ml-4 bg-white rounded border">
                              <div className="flex items-center space-x-2">
                                {contentTypeIcons[content.content_type as keyof typeof contentTypeIcons] || <FileText className="h-4 w-4 text-gray-600" />}
                                <span className="text-sm">
                                  {contentTypeLabels[content.content_type as keyof typeof contentTypeLabels] || content.content_type}: {content.title || 'タイトルなし'}
                                </span>
                                {content.duration && (
                                  <span className="text-xs text-muted-foreground">
                                    ({content.duration}分)
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onEditContent(content, session.id)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onDeleteContent(content.id, content.title || 'コンテンツ')}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* クイズ階層 */}
                        <div className="space-y-2 mb-3">
                          {session.quizzes.map((quiz) => (
                            <div key={quiz.id} className="flex items-center justify-between p-2 ml-4 bg-white rounded border">
                              <div className="flex items-center space-x-2">
                                <HelpCircle className="h-4 w-4 text-purple-600" />
                                <span className="text-sm">
                                  <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded mr-2">
                                    {quiz.quiz_type === 'single_choice' ? 'single_choice' : `${quiz.quiz_type} (Phase2)`}
                                  </span>
                                  {quiz.question.substring(0, 30)}...
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onEditQuiz(quiz, session.id)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onDeleteQuiz(quiz.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* セッション内追加ボタン（左寄せ・小さめ） */}
                        <div className="flex items-center space-x-2 ml-4 pt-2 border-t border-gray-200">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onAddContent(session.id)}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            コンテンツ追加
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onAddQuiz(session.id)}
                            className="text-purple-600 border-purple-200 hover:bg-purple-50 text-xs"
                            disabled={session.quizzes.length >= 1}
                            title={session.quizzes.length >= 1 ? "Phase1制限: 1セッション1クイズまで" : ""}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            クイズ追加 {session.quizzes.length >= 1 && "(制限)"}
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {/* セッション追加ボタン（テーマ内・下部・中央） */}
                    <div className="mt-4 pt-3 border-t border-green-200 text-center">
                      <Button
                        variant="outline"
                        onClick={() => onAddSession(theme.id)}
                        className="text-orange-600 border-orange-300 hover:bg-orange-50 font-medium"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        このテーマにセッション追加
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* テーマ追加ボタン（ジャンル内・下部・中央） */}
              <div className="mt-4 pt-3 border-t border-blue-200 text-center">
                <Button
                  variant="outline"
                  onClick={() => onAddTheme(genre.id)}
                  className="text-green-600 border-green-300 hover:bg-green-50 font-medium"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  このジャンルにテーマ追加
                </Button>
              </div>
            </div>
          </div>
          </div>
        ))}

        {/* ジャンル追加ボタン */}
        <div className="ml-4">
          <Button
            variant="outline"
            onClick={onAddGenre}
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <Plus className="h-3 w-3 mr-1" />
            ジャンル追加
          </Button>
        </div>
      </div>
    </div>
  )
}