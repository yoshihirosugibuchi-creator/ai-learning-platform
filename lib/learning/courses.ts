import { LearningCourse } from '@/lib/types/learning'

/**
 * 学習コンテンツ - MVPコース定義
 */

export const learningCourses: LearningCourse[] = [
  // 1. コンサル思考法基礎コース
  {
    id: 'consulting_thinking_basics',
    title: 'コンサル思考法基礎コース',
    description: '論理的思考とフレームワーク活用で問題解決力を身につける',
    estimatedDays: 14,
    difficulty: 'basic',
    icon: '🧠',
    color: '#6366F1',
    displayOrder: 1,
    genres: [
      {
        id: 'thinking_foundation',
        title: '思考の基盤',
        description: '論理的思考の基本原則とコンサル特有の思考法',
        categoryId: 'logical_thinking_problem_solving',
        subcategoryId: '構造化思考（MECE・ロジックツリー）',
        estimatedDays: 6,
        displayOrder: 1,
        badge: {
          id: 'thinking_foundation_badge',
          title: '論理思考マスター',
          description: '構造化思考と論理的思考の基礎を習得',
          icon: '🧩',
          color: '#8B5CF6'
        },
        themes: [
          {
            id: 'conclusion_first',
            title: '結論ファースト',
            description: '結論から話す思考法とコミュニケーション技術',
            estimatedMinutes: 9,
            displayOrder: 1,
            rewardCard: {
              id: 'conclusion_first_card',
              title: '結論ファースト',
              summary: 'まず結論、その後に根拠という情報構造でコミュニケーションの効率を上げる手法',
              keyPoints: [
                'PREP法（Point・Reason・Example・Point）の活用',
                '聞き手の理解負荷を軽減',
                '説得力のあるプレゼンテーション'
              ],
              icon: '🎯',
              color: '#3B82F6'
            },
            sessions: [
              {
                id: 'conclusion_first_basics',
                title: '結論ファーストの基本',
                estimatedMinutes: 3,
                type: 'knowledge',
                displayOrder: 1,
                content: [
                  {
                    id: 'cf_concept',
                    type: 'text',
                    title: '結論ファーストとは',
                    content: '結論ファーストとは、話の冒頭で結論や要点を明確に示し、その後に詳細な説明や根拠を提示するコミュニケーション手法です。ビジネスの現場では限られた時間で効率的に情報を伝える必要があり、この手法により聞き手の理解を促進できます。',
                    duration: 1,
                    displayOrder: 1
                  },
                  {
                    id: 'cf_structure',
                    type: 'key_points',
                    title: 'PREP法の構造',
                    content: 'Point（結論）→ Reason（理由）→ Example（具体例）→ Point（結論の再確認）',
                    displayOrder: 2
                  },
                  {
                    id: 'cf_example',
                    type: 'example',
                    title: '実例：業務報告での活用',
                    content: '【悪い例】「今月の売上についてですが、様々な要因があって...（長い説明）...結果として目標を10%上回りました」\n【良い例】「今月の売上は目標を10%上回りました。主な要因は新商品の好調な売れ行きと既存顧客のリピート率向上です。具体的には...」',
                    duration: 1,
                    displayOrder: 3
                  }
                ],
                quiz: [
                  {
                    id: 'cf_quiz_1',
                    question: 'PREP法における「P」が最初と最後に来る理由として最も適切なものは？',
                    options: [
                      '強調効果を高めるため',
                      '聞き手の注意を引き、理解を確実にするため',
                      '覚えやすくするため',
                      '時間を稼ぐため'
                    ],
                    correct: 1,
                    explanation: '最初のPで聞き手の注意を引いて要点を明確にし、最後のPで理解を確実にして印象に残すことが目的です。',
                    type: 'single_choice'
                  }
                ]
              },
              {
                id: 'conclusion_first_practice',
                title: '結論ファースト実践ワーク',
                estimatedMinutes: 3,
                type: 'practice',
                displayOrder: 2,
                content: [
                  {
                    id: 'cf_practice_scenario',
                    type: 'text',
                    title: '実践シナリオ',
                    content: 'あなたは営業部のメンバーで、上司に今四半期の営業活動報告をする場面です。以下の情報を結論ファーストで整理してください：\n・新規顧客5社と契約締結\n・既存顧客からの追加注文が20%増加\n・競合他社の価格攻勢により一部案件が失注\n・全体として売上目標の108%を達成',
                    duration: 1,
                    displayOrder: 1
                  },
                  {
                    id: 'cf_practice_structure',
                    type: 'key_points',
                    title: '整理のポイント',
                    content: '1. 最重要の結論を特定\n2. 根拠を重要度順に整理\n3. 具体例で説得力を強化\n4. 最後に結論を再確認',
                    displayOrder: 2
                  }
                ],
                quiz: [
                  {
                    id: 'cf_practice_quiz',
                    question: '上記のシナリオで最初に述べるべき結論として最も適切なものは？',
                    options: [
                      '新規顧客を5社獲得しました',
                      '今四半期の売上目標を108%達成しました',
                      '競合の価格攻勢に苦戦しています',
                      '既存顧客からの注文が増えています'
                    ],
                    correct: 1,
                    explanation: '最も重要で聞き手が知りたい全体結果から始めることで、その後の詳細説明の文脈が明確になります。',
                    type: 'single_choice'
                  }
                ]
              },
              {
                id: 'conclusion_first_application',
                title: '応用事例とコツ',
                estimatedMinutes: 3,
                type: 'case_study',
                displayOrder: 3,
                content: [
                  {
                    id: 'cf_case_mckinsey',
                    type: 'example',
                    title: 'コンサルティング現場での事例',
                    content: 'マッキンゼーの新人コンサルタントが学ぶ「エレベーターテスト」：エレベーターで偶然会った役員に30秒で重要な提案を伝えられるか？この訓練により結論ファーストが徹底される。',
                    duration: 1,
                    displayOrder: 1
                  },
                  {
                    id: 'cf_tips',
                    type: 'key_points',
                    title: '実践のコツ',
                    content: '• 「結論から申し上げますと」「要点は3つあります」など導入フレーズを活用\n• 複数のポイントがある場合は番号を振る\n• 聞き手の反応を見て詳細レベルを調整\n• 質問時間を確保するため簡潔に',
                    duration: 2,
                    displayOrder: 2
                  }
                ],
                quiz: [
                  {
                    id: 'cf_application_quiz',
                    question: '結論ファーストが特に効果的な場面として最も適切でないものは？',
                    options: [
                      '忙しい上司への報告',
                      '顧客へのプレゼンテーション',
                      '友人との雑談',
                      '会議での提案'
                    ],
                    correct: 2,
                    explanation: '友人との雑談では効率性より親密さや楽しさが重視されるため、必ずしも結論ファーストが適切とは限りません。',
                    type: 'single_choice'
                  }
                ]
              }
            ]
          },
          {
            id: 'mece_thinking',
            title: 'MECE思考',
            description: '漏れなく重複なく整理する思考技術',
            estimatedMinutes: 9,
            displayOrder: 2,
            rewardCard: {
              id: 'mece_thinking_card',
              title: 'MECE思考',
              summary: '複雑な問題を「漏れなく重複なく」整理して全体像を把握する思考技術',
              keyPoints: [
                'Mutually Exclusive（重複なく）',
                'Collectively Exhaustive（漏れなく）',
                '問題の全体像把握と優先順位付け'
              ],
              icon: '📊',
              color: '#10B981'
            },
            sessions: [
              {
                id: 'mece_basics',
                title: 'MECE思考の基本',
                estimatedMinutes: 3,
                type: 'knowledge',
                displayOrder: 1,
                content: [
                  {
                    id: 'mece_concept',
                    type: 'text',
                    title: 'MECEとは',
                    content: 'MECE（ミーシー）とは、Mutually Exclusive and Collectively Exhaustiveの略で、「相互に排他的で、全体として漏れがない」という意味です。問題や情報を整理する際の基本原則で、複雑な事象を体系的に理解するために不可欠な思考技術です。',
                    duration: 1,
                    displayOrder: 1
                  },
                  {
                    id: 'mece_benefits',
                    type: 'key_points',
                    title: 'MECE思考の効果',
                    content: '• 問題の全体像を漏れなく把握\n• 重複した作業や分析を回避\n• 優先順位の明確化\n• チーム内での認識統一',
                    displayOrder: 2
                  },
                  {
                    id: 'mece_example',
                    type: 'example',
                    title: '日常での活用例',
                    content: '【売上低下の原因分析】\n❌悪い例: 「価格が高い、営業が弱い、商品力不足、宣伝不足、価格競争」（価格の重複）\n✅良い例: 「商品力（機能・デザイン）」「価格競争力」「販売力（営業・チャネル）」「マーケティング（認知・ブランド）」',
                    duration: 1,
                    displayOrder: 3
                  }
                ],
                quiz: [
                  {
                    id: 'mece_quiz_1',
                    question: 'MECEの「CE」が意味するものは？',
                    options: [
                      '完全排他的',
                      '包括的網羅性',
                      '効率的実行',
                      '継続的改善'
                    ],
                    correct: 1,
                    explanation: 'CE = Collectively Exhaustive（包括的網羅性）で、全体を漏れなく覆っているという意味です。',
                    type: 'single_choice'
                  }
                ]
              },
              {
                id: 'mece_practice',
                title: 'MECE実践ワーク',
                estimatedMinutes: 3,
                type: 'practice',
                displayOrder: 2,
                content: [
                  {
                    id: 'mece_practice_scenario',
                    type: 'text',
                    title: '実践課題：新規事業検討',
                    content: 'あなたの会社が新規事業を検討する際の分析項目をMECEで整理してください。以下の要素を重複なく漏れなく分類しましょう：市場規模、競合状況、技術的実現性、収益性、リスク、投資額、人材確保、法規制、タイミング、自社の強み活用',
                    duration: 1,
                    displayOrder: 1
                  },
                  {
                    id: 'mece_framework_hint',
                    type: 'key_points',
                    title: '整理のフレームワーク例',
                    content: '• 市場環境（外部要因）vs 社内要因（内部要因）\n• 定量的要因 vs 定性的要因\n• 現在の状況 vs 将来の予測',
                    displayOrder: 2
                  }
                ],
                quiz: [
                  {
                    id: 'mece_practice_quiz',
                    question: '「市場規模」「競合状況」「法規制」はどのMECE分類が最も適切？',
                    options: [
                      '社内要因',
                      '市場環境（外部要因）',
                      '定量的要因',
                      '将来予測'
                    ],
                    correct: 1,
                    explanation: 'これらは全て自社の外部環境に関する要因であり、市場環境（外部要因）として分類するのが適切です。',
                    type: 'single_choice'
                  }
                ]
              },
              {
                id: 'mece_advanced',
                title: 'MECE応用とピラミッド構造',
                estimatedMinutes: 3,
                type: 'case_study',
                displayOrder: 3,
                content: [
                  {
                    id: 'pyramid_structure',
                    type: 'text',
                    title: 'ピラミッドストラクチャー',
                    content: 'MECEは単独で使うだけでなく、階層的に適用することで「ピラミッドストラクチャー」を構築できます。最上位の結論から、MECEに分解された複数の論点、さらにその下位にMECEな根拠を配置することで、論理的で説得力のある構造を作れます。',
                    duration: 2,
                    displayOrder: 1
                  },
                  {
                    id: 'mece_pitfalls',
                    type: 'key_points',
                    title: 'よくある間違い',
                    content: '• 完璧を求めすぎて分析が進まない\n• 形式的なMECEにこだわり本質を見失う\n• 分類の粒度が揃っていない\n• 相手に伝わらない専門的な分類',
                    duration: 1,
                    displayOrder: 2
                  }
                ],
                quiz: [
                  {
                    id: 'mece_advanced_quiz',
                    question: 'MECEな分類を作る際に最も重要なことは？',
                    options: [
                      '完璧な分類体系を作ること',
                      '目的に応じた実用的な分類をすること',
                      '学術的に正確な分類をすること',
                      'できるだけ細かく分類すること'
                    ],
                    correct: 1,
                    explanation: 'MECEは問題解決のツールであり、目的達成に役立つ実用的な分類が最も重要です。',
                    type: 'single_choice'
                  }
                ]
              }
            ]
          },
          {
            id: 'so_what_why_so',
            title: 'So What?/Why So?',
            description: '深掘りと本質追求の思考技術',
            estimatedMinutes: 9,
            displayOrder: 3,
            rewardCard: {
              id: 'so_what_card',
              title: 'So What?/Why So?',
              summary: '情報の本質を見抜き、deeper insightを得るための質問技術',
              keyPoints: [
                'So What? - それで何が言えるのか？',
                'Why So? - なぜそうなるのか？',
                '表面的な情報から本質的な洞察への変換'
              ],
              icon: '🔍',
              color: '#EF4444'
            },
            sessions: [
              {
                id: 'so_what_basics',
                title: 'So What?/Why So?の基本',
                estimatedMinutes: 3,
                type: 'knowledge',
                displayOrder: 1,
                content: [
                  {
                    id: 'so_what_concept',
                    type: 'text',
                    title: '深掘り思考の重要性',
                    content: 'So What?（それで何が言えるのか？）とWhy So?（なぜそうなるのか？）は、表面的な情報から本質的な洞察を得るための質問技術です。データや事実をただ並べるだけでなく、その意味や背景を深く掘り下げることで、価値ある洞察や提案につなげることができます。',
                    duration: 1,
                    displayOrder: 1
                  },
                  {
                    id: 'so_what_usage',
                    type: 'key_points',
                    title: '2つの質問の使い分け',
                    content: '• So What? - 事実から洞察へ（上位概念・示唆の抽出）\n• Why So? - 現象から原因へ（下位要因・根本原因の探求）\n• 交互に使うことで多角的な分析が可能',
                    displayOrder: 2
                  },
                  {
                    id: 'so_what_example',
                    type: 'example',
                    title: '実例：売上データの分析',
                    content: '【事実】「A商品の売上が前年比20%減少」\n【So What?】→「主力商品の競争力低下により事業基盤が揺らいでいる」\n【Why So?】→「競合の新商品投入」「顧客ニーズの変化」「価格競争力の低下」\n【So What?】→「抜本的な商品戦略見直しが急務」',
                    duration: 1,
                    displayOrder: 3
                  }
                ],
                quiz: [
                  {
                    id: 'so_what_quiz_1',
                    question: '「今四半期の営業利益率が5%改善した」という事実に対する適切な"So What?"は？',
                    options: [
                      '売上が増加した',
                      '効率性向上により競争力が強化された',
                      'コストが削減された',
                      '前年より良い結果だった'
                    ],
                    correct: 1,
                    explanation: 'So What?では事実から得られる洞察や意味を抽出します。効率性向上による競争力強化は本質的な示唆です。',
                    type: 'single_choice'
                  }
                ]
              },
              {
                id: 'so_what_practice',
                title: '深掘り思考実践ワーク',
                estimatedMinutes: 3,
                type: 'practice',
                displayOrder: 2,
                content: [
                  {
                    id: 'deep_thinking_exercise',
                    type: 'text',
                    title: '実践課題：顧客満足度調査結果',
                    content: '以下の調査結果について、So What?とWhy So?を繰り返して深掘りしてください：\n「顧客満足度が85%で業界平均（80%）を上回ったが、リピート率は65%と業界平均（70%）を下回っている」',
                    duration: 1,
                    displayOrder: 1
                  },
                  {
                    id: 'thinking_process',
                    type: 'key_points',
                    title: '分析プロセス',
                    content: '1. 事実の整理と確認\n2. So What?で示唆を抽出\n3. Why So?で原因を探求\n4. さらにSo What?で対策の方向性を導出',
                    displayOrder: 2
                  }
                ],
                quiz: [
                  {
                    id: 'so_what_practice_quiz',
                    question: '上記の状況で最初に問うべき"Why So?"として最も適切なのは？',
                    options: [
                      'なぜ顧客満足度が高いのか？',
                      'なぜ満足度は高いのにリピート率が低いのか？',
                      'なぜ業界平均と差があるのか？',
                      'なぜ調査を実施したのか？'
                    ],
                    correct: 1,
                    explanation: '矛盾する2つの指標（高い満足度vs低いリピート率）の関係性を探ることが最も重要な論点です。',
                    type: 'single_choice'
                  }
                ]
              },
              {
                id: 'so_what_mastery',
                title: '洞察力向上のコツ',
                estimatedMinutes: 3,
                type: 'case_study',
                displayOrder: 3,
                content: [
                  {
                    id: 'insight_techniques',
                    type: 'text',
                    title: '洞察力を高める技法',
                    content: '優れた洞察を得るためには、多角的な視点が重要です。時間軸（過去・現在・未来）、立場の違い（顧客・競合・自社）、レベル感（戦略・戦術・オペレーション）などの切り口から So What?/Why So? を繰り返すことで、表面的でない深い理解が得られます。',
                    duration: 2,
                    displayOrder: 1
                  },
                  {
                    id: 'common_mistakes',
                    type: 'key_points',
                    title: 'よくある間違いと対策',
                    content: '• 事実の言い換えで終わる → 「だから何？」を5回繰り返す\n• 推測と事実を混同 → データで検証できることを明確化\n• 浅い分析で満足 → 「本当にそれだけ？」と自問\n• 一面的な見方 → 複数のステークホルダー視点で検討',
                    duration: 1,
                    displayOrder: 2
                  }
                ],
                quiz: [
                  {
                    id: 'so_what_mastery_quiz',
                    question: '深い洞察を得るために最も重要なことは？',
                    options: [
                      'データを詳細に分析すること',
                      '多角的視点で繰り返し問い直すこと', 
                      '業界知識を豊富に持つこと',
                      '複雑な分析手法を使うこと'
                    ],
                    correct: 1,
                    explanation: '様々な角度から So What?/Why So? を繰り返すことで、表面的でない本質的な洞察が得られます。',
                    type: 'single_choice'
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'framework_application',
        title: 'フレームワーク活用',
        description: '戦略分析に必要な主要フレームワークの理解と応用',
        categoryId: 'strategy_management',
        subcategoryId: '競争戦略・フレームワーク',
        estimatedDays: 8,
        displayOrder: 2,
        badge: {
          id: 'framework_master_badge',
          title: 'フレームワークマスター',
          description: '主要な戦略フレームワークを習得し実践応用できる',
          icon: '🎯',
          color: '#10B981'
        },
        themes: [
          {
            id: '3c_analysis',
            title: '3C分析',
            description: 'Customer・Competitor・Companyの3視点による環境分析',
            estimatedMinutes: 9,
            displayOrder: 1,
            rewardCard: {
              id: '3c_analysis_card',
              title: '3C分析',
              summary: 'Customer（顧客）・Competitor（競合）・Company（自社）の3つの視点から事業環境を分析',
              keyPoints: [
                '顧客ニーズと市場動向の把握',
                '競合他社の戦略と強み弱みの分析',
                '自社の能力と資源の客観的評価'
              ],
              icon: '🎪',
              color: '#3B82F6'
            },
            sessions: [
              {
                id: '3c_basics',
                title: '3C分析の基本',
                estimatedMinutes: 3,
                type: 'knowledge',
                displayOrder: 1,
                content: [
                  {
                    id: '3c_concept',
                    type: 'text',
                    title: '3C分析とは',
                    content: '3C分析は、Customer（顧客・市場）、Competitor（競合）、Company（自社）の3つの視点から事業環境を分析するフレームワークです。マッキンゼーの大前研一氏によって提唱され、戦略立案の基本として広く活用されています。3つのCを包括的に分析することで、成功要因（KSF：Key Success Factor）を特定できます。',
                    duration: 1,
                    displayOrder: 1
                  },
                  {
                    id: '3c_components',
                    type: 'key_points',
                    title: '3Cの構成要素',
                    content: '• Customer: 市場規模、顧客ニーズ、購買行動、市場成長性\n• Competitor: 競合他社の戦略、強み・弱み、市場シェア\n• Company: 自社の経営資源、コアコンピタンス、バリューチェーン',
                    displayOrder: 2
                  },
                  {
                    id: '3c_purpose',
                    type: 'example',
                    title: '分析の目的と効果',
                    content: '【目的】戦略オプションの明確化と優先順位付け\n【効果】\n✓ 市場機会の特定（Customer分析）\n✓ 競合脅威の把握（Competitor分析）\n✓ 自社の競争優位源泉の発見（Company分析）\n✓ 3C統合による戦略方向性の決定',
                    duration: 1,
                    displayOrder: 3
                  }
                ],
                quiz: [
                  {
                    id: '3c_quiz_1',
                    question: '3C分析のCompetitor分析で最も重要な観点は？',
                    options: [
                      '競合他社の売上規模',
                      '競合他社の戦略と差別化要因',
                      '競合他社の社員数',
                      '競合他社の本社所在地'
                    ],
                    correct: 1,
                    explanation: '競合分析では、競合の戦略方向性と差別化要因を理解することで、自社の戦略を差別化する方向性を見出せます。',
                    type: 'single_choice'
                  }
                ]
              },
              {
                id: '3c_practice',
                title: '3C分析実践ワーク',
                estimatedMinutes: 3,
                type: 'practice',
                displayOrder: 2,
                content: [
                  {
                    id: '3c_exercise',
                    type: 'text',
                    title: '実践課題：カフェチェーンの戦略検討',
                    content: 'あなたは新興カフェチェーンの戦略企画担当者です。スターバックス、タリーズなどが競合の市場で差別化戦略を検討するため、3C分析を実施してください。各Cについて最重要な分析ポイントを3つずつ挙げてみましょう。',
                    duration: 2,
                    displayOrder: 1
                  },
                  {
                    id: '3c_analysis_tips',
                    type: 'key_points',
                    title: '効果的な分析のコツ',
                    content: '• Customer: デモグラフィックだけでなく行動・心理も分析\n• Competitor: 直接競合だけでなく代替手段も考慮\n• Company: 強みだけでなく弱み・制約も正直に評価\n• 3Cの関係性と相互作用を重視',
                    displayOrder: 2
                  }
                ],
                quiz: [
                  {
                    id: '3c_practice_quiz',
                    question: 'カフェ業界のCustomer分析で最も重要な観点は？',
                    options: [
                      '年齢と性別の分布',
                      '利用シーンと求める価値',
                      '居住地域の分布',
                      '年収レベル'
                    ],
                    correct: 1,
                    explanation: '利用シーン（勉強、商談、憩い等）と求める価値（味、空間、利便性等）を理解することで、適切なポジショニングが可能になります。',
                    type: 'single_choice'
                  }
                ]
              },
              {
                id: '3c_strategic_insights',
                title: '3C統合と戦略洞察',
                estimatedMinutes: 3,
                type: 'case_study',
                displayOrder: 3,
                content: [
                  {
                    id: '3c_integration',
                    type: 'text',
                    title: '3C統合分析の重要性',
                    content: '3C分析の真価は、各Cを個別に分析するだけでなく、3つのCの交差点で戦略機会を発見することです。「顧客ニーズは高いが競合が対応できておらず、自社なら対応可能」な領域こそが、最大の戦略機会となります。このSweet Spotを見つけることが3C分析の最終目標です。',
                    duration: 2,
                    displayOrder: 1
                  },
                  {
                    id: '3c_success_stories',
                    type: 'example',
                    title: '成功事例：ニトリの戦略',
                    content: '【Customer】価格志向の家具ニーズ拡大\n【Competitor】高級路線中心で低価格帯が手薄\n【Company】製造小売業の強みと海外生産体制\n→「お、ねだん以上。ニトリ」で低価格・高品質を実現し、家具業界のリーダーに',
                    duration: 1,
                    displayOrder: 2
                  }
                ],
                quiz: [
                  {
                    id: '3c_integration_quiz',
                    question: '3C分析で最も価値の高い戦略機会とは？',
                    options: [
                      '自社の最も強い領域',
                      '市場が最も大きい領域',
                      '競合が最も弱い領域',
                      '顧客ニーズがあり競合が弱く自社が強い領域'
                    ],
                    correct: 3,
                    explanation: '3Cが交差する「Sweet Spot」で戦略機会を見つけることが、持続可能な競争優位につながります。',
                    type: 'single_choice'
                  }
                ]
              }
            ]
          }
          // 他のテーマ（4P分析、SWOT分析、PEST分析）も同様...
        ]
      }
    ]
  },

  // 2. ビジネス数字力強化コース
  {
    id: 'business_numbers_mastery',
    title: 'ビジネス数字力強化コース',
    description: '財務分析と数字に基づく意思決定力を身につける',
    estimatedDays: 12,
    difficulty: 'intermediate',
    icon: '📊',
    color: '#F59E0B',
    displayOrder: 2,
    genres: [
      {
        id: 'financial_analysis_basics',
        title: '財務分析の基礎',
        description: '財務諸表の読み方と企業分析の基本',
        categoryId: 'finance',
        subcategoryId: '財務分析・企業価値評価',
        estimatedDays: 6,
        displayOrder: 1,
        badge: {
          id: 'financial_analyst_badge',
          title: '財務分析スペシャリスト',
          description: '財務諸表を読み解き企業の実力を見抜くスキル',
          icon: '💹',
          color: '#F59E0B'
        },
        themes: [
          // ROE・ROA、貸借対照表、損益計算書、キャッシュフロー分析の各テーマ
        ]
      },
      {
        id: 'investment_decision',
        title: '投資判断・意思決定',
        description: '数字に基づく合理的な意思決定手法',
        categoryId: 'finance',
        subcategoryId: '投資判断・リスク管理',
        estimatedDays: 6,
        displayOrder: 2,
        badge: {
          id: 'investment_decision_badge',
          title: '投資判断エキスパート',
          description: '定量的分析に基づく投資意思決定ができる',
          icon: '💰',
          color: '#059669'
        },
        themes: [
          // NPV・IRR、リスク評価、投資回収期間の各テーマ
        ]
      }
    ]
  },

  // 3. マーケティング実践コース
  {
    id: 'marketing_practice',
    title: 'マーケティング実践コース',
    description: '顧客理解からブランド戦略まで実践的マーケティングスキル',
    estimatedDays: 10,
    difficulty: 'intermediate',
    icon: '📈',
    color: '#EF4444',
    displayOrder: 3,
    genres: [
      // 顧客理解の基礎、ブランド戦略の各ジャンル
    ]
  },

  // 4. チームリーダー基礎コース
  {
    id: 'team_leader_basics',
    title: 'チームリーダー基礎コース',
    description: 'チーム運営と人材育成の基本スキルを習得',
    estimatedDays: 8,
    difficulty: 'basic',
    icon: '👥',
    color: '#06B6D4',
    displayOrder: 4,
    genres: [
      // チーム運営の基本、目標管理・評価の各ジャンル
    ]
  },

  // 5. DX推進入門コース
  {
    id: 'dx_introduction',
    title: 'DX推進入門コース',
    description: 'デジタル変革の基礎知識とデータ活用スキル',
    estimatedDays: 8,
    difficulty: 'basic',
    icon: '🚀',
    color: '#8B5CF6',
    displayOrder: 5,
    genres: [
      // DX基礎理解、データ活用入門の各ジャンル
    ]
  },

  // 6. AI活用リテラシー基礎コース
  {
    id: 'ai_literacy_fundamentals',
    title: 'AI活用リテラシー基礎コース',
    description: 'ビジネスでのAI活用、プロンプト入門から実践まで体系的に学習',
    estimatedDays: 28,
    difficulty: 'basic',
    icon: '🤖',
    color: '#7C3AED',
    displayOrder: 6,
    genres: [
      {
        id: 'ai_fundamentals',
        title: 'AI基礎理解',
        description: 'AIの基本概念とビジネスでの活用可能性を理解',
        categoryId: 'ai_digital_utilization',
        subcategoryId: 'AI・機械学習活用',
        estimatedDays: 7,
        displayOrder: 1,
        badge: {
          id: 'ai_fundamentals_badge',
          title: 'AI理解マスター',
          description: 'AIの基礎知識とビジネス活用の全体像を習得',
          icon: '🧠',
          color: '#7C3AED'
        },
        themes: [
          {
            id: 'ai_basic_concepts',
            title: 'AI基本概念',
            description: '人工知能の基礎知識とビジネスインパクト',
            estimatedMinutes: 27,
            displayOrder: 1,
            rewardCard: {
              id: 'ai_basic_concepts_card',
              title: 'AI基本概念',
              summary: 'AIの定義から機械学習、ディープラーニングまで、基本概念を理解',
              keyPoints: [
                'AI・機械学習・ディープラーニングの違い',
                'AIの得意分野と限界の理解',
                'ビジネスでのAI活用事例'
              ],
              icon: '🤖',
              color: '#7C3AED'
            },
            sessions: [
              {
                id: 'what_is_ai',
                title: 'AIとは何か？',
                estimatedMinutes: 9,
                type: 'knowledge',
                displayOrder: 1,
                content: [
                  {
                    id: 'ai_definition',
                    type: 'text',
                    title: 'AIの定義と歴史',
                    content: '人工知能（AI: Artificial Intelligence）は、人間の知的な活動をコンピューターで模倣する技術の総称です。1950年代から研究が始まり、近年のコンピューター性能向上とビッグデータの蓄積により、実用的なレベルに到達しました。現在のAIブームは「第3次AIブーム」と呼ばれています。',
                    duration: 3,
                    displayOrder: 1
                  },
                  {
                    id: 'ai_types',
                    type: 'key_points',
                    title: 'AIの種類',
                    content: '• 弱いAI（特化型AI）: 特定の分野に特化したAI（現在主流）\n• 強いAI（汎用AI）: 人間レベルの知能を持つAI（未来の目標）\n• 機械学習: データから自動的にパターンを学習する手法\n• ディープラーニング: 深層学習、人間の脳の仕組みを模倣',
                    displayOrder: 2
                  },
                  {
                    id: 'ai_business_impact',
                    type: 'example',
                    title: 'ビジネスへの影響',
                    content: '【業務効率化】文書作成、データ分析、顧客対応の自動化\n【意思決定支援】大量データから洞察を抽出、予測精度向上\n【新サービス創出】パーソナライゼーション、レコメンデーション\n【コスト削減】人手に依存していた作業の自動化',
                    duration: 3,
                    displayOrder: 3
                  }
                ],
                quiz: [
                  {
                    id: 'ai_definition_quiz',
                    question: '現在主流の「弱いAI」の特徴として最も適切なものは？',
                    options: [
                      '人間と同等の汎用的な知能を持つ',
                      '特定分野に特化して高い性能を発揮する',
                      '感情を持ち人間のように考える',
                      '全ての問題を自動的に解決する'
                    ],
                    correct: 1,
                    explanation: '現在のAIは特定の分野（画像認識、自然言語処理等）に特化した「弱いAI」が主流で、その分野では人間を上回る性能を示すことも多くあります。',
                    type: 'single_choice'
                  }
                ]
              },
              {
                id: 'ai_business_applications',
                title: 'ビジネスでのAI活用事例',
                estimatedMinutes: 9,
                type: 'case_study',
                displayOrder: 2,
                content: [
                  {
                    id: 'industry_applications',
                    type: 'text',
                    title: '業界別AI活用事例',
                    content: 'AIは様々な業界で実用化が進んでいます。金融業界では不正検知と与信判断、小売業界では需要予測と在庫最適化、製造業では品質管理と予知保全、医療分野では画像診断支援が代表的な活用例です。重要なのは、AIを導入すること自体ではなく、ビジネス課題解決にどう活用するかです。',
                    duration: 4,
                    displayOrder: 1
                  },
                  {
                    id: 'ai_success_cases',
                    type: 'example',
                    title: '成功事例',
                    content: '【Netflix】視聴履歴から好みを学習し、個人向けレコメンデーション\n【Amazon】購買データから需要を予測、配送最適化\n【トヨタ】生産ラインでの異常検知と品質向上\n【JPモルガン】契約書レビューを数秒で完了（従来は数時間）',
                    duration: 3,
                    displayOrder: 2
                  },
                  {
                    id: 'implementation_keys',
                    type: 'key_points',
                    title: 'AI導入成功の鍵',
                    content: '• 明確な課題設定とROI設計\n• 質の高いデータの準備\n• 段階的な導入とPDCAサイクル\n• 従業員のスキル向上と変革管理\n• 適切なベンダー選択と内製化バランス',
                    displayOrder: 3
                  }
                ],
                quiz: [
                  {
                    id: 'ai_business_quiz',
                    question: 'AI導入で最も重要な要素は？',
                    options: [
                      '最新の技術を使うこと',
                      '大量のデータを集めること',
                      'ビジネス課題を明確化すること',
                      '高性能なコンピューターを用意すること'
                    ],
                    correct: 2,
                    explanation: 'AI導入で最も重要なのは、解決すべきビジネス課題を明確化することです。技術ありきではなく、課題解決のためのツールとしてAIを位置づけることが成功の鍵です。',
                    type: 'single_choice'
                  }
                ]
              },
              {
                id: 'ai_limitations_ethics',
                title: 'AIの限界と倫理的配慮',
                estimatedMinutes: 9,
                type: 'knowledge',
                displayOrder: 3,
                content: [
                  {
                    id: 'ai_limitations',
                    type: 'text',
                    title: 'AIの限界を理解する',
                    content: 'AIは万能ではありません。データの質と量に依存し、学習していないケースには対応できません。また、判断プロセスがブラックボックス化しやすく、バイアスを含んだデータから偏った結果を生み出すリスクもあります。AIの限界を理解し、人間の判断と適切に組み合わせることが重要です。',
                    duration: 4,
                    displayOrder: 1
                  },
                  {
                    id: 'ai_ethics',
                    type: 'key_points',
                    title: 'AI活用の倫理的配慮',
                    content: '• プライバシー保護とデータの適切な利用\n• アルゴリズムバイアスの排除\n• 透明性と説明可能性の確保\n• 人間の雇用への影響配慮\n• AIの決定に対する人間の最終責任',
                    displayOrder: 2
                  },
                  {
                    id: 'responsible_ai',
                    type: 'example',
                    title: '責任あるAI活用',
                    content: '【Microsoft】AI倫理委員会設立、公平性チェックツール開発\n【Google】AI原則公表「社会的利益・バイアス回避・説明責任・プライバシー保護」\n【IBM】Watson for Oncology停止（医師からの信頼性への懸念）\n→失敗から学び、より慎重なアプローチに転換',
                    duration: 3,
                    displayOrder: 3
                  }
                ],
                quiz: [
                  {
                    id: 'ai_ethics_quiz',
                    question: 'AI活用における最も重要な倫理的配慮は？',
                    options: [
                      'AIを人間より優先すること',
                      '全ての判断をAIに委ねること',
                      '人間の最終判断と責任を保持すること',
                      'AIの処理速度を最優先すること'
                    ],
                    correct: 2,
                    explanation: 'AIは強力なツールですが、最終的な判断と責任は人間が持つべきです。AIの提案を参考にしながらも、倫理的・社会的影響を考慮した人間の判断が不可欠です。',
                    type: 'single_choice'
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'prompt_engineering',
        title: 'プロンプトエンジニアリング入門',
        description: '生成AIから最適な回答を得るためのプロンプト設計技術',
        categoryId: 'ai_digital_utilization',
        subcategoryId: 'プロンプトエンジニアリング',
        estimatedDays: 7,
        displayOrder: 2,
        badge: {
          id: 'prompt_master_badge',
          title: 'プロンプトマスター',
          description: '効果的なプロンプト設計で生成AIを最大限活用',
          icon: '💬',
          color: '#059669'
        },
        themes: [
          {
            id: 'prompt_basics',
            title: 'プロンプトの基本',
            description: '効果的なプロンプト作成の基礎技術',
            estimatedMinutes: 27,
            displayOrder: 1,
            rewardCard: {
              id: 'prompt_basics_card',
              title: 'プロンプト基礎',
              summary: '明確で具体的なプロンプト設計により、生成AIから期待する回答を得る技術',
              keyPoints: [
                '明確性・具体性・文脈情報の提供',
                'ロール設定と出力形式の指定',
                'Few-shotプロンプティングの活用'
              ],
              icon: '✍️',
              color: '#059669'
            },
            sessions: [
              {
                id: 'prompt_fundamentals',
                title: 'プロンプトの基本原則',
                estimatedMinutes: 9,
                type: 'knowledge',
                displayOrder: 1,
                content: [
                  {
                    id: 'prompt_principles',
                    type: 'text',
                    title: '効果的なプロンプトの原則',
                    content: '生成AIから期待する回答を得るには、明確で具体的なプロンプトが必要です。基本原則は「明確性」「具体性」「文脈情報」です。曖昧な指示では曖昧な回答しか得られません。また、AIにロールや人格を設定し、出力形式を指定することで、より実用的な結果を得ることができます。',
                    duration: 3,
                    displayOrder: 1
                  },
                  {
                    id: 'good_vs_bad_prompts',
                    type: 'example',
                    title: '良いプロンプトvs悪いプロンプト',
                    content: '【悪い例】「マーケティングについて教えて」\n【良い例】「BtoB SaaS企業の新規顧客獲得のためのデジタルマーケティング戦略を、予算500万円の中小企業向けに、具体的な施策と予算配分を含めて提案してください」\n\n違い：対象、条件、求める回答形式が明確',
                    duration: 3,
                    displayOrder: 2
                  },
                  {
                    id: 'prompt_structure',
                    type: 'key_points',
                    title: 'プロンプトの基本構造',
                    content: '1. ロール設定：「あなたは経験豊富なマーケティングコンサルタントです」\n2. 課題・背景：具体的な状況説明\n3. 制約条件：予算、期間、リソース等\n4. 求める出力形式：箇条書き、表形式、文字数等\n5. 追加指示：注意事項や重視すべきポイント',
                    displayOrder: 3
                  }
                ],
                quiz: [
                  {
                    id: 'prompt_principles_quiz',
                    question: 'プロンプト作成で最も重要な要素は？',
                    options: [
                      '長い文章で詳しく説明すること',
                      '専門用語を多用すること',
                      '明確性と具体性を持たせること',
                      '複数の質問を同時に含めること'
                    ],
                    correct: 2,
                    explanation: '効果的なプロンプトの最重要要素は明確性と具体性です。AIが理解しやすい明確な指示と、具体的な条件や求める結果を示すことで、期待に近い回答を得ることができます。',
                    type: 'single_choice'
                  }
                ]
              },
              {
                id: 'advanced_prompting',
                title: '高度なプロンプト技法',
                estimatedMinutes: 9,
                type: 'practice',
                displayOrder: 2,
                content: [
                  {
                    id: 'few_shot_prompting',
                    type: 'text',
                    title: 'Few-shotプロンプティング',
                    content: 'Few-shotプロンプティングは、期待する回答の例を示すことで、AIに求める出力パターンを学習させる技法です。特に特定のフォーマットや文体で回答してもらいたい場合に効果的です。例を2-3個示すだけで、回答の質が大幅に向上します。',
                    duration: 3,
                    displayOrder: 1
                  },
                  {
                    id: 'chain_of_thought',
                    type: 'example',
                    title: 'Chain of Thought（思考の連鎖）',
                    content: '【通常】「売上を20%向上させるには？」\n【CoT】「売上向上のために、以下のステップで考えてください：\n1. 現状分析（売上構成要素の分解）\n2. 課題特定（ボトルネックの発見）\n3. 解決策の検討（各要素への対策）\n4. 優先順位付け（効果とコストの評価）\n5. 具体的アクションプラン」',
                    duration: 3,
                    displayOrder: 2
                  },
                  {
                    id: 'prompting_techniques',
                    type: 'key_points',
                    title: '実践的技法',
                    content: '• Zero-shot: 例なしで直接指示\n• One-shot: 1つの例を示す\n• Few-shot: 複数の例を示す\n• Chain of Thought: 思考プロセスを明示\n• Role prompting: 専門家の役割を設定\n• Template prompting: 決まったフォーマットを使用',
                    displayOrder: 3
                  }
                ],
                quiz: [
                  {
                    id: 'advanced_prompting_quiz',
                    question: 'Few-shotプロンプティングが最も効果的な場面は？',
                    options: [
                      '一般的な質問をする時',
                      '特定のフォーマットで回答してほしい時',
                      '簡単な計算をしてもらう時',
                      '長い文章を要約してもらう時'
                    ],
                    correct: 1,
                    explanation: 'Few-shotプロンプティングは、特定のフォーマットや文体で回答してもらいたい時に最も効果的です。例を示すことで、AIが求められる出力パターンを理解できます。',
                    type: 'single_choice'
                  }
                ]
              },
              {
                id: 'prompt_optimization',
                title: 'プロンプト最適化のコツ',
                estimatedMinutes: 9,
                type: 'practice',
                displayOrder: 3,
                content: [
                  {
                    id: 'iterative_improvement',
                    type: 'text',
                    title: '反復改善のプロセス',
                    content: 'プロンプトは一回で完璧になることは稀です。初回の結果を見て、不足している情報や曖昧な部分を特定し、段階的に改善していきます。「プロンプト→実行→評価→改善」のサイクルを回すことで、期待に近い結果を得ることができます。',
                    duration: 3,
                    displayOrder: 1
                  },
                  {
                    id: 'common_mistakes',
                    type: 'key_points',
                    title: 'よくある失敗と対策',
                    content: '• 曖昧な指示 → 具体的な条件を追加\n• 複数の質問を混在 → 1つずつ分割\n• 文脈情報不足 → 背景状況を詳しく説明\n• 出力形式未指定 → 求める形式を明示\n• 制約条件なし → 予算・期間等の制約を設定',
                    displayOrder: 2
                  },
                  {
                    id: 'optimization_checklist',
                    type: 'example',
                    title: 'プロンプト最適化チェックリスト',
                    content: '✅ ロールは適切に設定されているか？\n✅ 背景情報は十分に提供されているか？\n✅ 制約条件（予算、期間等）は明示されているか？\n✅ 求める出力形式は具体的に指定されているか？\n✅ 一度に複数のことを求めすぎていないか？\n✅ 専門用語の説明は必要ないか？',
                    duration: 3,
                    displayOrder: 3
                  }
                ],
                quiz: [
                  {
                    id: 'prompt_optimization_quiz',
                    question: 'プロンプト改善で最も効果的なアプローチは？',
                    options: [
                      '一度に大幅に変更する',
                      '段階的に反復改善する',
                      '最初から完璧を目指す',
                      '他人のプロンプトをそのまま使う'
                    ],
                    correct: 1,
                    explanation: 'プロンプト改善は段階的な反復改善が最も効果的です。初回結果を評価し、不足部分を特定して改善するサイクルを回すことで、期待に近い結果を得られます。',
                    type: 'single_choice'
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'business_ai_practice',
        title: 'ビジネス活用実践',
        description: '実際の業務でのAI活用方法と導入プロセス',
        categoryId: 'ai_digital_utilization',
        subcategoryId: 'AI基礎・業務活用',
        estimatedDays: 7,
        displayOrder: 3,
        badge: {
          id: 'ai_practitioner_badge',
          title: 'AI活用実践者',
          description: 'ビジネス現場でAIを効果的に活用し成果を出すスキル',
          icon: '🎯',
          color: '#DC2626'
        },
        themes: [
          {
            id: 'ai_workflow_integration',
            title: 'AI活用ワークフロー設計',
            description: '既存業務へのAI統合と効率化実現',
            estimatedMinutes: 27,
            displayOrder: 1,
            rewardCard: {
              id: 'workflow_integration_card',
              title: 'AIワークフロー設計',
              summary: '既存の業務プロセスにAIを効果的に組み込み、生産性向上を実現する設計技術',
              keyPoints: [
                '業務プロセスの分析と改善点特定',
                'AI適用領域の見極めと優先順位付け',
                '人間とAIの役割分担設計'
              ],
              icon: '⚙️',
              color: '#DC2626'
            },
            sessions: [
              {
                id: 'workflow_analysis',
                title: '業務プロセス分析とAI適用ポイント',
                estimatedMinutes: 9,
                type: 'knowledge',
                displayOrder: 1,
                content: [
                  {
                    id: 'process_mapping',
                    type: 'text',
                    title: '業務プロセスのマッピング',
                    content: 'AI導入を成功させるには、まず現在の業務プロセスを詳細に把握することが重要です。各タスクの所要時間、頻度、難易度、エラー率を分析し、AIが効果を発揮できる領域を特定します。特に、繰り返し作業、判断業務、データ処理などはAIの得意分野です。',
                    duration: 3,
                    displayOrder: 1
                  },
                  {
                    id: 'ai_application_areas',
                    type: 'key_points',
                    title: 'AI適用に適したタスク',
                    content: '• 大量データの処理・分析\n• パターン認識（画像、音声、テキスト）\n• 繰り返し作業の自動化\n• 予測・予約・レコメンデーション\n• 文書作成・要約・翻訳\n• カスタマーサポート（チャットボット）',
                    displayOrder: 2
                  },
                  {
                    id: 'roi_evaluation',
                    type: 'example',
                    title: 'ROI評価の考え方',
                    content: '【コスト削減効果】\n・作業時間短縮: 8時間→2時間（75%削減）\n・人件費削減: 月200万円→50万円\n・エラー削減: クレーム対応コスト月30万円削減\n\n【導入コスト】\n・システム構築費: 500万円\n・月額運用費: 20万円\n\n【ROI計算】投資回収期間: 約4ヶ月',
                    duration: 3,
                    displayOrder: 3
                  }
                ],
                quiz: [
                  {
                    id: 'workflow_analysis_quiz',
                    question: 'AI導入の ROI を最大化するために最初に行うべきことは？',
                    options: [
                      '最新のAIツールを導入する',
                      '現在の業務プロセスを詳細分析する',
                      'AI専門人材を大量採用する',
                      '競合他社の事例を真似する'
                    ],
                    correct: 1,
                    explanation: 'AI導入成功の鍵は、現在の業務プロセスを詳細に分析し、AIが最も効果を発揮できる領域を特定することです。闇雲にAIを導入しても期待した効果は得られません。',
                    type: 'single_choice'
                  }
                ]
              },
              {
                id: 'human_ai_collaboration',
                title: '人間とAIの協働設計',
                estimatedMinutes: 9,
                type: 'practice',
                displayOrder: 2,
                content: [
                  {
                    id: 'collaboration_design',
                    type: 'text',
                    title: '効果的な協働モデル',
                    content: 'AIと人間が最も効果的に協働するには、それぞれの強みを活かした役割分担が重要です。AIは高速・大量処理と一定品質の維持が得意、人間は創造性・判断力・コミュニケーションが得意です。両者の特性を理解し、補完関係を築くことで1+1=3の効果を生み出せます。',
                    duration: 3,
                    displayOrder: 1
                  },
                  {
                    id: 'role_distribution',
                    type: 'key_points',
                    title: '理想的な役割分担',
                    content: '【AIの役割】\n• データ収集・前処理\n• パターン分析・異常検知\n• 初回ドラフト作成\n• ルーティンワーク実行\n\n【人間の役割】\n• 戦略・方針決定\n• 創造的なアイデア創出\n• 最終判断・品質チェック\n• ステークホルダーとのコミュニケーション',
                    displayOrder: 2
                  },
                  {
                    id: 'collaboration_example',
                    type: 'example',
                    title: '協働事例：マーケティング企画',
                    content: '【従来】企画者が1週間かけて市場分析→企画書作成\n\n【AI協働後】\n1. AI：競合分析・トレンド調査（30分）\n2. 人間：洞察抽出・戦略方向性決定（2時間）\n3. AI：企画書の初期ドラフト作成（15分）\n4. 人間：創造的要素追加・最終調整（1時間）\n\n結果：1週間→3.5時間（95%短縮）',
                    duration: 3,
                    displayOrder: 3
                  }
                ],
                quiz: [
                  {
                    id: 'collaboration_quiz',
                    question: '人間とAIの協働で最も重要な考え方は？',
                    options: [
                      'AIに全ての作業を任せる',
                      '人間がAIを完全にコントロールする',
                      'それぞれの強みを活かした補完関係を築く',
                      'AIの判断を常に疑う'
                    ],
                    correct: 2,
                    explanation: 'AI活用の成功には、AIと人間がそれぞれの得意分野で力を発揮し、互いの弱点を補完する協働関係の構築が最も重要です。',
                    type: 'single_choice'
                  }
                ]
              },
              {
                id: 'implementation_planning',
                title: 'AI導入計画の立案',
                estimatedMinutes: 9,
                type: 'case_study',
                displayOrder: 3,
                content: [
                  {
                    id: 'implementation_phases',
                    type: 'text',
                    title: '段階的導入アプローチ',
                    content: 'AI導入は段階的に進めることで、リスクを最小化し成功確率を高められます。まずはパイロットプロジェクトで小さく始め、効果を検証してから段階的に拡大します。各段階での学習を次の段階に活かすことで、組織全体のAI活用成熟度を向上させることができます。',
                    duration: 3,
                    displayOrder: 1
                  },
                  {
                    id: 'success_factors',
                    type: 'key_points',
                    title: '導入成功の要因',
                    content: '• 経営層のコミットメントと投資\n• 明確なKPI設定と効果測定\n• 従業員の教育・研修プログラム\n• 段階的な導入とリスク管理\n• 継続的な改善とアップデート\n• 外部専門家との適切な連携',
                    displayOrder: 2
                  },
                  {
                    id: 'implementation_roadmap',
                    type: 'example',
                    title: '実装ロードマップ例',
                    content: '【Phase 1】準備期間（1-2ヶ月）\n・現状分析・課題特定・ROI試算\n\n【Phase 2】パイロット（3-6ヶ月）\n・限定的な領域でのテスト導入\n・効果測定・課題特定\n\n【Phase 3】拡大展開（6-12ヶ月）\n・成功事例の横展開\n・組織体制の整備\n\n【Phase 4】全社展開（12ヶ月以降）\n・戦略的活用・競争優位確立',
                    duration: 3,
                    displayOrder: 3
                  }
                ],
                quiz: [
                  {
                    id: 'implementation_quiz',
                    question: 'AI導入で最も効果的なアプローチは？',
                    options: [
                      '全社一斉に大規模導入する',
                      'パイロットから段階的に拡大する',
                      '競合と同じシステムを導入する',
                      'AI専門部署に全て任せる'
                    ],
                    correct: 1,
                    explanation: 'AI導入は、パイロットプロジェクトで小さく始めて効果を検証し、段階的に拡大するアプローチが最も成功確率が高く、リスクも最小化できます。',
                    type: 'single_choice'
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'ai_evaluation_ethics',
        title: '実践・評価・倫理',
        description: 'AI活用の評価方法と責任あるAI利用',
        categoryId: 'ai_digital_utilization',
        subcategoryId: 'DX戦略・デジタル変革',
        estimatedDays: 7,
        displayOrder: 4,
        badge: {
          id: 'responsible_ai_badge',
          title: '責任あるAI実践者',
          description: 'AI活用の効果を適切に評価し、倫理的配慮を持って活用するスキル',
          icon: '⚖️',
          color: '#7C2D12'
        },
        themes: [
          {
            id: 'ai_performance_evaluation',
            title: 'AI成果評価と改善',
            description: 'AI導入効果の測定と継続的改善プロセス',
            estimatedMinutes: 27,
            displayOrder: 1,
            rewardCard: {
              id: 'ai_evaluation_card',
              title: 'AI成果評価',
              summary: 'AI導入の効果を適切に測定し、継続的な改善につなげる評価技術',
              keyPoints: [
                '定量・定性の両面での効果測定',
                'KPI設定と継続的モニタリング',
                'ROI計算と投資判断'
              ],
              icon: '📊',
              color: '#7C2D12'
            },
            sessions: [
              {
                id: 'evaluation_framework',
                title: 'AI評価のフレームワーク',
                estimatedMinutes: 9,
                type: 'knowledge',
                displayOrder: 1,
                content: [
                  {
                    id: 'evaluation_dimensions',
                    type: 'text',
                    title: 'AI評価の多面的アプローチ',
                    content: 'AI導入の成功を正しく評価するには、技術的性能だけでなく、ビジネスインパクト、ユーザーエクスペリエンス、組織への影響など、多面的な評価が必要です。定量的指標と定性的評価を組み合わせることで、AI活用の真の価値を測定できます。',
                    duration: 3,
                    displayOrder: 1
                  },
                  {
                    id: 'kpi_categories',
                    type: 'key_points',
                    title: 'AI評価のKPI分類',
                    content: '【技術的KPI】\n• 予測精度・処理速度・可用性\n\n【ビジネスKPI】\n• 売上向上・コスト削減・生産性向上\n\n【ユーザーKPI】\n• 満足度・使いやすさ・採用率\n\n【組織KPI】\n• スキル向上・変革推進・競争力強化',
                    displayOrder: 2
                  },
                  {
                    id: 'measurement_best_practices',
                    type: 'example',
                    title: '測定のベストプラクティス',
                    content: '【Before/After比較】\n導入前：手作業で週40時間\n導入後：AI支援で週10時間（75%削減）\n\n【A/Bテスト】\nAI推薦あり：コンバージョン率3.5%\nAI推薦なし：コンバージョン率2.1%\n→67%の改善効果\n\n【継続的モニタリング】\n月次レポートで効果と課題を可視化',
                    duration: 3,
                    displayOrder: 3
                  }
                ],
                quiz: [
                  {
                    id: 'evaluation_framework_quiz',
                    question: 'AI評価で最も重要な視点は？',
                    options: [
                      '技術的性能のみを重視する',
                      '導入コストだけを評価する',
                      '多面的な評価指標を組み合わせる',
                      'ユーザー満足度のみを測定する'
                    ],
                    correct: 2,
                    explanation: 'AI評価では、技術性能・ビジネス効果・ユーザビリティ・組織インパクトなど、多面的な評価指標を組み合わせることで、真の価値を正しく測定できます。',
                    type: 'single_choice'
                  }
                ]
              },
              {
                id: 'continuous_improvement',
                title: '継続的改善プロセス',
                estimatedMinutes: 9,
                type: 'practice',
                displayOrder: 2,
                content: [
                  {
                    id: 'pdca_cycle',
                    type: 'text',
                    title: 'AI活用のPDCAサイクル',
                    content: 'AI活用は導入して終わりではありません。Plan（計画）→ Do（実行）→ Check（評価）→ Action（改善）のサイクルを継続的に回すことで、AI活用効果を最大化できます。特に、データの蓄積とともにAIの性能は向上するため、継続的なモニタリングと改善が重要です。',
                    duration: 3,
                    displayOrder: 1
                  },
                  {
                    id: 'improvement_triggers',
                    type: 'key_points',
                    title: '改善のトリガー',
                    content: '• 性能指標の低下（精度・速度・満足度）\n• ビジネス環境の変化（市場・競合・法規制）\n• 新しいデータパターンの出現\n• ユーザーからのフィードバック\n• 技術的な進歩や新ツールの登場\n• ROIの改善余地の発見',
                    displayOrder: 2
                  },
                  {
                    id: 'improvement_case',
                    type: 'example',
                    title: '改善事例：チャットボット最適化',
                    content: '【課題発見】月次レポートで解決率が60%→45%に低下\n\n【原因分析】\n・新しいタイプの問い合わせ増加\n・既存の回答パターンとのミスマッチ\n\n【改善施策】\n・新しいFAQデータの追加学習\n・回答フローの見直し\n・エスカレーション基準の調整\n\n【結果】解決率が70%に向上',
                    duration: 3,
                    displayOrder: 3
                  }
                ],
                quiz: [
                  {
                    id: 'continuous_improvement_quiz',
                    question: 'AI活用の継続的改善で最も重要なことは？',
                    options: [
                      '一度設定したら変更しない',
                      '毎月必ず大幅な変更を行う',
                      '定期的な評価と適切な改善のサイクル',
                      '最新技術への常時アップデート'
                    ],
                    correct: 2,
                    explanation: 'AI活用の成功には、定期的な評価で課題を発見し、データに基づいた適切な改善を継続するPDCAサイクルが最も重要です。',
                    type: 'single_choice'
                  }
                ]
              },
              {
                id: 'responsible_ai_practice',
                title: '責任あるAI活用',
                estimatedMinutes: 9,
                type: 'case_study',
                displayOrder: 3,
                content: [
                  {
                    id: 'ethical_considerations',
                    type: 'text',
                    title: 'AI活用における倫理的責任',
                    content: 'AI活用には大きな可能性がある一方で、バイアス、プライバシー、雇用への影響など、様々な倫理的課題も存在します。責任あるAI活用では、技術的効果だけでなく、社会への影響も考慮し、透明性、公平性、説明可能性を重視した導入・運用を行うことが重要です。',
                    duration: 3,
                    displayOrder: 1
                  },
                  {
                    id: 'ethical_principles',
                    type: 'key_points',
                    title: '責任あるAI活用の原則',
                    content: '• 透明性：AIの判断プロセスを可能な限り説明\n• 公平性：偏見やバイアスの排除\n• プライバシー：個人情報の適切な保護\n• 人間中心：最終判断は人間が保持\n• 社会貢献：社会全体の利益を考慮\n• 継続的検証：定期的な倫理監査',
                    displayOrder: 2
                  },
                  {
                    id: 'ethical_case_studies',
                    type: 'example',
                    title: '倫理的課題の事例と対策',
                    content: '【事例1】採用AIのバイアス問題\n課題：特定の属性への偏見\n対策：多様なデータでの学習・定期的な公平性チェック\n\n【事例2】医療診断支援AI\n課題：誤診のリスクと責任の所在\n対策：医師の最終判断・セカンドオピニオンの導入\n\n【事例3】個人情報を使った推薦システム\n課題：プライバシーの侵害\n対策：データ匿名化・ユーザー同意の徹底',
                    duration: 3,
                    displayOrder: 3
                  }
                ],
                quiz: [
                  {
                    id: 'responsible_ai_quiz',
                    question: '責任あるAI活用で最も重要な原則は？',
                    options: [
                      'AIの高い性能を追求すること',
                      '最新技術を常に導入すること',
                      '透明性と人間の最終判断権の確保',
                      'コスト削減効果の最大化'
                    ],
                    correct: 2,
                    explanation: '責任あるAI活用では、技術的性能だけでなく、AIの判断プロセスの透明性と、最終的な責任と判断権を人間が持つことが最も重要です。',
                    type: 'single_choice'
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
]