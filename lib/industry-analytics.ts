// Industry-Specific Skill Analysis
// Provides industry-focused analytics and skill assessment

import { mainCategories, industryCategories, skillLevels } from './categories-backup'

export interface IndustrySkillProfile {
  industryId: string
  industryName: string
  skillAreas: SkillArea[]
  overallScore: number
  recommendations: string[]
  nextActions: string[]
}

export interface SkillArea {
  categoryId: string
  categoryName: string
  currentLevel: string
  targetLevel: string
  score: number
  progress: number
  importance: number // 1-5 scale for this industry
}

export interface RadarChartData {
  labels: string[]
  datasets: Array<{
    label: string
    data: number[]
    backgroundColor: string
    borderColor: string
    pointBackgroundColor: string
  }>
}

export interface SkillGapAnalysis {
  criticalGaps: Array<{
    skill: string
    currentLevel: number
    targetLevel: number
    gapSize: number
    priority: 'high' | 'medium' | 'low'
  }>
  strengthAreas: Array<{
    skill: string
    level: number
    advantage: string
  }>
  developmentPath: Array<{
    phase: number
    duration: string
    skills: string[]
    milestones: string[]
  }>
}

// Industry-specific skill weight mappings
const INDUSTRY_SKILL_WEIGHTS = {
  consulting: {
    'communication_presentation': 5,
    'analytical_problem_solving': 5,
    'leadership_management': 4,
    'business_strategy': 5,
    'marketing_sales': 3,
    'leadership_hr': 3,
    'ai_digital_utilization': 4,
    'project_operations': 4,
    'business_process_analysis': 5,
    'risk_crisis_management': 3
  },
  it_si: {
    'communication_presentation': 3,
    'analytical_problem_solving': 5,
    'leadership_management': 4,
    'business_strategy': 3,
    'marketing_sales': 2,
    'leadership_hr': 3,
    'ai_digital_utilization': 5,
    'project_operations': 5,
    'business_process_analysis': 4,
    'risk_crisis_management': 4
  },
  manufacturing: {
    'communication_presentation': 3,
    'analytical_problem_solving': 4,
    'leadership_management': 4,
    'business_strategy': 4,
    'marketing_sales': 3,
    'leadership_hr': 4,
    'ai_digital_utilization': 4,
    'project_operations': 5,
    'business_process_analysis': 5,
    'risk_crisis_management': 5
  },
  finance: {
    'communication_presentation': 4,
    'analytical_problem_solving': 5,
    'leadership_management': 3,
    'business_strategy': 4,
    'marketing_sales': 3,
    'leadership_hr': 2,
    'ai_digital_utilization': 3,
    'project_operations': 3,
    'business_process_analysis': 4,
    'risk_crisis_management': 5
  },
  healthcare: {
    'communication_presentation': 4,
    'analytical_problem_solving': 4,
    'leadership_management': 4,
    'business_strategy': 3,
    'marketing_sales': 2,
    'leadership_hr': 4,
    'ai_digital_utilization': 3,
    'project_operations': 4,
    'business_process_analysis': 4,
    'risk_crisis_management': 5
  }
}

class IndustryAnalytics {
  
  // Analyze skills for a specific industry
  async analyzeIndustrySkills(
    userId: string, 
    industryId: string, 
    progressData: unknown[]
  ): Promise<IndustrySkillProfile> {
    const industry = industryCategories.find(ind => ind.id === industryId)
    if (!industry) {
      throw new Error(`Industry not found: ${industryId}`)
    }

    const skillWeights = INDUSTRY_SKILL_WEIGHTS[industryId as keyof typeof INDUSTRY_SKILL_WEIGHTS] || {}
    const skillAreas = this.calculateSkillAreas(progressData, skillWeights)
    const overallScore = this.calculateOverallScore(skillAreas)
    
    return {
      industryId,
      industryName: industry.name,
      skillAreas,
      overallScore,
      recommendations: this.generateRecommendations(skillAreas, industryId),
      nextActions: this.generateNextActions(skillAreas, industryId)
    }
  }

