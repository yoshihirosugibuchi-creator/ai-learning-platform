-- ============================================================
-- ケーススタディ テスト問題データ（3問）
-- ============================================================

DO $$
DECLARE
  problem1_id UUID := gen_random_uuid();
  problem2_id UUID := gen_random_uuid();
  problem3_id UUID := gen_random_uuid();
BEGIN

-- 問題1: IT企業の新サービス立ち上げ戦略（intermediate）
INSERT INTO case_study_problems (
  id, title, case_text, primary_category_id, primary_subcategory_id,
  difficulty, industry, scenario_type, estimated_minutes, step_count,
  status, is_ai_generated
) VALUES (
  problem1_id,
  'IT企業の新サービス立ち上げ戦略',
  'A社はBtoBのSaaS企業（従業員200名、年間売上50億円）で、主力製品は中小企業向け会計ソフトウェアです。直近3年間の成長率は年5%に鈍化しており、市場シェアは15%で頭打ちとなっています。

経営陣は新規事業として「AI搭載の経費精算自動化サービス」の立ち上げを検討しています。競合他社は既に類似サービスを展開しており、市場には3社の主要プレイヤーが存在します。

A社の強みは既存顧客基盤（5,000社）と会計データの蓄積ですが、AI開発の経験は乏しく、専任のAIエンジニアは2名のみです。投資予算として2億円が承認されており、12ヶ月以内の初期リリースが求められています。

あなたはA社の経営企画部門のコンサルタントとして、この新サービス立ち上げに関する戦略を策定してください。',
  'strategy_management', 'business_strategy_management',
  'intermediate', 'IT', '新規事業戦略', 35, 5,
  'active', false
);

-- 問題1 ステップ
INSERT INTO case_study_steps (problem_id, step_number, step_name, description, category_id, subcategory_id, question_type, options, model_answer, hint, target_skills, max_score, display_order) VALUES
(problem1_id, 1, '状況整理と課題抽出',
 'A社が直面している状況を整理し、新サービス立ち上げにおける主要な課題を特定してください。',
 'logical_thinking_problem_solving', 'structured_thinking', 'hybrid',
 '[{"id":"1a","text":"既存製品の成長鈍化が最大の課題であり、新規事業で成長回復が急務","is_correct":true,"partial_score":3},{"id":"1b","text":"AI人材不足が最大のボトルネックであり、採用が最優先","is_correct":true,"partial_score":3},{"id":"1c","text":"競合3社が先行しているため、差別化戦略が不可欠","is_correct":true,"partial_score":2},{"id":"1d","text":"2億円の予算は十分であり、資金面の課題はない","is_correct":false,"partial_score":0}]',
 '{"ideal_choices":["1a","1b","1c"],"essential_points":["成長鈍化の背景分析","AI人材・技術の課題認識","競合環境の把握"],"scoring_anchors":{"1":"課題の列挙のみ","2":"1つの課題を深掘り","3":"複数課題の関連性を把握","4":"課題の優先順位付け","5":"課題間の因果関係を構造化"}}',
 '外部環境（市場・競合）と内部環境（自社の強み・弱み）の両面から整理してみましょう。',
 '["problem_setting","structuring_logic"]', 20, 1),

(problem1_id, 2, '仮説の構築',
 '新サービスの成功に向けた仮説を立ててください。どのような価値提案が顧客に受け入れられるでしょうか？',
 'logical_thinking_problem_solving', 'hypothesis_verification', 'hybrid',
 '[{"id":"2a","text":"既存顧客の会計データを活用したAI学習により、競合より高精度な経費分類を実現できる","is_correct":true,"partial_score":4},{"id":"2b","text":"会計ソフトとのシームレスな連携が、スイッチングコストの高い競合との差別化になる","is_correct":true,"partial_score":3},{"id":"2c","text":"低価格戦略により、競合からの顧客獲得が可能","is_correct":false,"partial_score":1},{"id":"2d","text":"既存5,000社への クロスセルにより、初期の顧客獲得コストを大幅に削減できる","is_correct":true,"partial_score":3}]',
 '{"ideal_choices":["2a","2b","2d"],"essential_points":["データ資産の活用","既存顧客基盤の活用","製品連携による差別化"],"scoring_anchors":{"1":"一般的な仮説のみ","2":"A社固有の強みに言及","3":"仮説に論理的根拠あり","4":"検証可能な仮説を設定","5":"複数仮説を体系化し優先順位付け"}}',
 'A社固有の「強み」を活かせる仮説を考えてみましょう。他社にはない優位性は何ですか？',
 '["hypothesis_thinking","originality"]', 20, 2),

