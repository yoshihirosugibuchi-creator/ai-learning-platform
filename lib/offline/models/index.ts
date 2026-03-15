/**
 * WatermelonDB モデル一覧
 * database.ts の modelClasses に渡す
 */
import { QuizQuestion, QuizPack, SessionQuiz, PrecomputedQuizSet, QuizSession, QuizAnswer } from './quiz'
import {
  CaseStudyProblem,
  CaseStudyStep,
  CaseStudyRubricAxis,
  CaseStudyOption,
  CaseStudyCourseLink,
  CaseStudySession,
  CaseStudyStepDetail,
  CaseStudyThinkingLog,
} from './case-study'
import {
  LearningCourse,
  LearningGenre,
  LearningTheme,
  LearningSession,
  SessionContent,
  CourseSessionCompletion,
} from './learning'
import { WisdomCard, WisdomCardCollection, UserKnowledgeCollectionV2 } from './collection'
import { SkillLevel, Category, Subcategory, XpLevelSkpSetting } from './master'
import { UserXpStatsV2, DailyXpRecord } from './user-stats'
import { UserChallengeSelection } from './challenge'

// Database.modelClasses に渡す配列
export const models = [
  // マスタデータ: クイズ
  QuizQuestion,
  QuizPack,
  SessionQuiz,
  // マスタデータ: ケーススタディ
  CaseStudyProblem,
  CaseStudyStep,
  CaseStudyRubricAxis,
  CaseStudyOption,
  CaseStudyCourseLink,
  // マスタデータ: 学習コンテンツ
  LearningCourse,
  LearningGenre,
  LearningTheme,
  LearningSession,
  SessionContent,
  // マスタデータ: デコード・lookup
  SkillLevel,
  Category,
  Subcategory,
  XpLevelSkpSetting,
  // マスタデータ: コレクション
  WisdomCard,
  // ユーザーデータ: クイズ
  PrecomputedQuizSet,
  QuizSession,
  QuizAnswer,
  // ユーザーデータ: ケーススタディ
  CaseStudySession,
  CaseStudyStepDetail,
  CaseStudyThinkingLog,
  // ユーザーデータ: コレクション
  WisdomCardCollection,
  UserKnowledgeCollectionV2,
  // ユーザーデータ: ダッシュボード
  UserChallengeSelection,
  // ユーザーデータ: 統計・進捗
  UserXpStatsV2,
  DailyXpRecord,
  CourseSessionCompletion,
]

// 名前付きエクスポート
export {
  // クイズ
  QuizQuestion,
  QuizPack,
  SessionQuiz,
  PrecomputedQuizSet,
  QuizSession,
  QuizAnswer,
  // ケーススタディ
  CaseStudyProblem,
  CaseStudyStep,
  CaseStudyRubricAxis,
  CaseStudyOption,
  CaseStudyCourseLink,
  CaseStudySession,
  CaseStudyStepDetail,
  CaseStudyThinkingLog,
  // 学習
  LearningCourse,
  LearningGenre,
  LearningTheme,
  LearningSession,
  SessionContent,
  CourseSessionCompletion,
  // コレクション
  WisdomCard,
  WisdomCardCollection,
  UserKnowledgeCollectionV2,
  // マスタ
  SkillLevel,
  Category,
  Subcategory,
  XpLevelSkpSetting,
  // ダッシュボード
  UserChallengeSelection,
  // 統計
  UserXpStatsV2,
  DailyXpRecord,
}