  private calculateSkillAreas(progressData: unknown[], skillWeights: Record<string, number>): SkillArea[] {
    const skillAreas: SkillArea[] = []

    mainCategories.forEach(category => {
      const categoryProgress = progressData.filter(p => 
        p.category === category.id || 
        p.courseId === category.id
      )

      const score = this.calculateCategoryScore(categoryProgress)
      const currentLevel = this.assessSkillLevel(score)
      const importance = skillWeights[category.id] || 3

      skillAreas.push({
        categoryId: category.id,
        categoryName: category.name,
        currentLevel,
        targetLevel: this.getTargetLevel(importance),
        score,
        progress: categoryProgress.length > 0 ? (categoryProgress.filter((p: unknown) => p.isCorrect).length / categoryProgress.length) * 100 : 0,
        importance
      })
    })

    return skillAreas.sort((a, b) => b.importance - a.importance)
  }

  private calculateCategoryScore(categoryProgress: unknown[]): number {
    if (categoryProgress.length === 0) return 0
    
    const correctAnswers = categoryProgress.filter(p => p.isCorrect).length
    const accuracy = correctAnswers / categoryProgress.length
    const volumeBonus = Math.min(categoryProgress.length / 20, 1) // Bonus for more practice
    
    return Math.round((accuracy * 70 + volumeBonus * 30))
  }

  private assessSkillLevel(score: number): string {
    if (score >= 90) return 'expert'
    if (score >= 75) return 'advanced'
    if (score >= 60) return 'intermediate'
    if (score >= 40) return 'basic'
    return 'novice'
  }

  private getTargetLevel(importance: number): string {
    switch (importance) {
      case 5: return 'expert'
      case 4: return 'advanced'
      case 3: return 'intermediate'
      default: return 'basic'
    }
  }

  private calculateOverallScore(skillAreas: SkillArea[]): number {
    const weightedSum = skillAreas.reduce((sum, area) => 
      sum + (area.score * area.importance), 0
    )
    const totalWeight = skillAreas.reduce((sum, area) => sum + area.importance, 0)
    
    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0
  }

  private generateRecommendations(skillAreas: SkillArea[], industryId: string): string[] {
    const recommendations: string[] = []
    const weakAreas = skillAreas.filter(area => 
      area.score < 60 && area.importance >= 4
    )
    const strongAreas = skillAreas.filter(area => 
      area.score >= 80 && area.importance >= 3
    )

    // Industry-specific recommendations
    switch (industryId) {
      case 'consulting':
        if (weakAreas.some(area => area.categoryId === 'analytical_problem_solving')) {
          recommendations.push('論理的思考力とフレームワーク活用スキルの強化が急務です')
        }
        if (weakAreas.some(area => area.categoryId === 'communication_presentation')) {
          recommendations.push('クライアント向けプレゼンテーション能力の向上に注力しましょう')
        }
        break
        
      case 'it_si':
        if (weakAreas.some(area => area.categoryId === 'ai_digital_utilization')) {
          recommendations.push('最新のAI・デジタル技術への理解を深めることが重要です')
        }
        if (weakAreas.some(area => area.categoryId === 'project_operations')) {
          recommendations.push('アジャイル開発やプロジェクト管理手法の習得をお勧めします')
        }
        break
        
      case 'manufacturing':
        if (weakAreas.some(area => area.categoryId === 'business_process_analysis')) {
          recommendations.push('製造プロセスの最適化と業務改善スキルの向上が必要です')
        }
        if (weakAreas.some(area => area.categoryId === 'risk_crisis_management')) {
          recommendations.push('品質管理とリスク対応能力の強化が重要です')
        }
        break
    }

    // Strong areas leverage
    if (strongAreas.length > 0) {
      recommendations.push(`${strongAreas[0].categoryName}の強みを活かして他の分野でもリーダーシップを発揮しましょう`)
    }

    // Generic recommendations based on gaps
    if (weakAreas.length > 2) {
      recommendations.push('基礎スキルの体系的な学習プランの策定をお勧めします')
    }

    return recommendations
  }