(problem1_id, 3, '分析フレームワークの設計',
 '仮説を検証するために必要な分析をデザインしてください。どのようなデータや手法で検証しますか？',
 'logical_thinking_problem_solving', 'quantitative_analysis', 'hybrid',
 '[{"id":"3a","text":"既存顧客へのアンケート調査（n=500）で経費精算の課題とニーズを定量把握","is_correct":true,"partial_score":3},{"id":"3b","text":"競合3社の機能・価格比較マトリクスを作成し、ポジショニングを分析","is_correct":true,"partial_score":3},{"id":"3c","text":"POC（概念実証）を実施し、AI精度が既存手法より20%以上改善するか検証","is_correct":true,"partial_score":4},{"id":"3d","text":"全社員への社内アンケートで、新サービスへの関心度を調査","is_correct":false,"partial_score":0}]',
 '{"ideal_choices":["3a","3b","3c"],"essential_points":["顧客ニーズの定量検証","競合分析","技術的実現可能性の検証"],"scoring_anchors":{"1":"分析方法の列挙のみ","2":"目的と手法の対応あり","3":"定量・定性の両面をカバー","4":"検証基準（KPI）を設定","5":"分析計画の実行可能性まで検討"}}',
 '仮説ごとに「何を・どうやって・どの水準で」検証するか考えましょう。',
 '["analysis_design","structuring_logic"]', 20, 3),

(problem1_id, 4, '戦略提案の策定',
 'これまでの分析を踏まえ、具体的な戦略提案を策定してください。',
 'strategy_management', 'business_strategy_management', 'hybrid',
 '[{"id":"4a","text":"フェーズ1（0-6ヶ月）: 既存顧客30社でβテスト、フェーズ2（6-12ヶ月）: 正式リリースの段階的展開","is_correct":true,"partial_score":4},{"id":"4b","text":"AI開発は外部パートナーと協業し、自社はUI/UXとカスタマーサクセスに注力する","is_correct":true,"partial_score":3},{"id":"4c","text":"12ヶ月で全機能を一括開発し、完成度の高い状態でリリース","is_correct":false,"partial_score":1},{"id":"4d","text":"既存会計ソフトの付帯サービスとして提供し、段階的に独立サービス化を図る","is_correct":true,"partial_score":3}]',
 '{"ideal_choices":["4a","4b","4d"],"essential_points":["段階的な展開計画","リソース制約への対応","既存資産の活用"],"scoring_anchors":{"1":"一般的な提案のみ","2":"A社の状況に対応","3":"実行可能なスケジュール","4":"リスク対応を含む","5":"KPI・マイルストーンまで具体化"}}',
 '限られたリソース（人材2名・予算2億円・12ヶ月）の中で、何を優先し何を後回しにするか考えましょう。',
 '["proposal_specificity","feasibility"]', 20, 4),

(problem1_id, 5, '実行計画とリスク管理',
 '提案した戦略の実行計画を策定し、想定されるリスクと対策を述べてください。',
 'project_operations', 'process_design_optimization', 'hybrid',
 '[{"id":"5a","text":"AI開発遅延リスク → 外部パートナーとの契約にマイルストーン条項を設定","is_correct":true,"partial_score":3},{"id":"5b","text":"既存顧客の反応が低調なリスク → βテスト前にニーズ調査を実施し、ピボット基準を設定","is_correct":true,"partial_score":4},{"id":"5c","text":"競合の値下げリスク → 自社も価格で対抗する","is_correct":false,"partial_score":0},{"id":"5d","text":"AI人材確保リスク → 中途採用3名と既存エンジニアのリスキリングを並行実施","is_correct":true,"partial_score":3}]',
 '{"ideal_choices":["5a","5b","5d"],"essential_points":["主要リスクの特定","具体的な対策","撤退基準の設定"],"scoring_anchors":{"1":"リスクの列挙のみ","2":"リスクと対策の対応","3":"実行可能な対策","4":"撤退基準やピボット判断を含む","5":"リスク間の連鎖と優先対応を構造化"}}',
 '「最悪のシナリオ」が起きた場合にどうするかを考えることで、実効性のある計画になります。',
 '["feasibility","impact","perspective_diversity"]', 20, 5);