  private generateNextActions(skillAreas: SkillArea[], industryId: string): string[] {
    const actions: string[] = []
    const priorityAreas = skillAreas
      .filter(area => area.importance >= 4 && area.score < 70)
      .slice(0, 3)

    priorityAreas.forEach(area => {
      actions.push(`${area.categoryName}の学習セッションを重点的に取り組む`)
    })

    // Industry-specific actions
    switch (industryId) {
      case 'consulting':
        actions.push('ケーススタディを活用した実践的な問題解決練習')
        actions.push('プレゼンテーション技術の反復練習')
        break
        
      case 'it_si':
        actions.push('最新技術トレンドの継続的なキャッチアップ')
        actions.push('実際のプロジェクトでの実践経験の積み重ね')
        break
        
      case 'manufacturing':
        actions.push('製造現場での実地見学と課題発見')
        actions.push('品質管理手法の実践的な学習')
        break
    }

    return actions
  }

  // Generate radar chart data for skill visualization
  generateRadarChartData(skillProfile: IndustrySkillProfile): RadarChartData {
    const labels = skillProfile.skillAreas
      .slice(0, 8) // Top 8 skills for readability
      .map(area => this.shortenCategoryName(area.categoryName))

    const currentScores = skillProfile.skillAreas
      .slice(0, 8)
      .map(area => area.score)

    const targetScores = skillProfile.skillAreas
      .slice(0, 8)
      .map(area => this.getTargetScore(area.targetLevel))

    return {
      labels,
      datasets: [
        {
          label: '現在のスキル',
          data: currentScores,
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgb(59, 130, 246)',
          pointBackgroundColor: 'rgb(59, 130, 246)'
        },
        {
          label: '目標レベル',
          data: targetScores,
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          borderColor: 'rgb(16, 185, 129)',
          pointBackgroundColor: 'rgb(16, 185, 129)'
        }
      ]
    }
  }

  private shortenCategoryName(name: string): string {
    const shortNames: Record<string, string> = {
      'コミュニケーション・プレゼン': 'コミュニケーション',
      '分析的問題解決': '問題解決',
      'リーダーシップ・マネジメント': 'リーダーシップ',
      'ビジネス戦略・企画': '戦略企画',
      'マーケティング・営業': 'マーケティング',
      'リーダーシップ・人事': '人事管理',
      'AI・デジタル活用': 'AI・デジタル',
      'プロジェクト・業務管理': 'プロジェクト管理',
      'ビジネスプロセス・業務分析': 'プロセス分析',
      'リスク・危機管理': 'リスク管理'
    }
    
    return shortNames[name] || name
  }

  private getTargetScore(targetLevel: string): number {
    switch (targetLevel) {
      case 'expert': return 95
      case 'advanced': return 85
      case 'intermediate': return 70
      case 'basic': return 55
      default: return 40
    }
  }

  // Perform skill gap analysis
  analyzeSkillGaps(skillProfile: IndustrySkillProfile): SkillGapAnalysis {
    const criticalGaps = skillProfile.skillAreas
      .filter(area => area.importance >= 4)
      .map(area => {
        const currentLevel = this.levelToNumber(area.currentLevel)
        const targetLevel = this.levelToNumber(area.targetLevel)
        const gapSize = targetLevel - currentLevel
        
        return {
          skill: area.categoryName,
          currentLevel,
          targetLevel,
          gapSize,
          priority: this.assessPriority(gapSize, area.importance)
        }
      })
      .filter(gap => gap.gapSize > 0)
      .sort((a, b) => b.gapSize - a.gapSize)

    const strengthAreas = skillProfile.skillAreas
      .filter(area => area.score >= 80)
      .map(area => ({
        skill: area.categoryName,
        level: area.score,
        advantage: this.getAdvantageDescription(area.categoryName, area.score)
      }))

    const developmentPath = this.createDevelopmentPath(criticalGaps)

    return {
      criticalGaps,
      strengthAreas,
      developmentPath
    }
  }

  private levelToNumber(level: string): number {
    switch (level) {
      case 'expert': return 5
      case 'advanced': return 4
      case 'intermediate': return 3
      case 'basic': return 2
      case 'novice': return 1
      default: return 1
    }
  }

  private assessPriority(gapSize: number, importance: number): 'high' | 'medium' | 'low' {
    const priorityScore = gapSize * importance
    
    if (priorityScore >= 12) return 'high'
    if (priorityScore >= 8) return 'medium'
    return 'low'
  }

  private getAdvantageDescription(skill: string, score: number): string {
    const advantages: Record<string, string> = {
      'コミュニケーション・プレゼン': '優れた説得力と影響力を持ち、チームや顧客との関係構築に長けています',
      '分析的問題解決': '複雑な課題を論理的に分解し、効果的な解決策を導き出すことができます',
      'リーダーシップ・マネジメント': 'チームを効果的に導き、組織の目標達成に貢献することができます',
      'ビジネス戦略・企画': '市場動向を的確に把握し、戦略的な意思決定を行うことができます'
    }
    
    return advantages[skill] || `${skill}分野で高い専門性を発揮できます`
  }

  private createDevelopmentPath(criticalGaps: unknown[]): Array<{
    phase: number
    duration: string
    skills: string[]
    milestones: string[]
  }> {
    const highPriorityGaps = criticalGaps.filter(gap => gap.priority === 'high')
    const mediumPriorityGaps = criticalGaps.filter(gap => gap.priority === 'medium')
    
    const path = []

    if (highPriorityGaps.length > 0) {
      path.push({
        phase: 1,
        duration: '3ヶ月',
        skills: highPriorityGaps.slice(0, 2).map(gap => gap.skill),
        milestones: [
          '基礎概念の理解と実践',
          '実際の業務での応用',
          '中級レベルの習得'
        ]
      })
    }

    if (mediumPriorityGaps.length > 0 || highPriorityGaps.length > 2) {
      path.push({
        phase: 2,
        duration: '6ヶ月',
        skills: [
          ...highPriorityGaps.slice(2).map(gap => gap.skill),
          ...mediumPriorityGaps.slice(0, 2).map(gap => gap.skill)
        ],
        milestones: [
          '応用スキルの開発',
          'プロジェクトでの実践',
          '上級レベルへの準備'
        ]
      })
    }

    if (path.length > 0) {
      path.push({
        phase: path.length + 1,
        duration: '継続',
        skills: ['全スキル領域'],
        milestones: [
          '継続的な改善',
          '業界エキスパートレベル',
          '他者への指導・メンタリング'
        ]
      })
    }

    return path
  }

  // Get available industries
  getAvailableIndustries() {
    return [
      ...industryCategories,
      {
        id: 'finance',
        name: '金融業界',
        description: '金融・銀行・保険業界特化',
        type: 'industry' as const,
        displayOrder: 4,
        subcategories: ['risk_analysis', 'regulatory_compliance', 'financial_products'],
        icon: '💰',
        color: '#F59E0B'
      },
      {
        id: 'healthcare',
        name: 'ヘルスケア業界',
        description: '医療・製薬・健康関連業界特化',
        type: 'industry' as const,
        displayOrder: 5,
        subcategories: ['patient_care', 'regulatory_affairs', 'medical_technology'],
        icon: '🏥',
        color: '#EF4444'
      }
    ]
  }
}

export const industryAnalytics = new IndustryAnalytics()