-- 問題2: 製造業の歩留まり改善（advanced）
INSERT INTO case_study_problems (
  id, title, case_text, primary_category_id, primary_subcategory_id,
  difficulty, industry, scenario_type, estimated_minutes, step_count,
  status, is_ai_generated
) VALUES (
  problem2_id,
  '製造業の歩留まり改善プロジェクト',
  'B社は自動車部品メーカー（従業員800名、年間売上200億円）で、主力製品はエンジン用精密部品です。過去1年間で主力製品ラインの歩留まりが92%から87%に低下し、不良品コストが年間約5億円増加しています。

品質管理部門の調査では、不良の60%が寸法精度の逸脱、25%が表面傷、15%がその他の要因です。製造ラインは3年前に導入した最新設備ですが、設備の経年劣化は確認されていません。

工場長からは「現場の作業者は以前と変わらない手順で作業している」との報告がありますが、直近1年で作業者の30%が入れ替わっています。また、主要原材料の調達先を半年前にコスト削減のため変更しています。

あなたはB社の生産改善コンサルタントとして、歩留まり改善プロジェクトをリードしてください。',
  'logical_thinking_problem_solving', 'hypothesis_verification',
  'advanced', '製造', '品質改善', 40, 5,
  'active', false
);

INSERT INTO case_study_steps (problem_id, step_number, step_name, description, category_id, subcategory_id, question_type, options, model_answer, hint, target_skills, max_score, display_order) VALUES
(problem2_id, 1, '現状把握と問題の構造化',
 '歩留まり低下の現象を構造的に整理し、真因を特定するための問題設定を行ってください。',
 'logical_thinking_problem_solving', 'structured_thinking', 'hybrid',
 '[{"id":"1a","text":"不良の種類（寸法精度60%、表面傷25%、その他15%）ごとに発生パターンを分析する必要がある","is_correct":true,"partial_score":4},{"id":"1b","text":"作業者交代（30%入替）と原材料変更の時系列を歩留まり推移と突合する必要がある","is_correct":true,"partial_score":4},{"id":"1c","text":"設備が最新なので設備起因は除外し、人的要因に絞って調査すべき","is_correct":false,"partial_score":1},{"id":"1d","text":"工場長の報告を信頼し、作業手順は問題ないと判断する","is_correct":false,"partial_score":0}]',
 '{"ideal_choices":["1a","1b"],"essential_points":["不良を種類別に分解","時系列での変化点分析","仮説の網羅性（人・モノ・設備・方法）"],"scoring_anchors":{"1":"問題の認識のみ","2":"不良種類の整理","3":"変化点の特定","4":"4M分析の適用","5":"構造化された問題設定と優先順位"}}',
 '「何が変わったか」に着目しましょう。変化点は複数ある可能性があります。',
 '["problem_setting","structuring_logic"]', 20, 1),

(problem2_id, 2, '仮説の立案',
 '歩留まり低下の原因について、データに基づいた仮説を立ててください。',
 'logical_thinking_problem_solving', 'hypothesis_verification', 'hybrid',
 '[{"id":"2a","text":"仮説1: 新原材料の品質（硬度・均一性）が旧材料と異なり、加工精度に影響している","is_correct":true,"partial_score":4},{"id":"2b","text":"仮説2: 新人作業者のスキル不足により、微細な調整作業の品質にばらつきが生じている","is_correct":true,"partial_score":4},{"id":"2c","text":"仮説3: 原材料変更と人員交代が同時期に重なったことで、相互作用的に品質低下が拡大した","is_correct":true,"partial_score":3},{"id":"2d","text":"仮説4: 設備が3年経過したため、定期メンテナンスの頻度を上げれば解決する","is_correct":false,"partial_score":1}]',
 '{"ideal_choices":["2a","2b","2c"],"essential_points":["原材料変更の影響仮説","人的要因の仮説","複合要因の可能性"],"scoring_anchors":{"1":"一般的な仮説のみ","2":"事実に基づく仮説","3":"複数仮説の提示","4":"仮説間の関連性を考慮","5":"検証可能な形で仮説を構造化"}}',
 '1つの原因に決め打ちせず、複数の可能性を挙げましょう。特に「変化点」に注目した仮説が有効です。',
 '["hypothesis_thinking","analysis_design"]', 20, 2),

(problem2_id, 3, '検証計画の設計',
 '各仮説を検証するための具体的な分析計画を設計してください。',
 'logical_thinking_problem_solving', 'quantitative_analysis', 'hybrid',
 '[{"id":"3a","text":"新旧原材料のサンプル試験（硬度・成分分析・加工テスト）を実施し、差異を定量化","is_correct":true,"partial_score":4},{"id":"3b","text":"作業者の経験年数別に不良率を集計し、スキルと品質の相関を検証","is_correct":true,"partial_score":4},{"id":"3c","text":"原材料変更前後・人員入替前後のデータを層別し、交互作用を統計的に分析","is_correct":true,"partial_score":3},{"id":"3d","text":"全作業者にアンケートを配布し、作業の困難度を主観的に評価","is_correct":false,"partial_score":1}]',
 '{"ideal_choices":["3a","3b","3c"],"essential_points":["原材料の定量比較","スキル別不良率の層別分析","複合要因の統計分析"],"scoring_anchors":{"1":"分析手法の列挙のみ","2":"仮説と分析の対応","3":"定量的な検証方法","4":"統計的手法の適用","5":"分析の優先順位と判断基準まで設計"}}',
 '「仮説→検証方法→判断基準」のセットで考えましょう。定量データで判断できる方法が理想です。',
 '["analysis_design","structuring_logic"]', 20, 3),

(problem2_id, 4, '改善提案の策定',
 '分析結果を踏まえた改善策を提案してください。短期と中長期に分けて具体策を述べてください。',
 'business_process_analysis', 'process_design_optimization', 'hybrid',
 '[{"id":"4a","text":"短期: 新原材料の加工条件（切削速度・送り量）を最適化するパラメータ調整を即実施","is_correct":true,"partial_score":4},{"id":"4b","text":"短期: ベテラン作業者によるOJT強化と、作業手順書のビジュアル化","is_correct":true,"partial_score":3},{"id":"4c","text":"中長期: AIを活用したインライン品質検査システムの導入で不良の早期検出","is_correct":true,"partial_score":3},{"id":"4d","text":"中長期: 原材料を旧調達先に全面的に戻し、コスト削減効果を放棄する","is_correct":false,"partial_score":1}]',
 '{"ideal_choices":["4a","4b","4c"],"essential_points":["即効性のある短期施策","根本対策の中長期施策","コストとのバランス"],"scoring_anchors":{"1":"改善案の列挙のみ","2":"短期・中長期の区分","3":"具体的な実行内容","4":"コスト対効果を考慮","5":"KPIと目標値を設定した改善計画"}}',
 '「すぐできること」と「時間をかけて取り組むこと」を分けて考えましょう。',
 '["proposal_specificity","feasibility","impact"]', 20, 4),

(problem2_id, 5, '実行計画と成果予測',
 'プロジェクト全体の実行計画と期待される成果を述べてください。',
 'project_operations', 'process_design_optimization', 'hybrid',
 '[{"id":"5a","text":"Week1-2: データ分析 → Week3-4: 原材料テスト → Month2: パラメータ最適化 → Month3: 効果測定","is_correct":true,"partial_score":4},{"id":"5b","text":"目標: 3ヶ月で歩留まり90%回復、6ヶ月で93%到達。不良コスト年間3億円削減","is_correct":true,"partial_score":3},{"id":"5c","text":"改善効果のモニタリングはSPC管理図を用い、週次で進捗レビューを実施","is_correct":true,"partial_score":3},{"id":"5d","text":"成果が出なければプロジェクトを即中止し、設備更新を検討する","is_correct":false,"partial_score":1}]',
 '{"ideal_choices":["5a","5b","5c"],"essential_points":["具体的なスケジュール","定量的な目標設定","モニタリング体制"],"scoring_anchors":{"1":"計画の概要のみ","2":"時系列の計画","3":"定量目標あり","4":"モニタリング手法まで設計","5":"マイルストーン・撤退基準まで明確化"}}',
 '「いつまでに・何を・どの水準で」達成するかを明確にしましょう。',
 '["feasibility","impact","expression"]', 20, 5);


-- 問題3: 小売業のDX推進（basic）
INSERT INTO case_study_problems (
  id, title, case_text, primary_category_id, primary_subcategory_id,
  difficulty, industry, scenario_type, estimated_minutes, step_count,
  status, is_ai_generated
) VALUES (
  problem3_id,
  '地方スーパーマーケットのDX推進',
  'C社は地方都市で3店舗を展開するスーパーマーケット（従業員150名、年間売上30億円）です。創業40年の老舗企業で、地域住民からの信頼は厚いものの、売上は3年連続で前年比3%減少しています。

主な課題は以下の通りです：
- 顧客の高齢化（60歳以上が55%）と若年層の流出
- 大手ネットスーパーの進出による競争激化
- 在庫管理が手作業中心で、食品廃棄率が業界平均の1.5倍
- 従業員の平均年齢52歳で、デジタルスキルが低い

社長は「デジタル化で何とかしたい」と考えていますが、IT予算は年間500万円しかなく、社内にIT専任者はいません。

あなたはC社のDX推進アドバイザーとして、現実的なDX推進計画を策定してください。',
  'ai_digital_utilization', 'ai_digital_utilization',
  'basic', '小売', 'DX推進', 25, 5,
  'active', false
);

INSERT INTO case_study_steps (problem_id, step_number, step_name, description, category_id, subcategory_id, question_type, options, model_answer, hint, target_skills, max_score, display_order) VALUES
(problem3_id, 1, '現状理解と課題の優先順位付け',
 'C社が抱える複数の課題を整理し、DXで解決すべき優先課題を特定してください。',
 'logical_thinking_problem_solving', 'structured_thinking', 'hybrid',
 '[{"id":"1a","text":"食品廃棄率の改善が最優先。コスト削減効果が明確で、DXの成果を実感しやすい","is_correct":true,"partial_score":4},{"id":"1b","text":"若年層の集客が最優先。ECサイトの構築を急ぐべき","is_correct":false,"partial_score":1},{"id":"1c","text":"従業員のデジタルスキル向上が先決。まずは研修から始める","is_correct":true,"partial_score":2},{"id":"1d","text":"大手ネットスーパーへの対抗として、即座にネット販売を開始すべき","is_correct":false,"partial_score":0}]',
 '{"ideal_choices":["1a","1c"],"essential_points":["課題の優先順位付け","実行可能性の考慮","予算制約の認識"],"scoring_anchors":{"1":"課題の列挙のみ","2":"優先順位の提示","3":"優先順位の根拠","4":"予算・人材制約を考慮した優先順位","5":"短期効果と中長期戦略の両立"}}',
 '予算500万円とIT人材不在の制約を忘れずに。「小さく始めて大きく育てる」アプローチを考えましょう。',
 '["problem_setting","structuring_logic"]', 20, 1),

(problem3_id, 2, 'DX施策の選定',
 '限られた予算と人材で実行可能なDX施策を選んでください。',
 'ai_digital_utilization', 'ai_digital_utilization', 'hybrid',
 '[{"id":"2a","text":"クラウド型の在庫管理システム導入（月額5万円程度）で食品廃棄を削減","is_correct":true,"partial_score":4},{"id":"2b","text":"LINEを活用した顧客コミュニケーション（チラシ配信・クーポン）で来店促進","is_correct":true,"partial_score":3},{"id":"2c","text":"自社ECサイトをフルスクラッチで開発し、ネット販売を開始","is_correct":false,"partial_score":0},{"id":"2d","text":"POSデータ分析ツール導入で、売れ筋商品の発注精度を向上","is_correct":true,"partial_score":3}]',
 '{"ideal_choices":["2a","2b","2d"],"essential_points":["低コストで始められるツール選定","既存業務の改善が先","顧客接点のデジタル化"],"scoring_anchors":{"1":"ツールの列挙のみ","2":"予算内の施策を選定","3":"導入効果の説明","4":"優先順位と導入ステップ","5":"ROIを意識した施策設計"}}',
 '年間500万円の予算で何ができるか考えましょう。SaaS（月額課金型）のサービスが現実的です。',
 '["proposal_specificity","feasibility"]', 20, 2),

(problem3_id, 3, '推進体制の検討',
 'IT専任者不在の中で、DXをどのように推進するか体制を考えてください。',
 'leadership_hr', 'leadership_hr', 'hybrid',
 '[{"id":"3a","text":"デジタルに関心のある若手社員2-3名を「DX推進チーム」として兼任で任命","is_correct":true,"partial_score":4},{"id":"3b","text":"外部のITコンサルタントに月2回のアドバイザリー契約を結ぶ","is_correct":true,"partial_score":3},{"id":"3c","text":"IT専任者を年収600万円で採用する","is_correct":false,"partial_score":1},{"id":"3d","text":"ベンダーの導入支援サービスを活用し、初期設定と研修を依頼","is_correct":true,"partial_score":3}]',
 '{"ideal_choices":["3a","3b","3d"],"essential_points":["社内推進体制の構築","外部リソースの活用","人材育成の視点"],"scoring_anchors":{"1":"体制の概要のみ","2":"社内・外部の役割分担","3":"具体的な人数と役割","4":"育成計画を含む","5":"持続可能な推進体制の設計"}}',
 '全部自社でやる必要はありません。外部の力をうまく借りる方法を考えましょう。',
 '["perspective_diversity","feasibility"]', 20, 3),

(problem3_id, 4, '導入スケジュールの策定',
 '1年間の具体的な導入スケジュールを策定してください。',
 'project_operations', 'process_design_optimization', 'hybrid',
 '[{"id":"4a","text":"Q1: 在庫管理システム選定・導入（1店舗パイロット）、DXチーム結成","is_correct":true,"partial_score":4},{"id":"4b","text":"Q2: パイロット結果検証、残り2店舗への展開、LINE公式アカウント開設","is_correct":true,"partial_score":3},{"id":"4c","text":"Q3-Q4: POSデータ分析開始、廃棄率改善効果の測定、次年度計画策定","is_correct":true,"partial_score":3},{"id":"4d","text":"Q1にすべてのシステムを同時導入し、一気に全店舗展開","is_correct":false,"partial_score":0}]',
 '{"ideal_choices":["4a","4b","4c"],"essential_points":["段階的な導入計画","パイロット検証","効果測定の仕組み"],"scoring_anchors":{"1":"スケジュールの概要のみ","2":"四半期単位の計画","3":"パイロット検証を含む","4":"効果測定の基準設定","5":"リスク対応と修正サイクルまで設計"}}',
 'いきなり全店舗ではなく、1店舗で試してから展開する方が安全です。',
 '["proposal_specificity","expression"]', 20, 4),

(problem3_id, 5, '期待効果とKPI設定',
 'DX推進による期待効果を定量・定性の両面から述べ、モニタリングするKPIを設定してください。',
 'strategy_management', 'business_strategy_management', 'hybrid',
 '[{"id":"5a","text":"食品廃棄率を業界平均まで削減（1.5倍→1.0倍）し、年間約3,000万円のコスト削減を目指す","is_correct":true,"partial_score":4},{"id":"5b","text":"LINE会員1,000名獲得し、デジタルクーポンで来店頻度を月1回増加","is_correct":true,"partial_score":3},{"id":"5c","text":"従業員のデジタルスキル向上により、業務効率10%改善","is_correct":true,"partial_score":3},{"id":"5d","text":"DXにより売上を初年度で20%増加させる","is_correct":false,"partial_score":0}]',
 '{"ideal_choices":["5a","5b","5c"],"essential_points":["定量的なKPI設定","現実的な目標値","コスト削減と売上向上の両面"],"scoring_anchors":{"1":"定性的な期待のみ","2":"定量目標あり","3":"複数のKPI設定","4":"現実的な目標値と根拠","5":"PDCAサイクルまで設計"}}',
 '非現実的な大きな数字ではなく、地に足のついた目標を設定しましょう。',
 '["impact","expression","originality"]', 20, 5);

END $$;
