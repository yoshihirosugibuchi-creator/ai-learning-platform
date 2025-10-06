#!/usr/bin/env python3
"""
AI Learning Analytics - Python Statistical Service
統計分析サービス（Python標準ライブラリベース）

制約条件: pip/scipy/numpy利用不可
解決策: Python標準ライブラリ（statistics, math）での実装
"""

import sys
import json
import statistics
import math
from typing import List, Dict, Any, Tuple, Optional

class LearningStatisticsEngine:
    """AI学習統計分析エンジン - 標準ライブラリベース"""
    
    def __init__(self):
        self.min_sample_size = 3  # 統計的有意性の最小サンプル数
    
    def calculate_t_test_manual(self, sample1: List[float], sample2: List[float]) -> Dict[str, float]:
        """
        独立二標本t検定（手動実装）
        scipy.statsが使えないため標準ライブラリで実装
        """
        if len(sample1) < self.min_sample_size or len(sample2) < self.min_sample_size:
            return {
                "t_statistic": 0.0,
                "p_value": 1.0,
                "significant": False,
                "error": "insufficient_sample_size"
            }
        
        try:
            # サンプル統計量計算
            mean1 = statistics.mean(sample1)
            mean2 = statistics.mean(sample2)
            var1 = statistics.variance(sample1)
            var2 = statistics.variance(sample2)
            n1, n2 = len(sample1), len(sample2)
            
            # プールされた標準偏差
            pooled_se = math.sqrt(var1/n1 + var2/n2)
            
            # t統計量
            t_stat = (mean1 - mean2) / pooled_se if pooled_se > 0 else 0
            
            # 自由度
            df = n1 + n2 - 2
            
            # 簡易p値推定（正確ではないが実用的）
            abs_t = abs(t_stat)
            if abs_t > 2.576:  # 99%信頼区間
                p_value = 0.01
            elif abs_t > 1.960:  # 95%信頼区間  
                p_value = 0.05
            elif abs_t > 1.645:  # 90%信頼区間
                p_value = 0.10
            else:
                p_value = 0.20
            
            return {
                "t_statistic": t_stat,
                "p_value": p_value,
                "significant": p_value < 0.05,
                "effect_size": abs(mean1 - mean2) / math.sqrt((var1 + var2) / 2),
                "mean_difference": mean1 - mean2,
                "sample_sizes": [n1, n2]
            }
            
        except Exception as e:
            return {
                "t_statistic": 0.0,
                "p_value": 1.0,
                "significant": False,
                "error": str(e)
            }
    
    def calculate_correlation_manual(self, x: List[float], y: List[float]) -> Dict[str, float]:
        """
        ピアソン相関係数（手動実装）
        """
        if len(x) != len(y) or len(x) < self.min_sample_size:
            return {
                "correlation": 0.0,
                "p_value": 1.0,
                "significant": False,
                "error": "invalid_data"
            }
        
        try:
            # 相関係数計算
            n = len(x)
            mean_x = statistics.mean(x)
            mean_y = statistics.mean(y)
            
            numerator = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n))
            sum_sq_x = sum((x[i] - mean_x) ** 2 for i in range(n))
            sum_sq_y = sum((y[i] - mean_y) ** 2 for i in range(n))
            
            denominator = math.sqrt(sum_sq_x * sum_sq_y)
            correlation = numerator / denominator if denominator > 0 else 0
            
            # t統計量による有意性検定
            if abs(correlation) < 1.0:
                t_stat = correlation * math.sqrt((n - 2) / (1 - correlation ** 2))
                abs_t = abs(t_stat)
                p_value = 0.05 if abs_t > 1.960 else 0.20
            else:
                p_value = 0.001
            
            return {
                "correlation": correlation,
                "p_value": p_value,
                "significant": p_value < 0.05,
                "sample_size": n
            }
            
        except Exception as e:
            return {
                "correlation": 0.0,
                "p_value": 1.0,
                "significant": False,
                "error": str(e)
            }
    
    def analyze_time_pattern_significance(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        時間パターンの統計的有意性分析
        朝と夜の学習パフォーマンス比較
        """
        morning_accuracies = data.get('morning_accuracies', [])
        evening_accuracies = data.get('evening_accuracies', [])
        
        if not morning_accuracies or not evening_accuracies:
            return {
                "result": "insufficient_data",
                "recommendation": "より多くの学習データが必要です"
            }
        
        t_test_result = self.calculate_t_test_manual(morning_accuracies, evening_accuracies)
        
        morning_avg = statistics.mean(morning_accuracies)
        evening_avg = statistics.mean(evening_accuracies)
        
        return {
            "t_test": t_test_result,
            "morning_performance": {
                "average_accuracy": morning_avg,
                "sample_size": len(morning_accuracies),
                "std_dev": statistics.stdev(morning_accuracies) if len(morning_accuracies) > 1 else 0
            },
            "evening_performance": {
                "average_accuracy": evening_avg,
                "sample_size": len(evening_accuracies),
                "std_dev": statistics.stdev(evening_accuracies) if len(evening_accuracies) > 1 else 0
            },
            "recommendation": self._generate_time_recommendation(morning_avg, evening_avg, t_test_result)
        }
    
    def analyze_difficulty_progression(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        難易度進行の統計分析
        """
        difficulty_scores = data.get('difficulty_progression', [])
        time_points = data.get('time_points', list(range(len(difficulty_scores))))
        
        if len(difficulty_scores) < self.min_sample_size:
            return {
                "result": "insufficient_data",
                "trend": "unknown"
            }
        
        # 線形回帰の傾き計算（手動実装）
        correlation_result = self.calculate_correlation_manual(time_points, difficulty_scores)
        
        # トレンド分析
        if len(difficulty_scores) >= 2:
            recent_trend = difficulty_scores[-1] - difficulty_scores[0]
            trend_direction = "improving" if recent_trend > 0 else "declining" if recent_trend < 0 else "stable"
        else:
            trend_direction = "unknown"
        
        return {
            "correlation_with_time": correlation_result,
            "trend_direction": trend_direction,
            "average_score": statistics.mean(difficulty_scores),
            "score_variance": statistics.variance(difficulty_scores) if len(difficulty_scores) > 1 else 0,
            "recommendation": self._generate_difficulty_recommendation(correlation_result, trend_direction)
        }
    
    def analyze_learning_clustering(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        学習パターンクラスタリング（簡易版）
        k-meansの代わりに統計的グループ分け
        """
        learning_sessions = data.get('learning_sessions', [])
        
        if len(learning_sessions) < 3:
            return {
                "result": "insufficient_data",
                "clusters": []
            }
        
        # 特徴量抽出
        accuracies = [session.get('accuracy', 0) for session in learning_sessions]
        durations = [session.get('duration_minutes', 0) for session in learning_sessions]
        
        # 簡易クラスタリング（四分位による分類）
        accuracy_q1 = statistics.quantiles(accuracies, n=4)[0] if len(accuracies) >= 4 else statistics.median(accuracies)
        accuracy_q3 = statistics.quantiles(accuracies, n=4)[2] if len(accuracies) >= 4 else statistics.median(accuracies)
        
        duration_median = statistics.median(durations)
        
        clusters = []
        for i, session in enumerate(learning_sessions):
            acc = session.get('accuracy', 0)
            dur = session.get('duration_minutes', 0)
            
            if acc >= accuracy_q3 and dur >= duration_median:
                cluster = "high_performance_long"
            elif acc >= accuracy_q3 and dur < duration_median:
                cluster = "high_performance_short"
            elif acc <= accuracy_q1 and dur >= duration_median:
                cluster = "low_performance_long"
            else:
                cluster = "average_performance"
            
            clusters.append({
                "session_index": i,
                "cluster": cluster,
                "accuracy": acc,
                "duration": dur
            })
        
        return {
            "clusters": clusters,
            "cluster_summary": self._summarize_clusters(clusters),
            "recommendation": self._generate_cluster_recommendation(clusters)
        }
    
    def _generate_time_recommendation(self, morning_avg: float, evening_avg: float, t_test: Dict) -> str:
        """時間パターンの推奨事項生成"""
        if t_test.get('significant', False):
            if morning_avg > evening_avg:
                return "朝の学習が統計的に有意に優秀です。朝の学習時間を増やすことを推奨します。"
            else:
                return "夜の学習が統計的に有意に優秀です。夜の学習時間を増やすことを推奨します。"
        else:
            return "朝と夜の学習効果に統計的な差は見られません。好みの時間帯で学習を続けてください。"
    
    def _generate_difficulty_recommendation(self, correlation: Dict, trend: str) -> str:
        """難易度進行の推奨事項生成"""
        if trend == "improving":
            return "スキルが向上しています。より挑戦的な内容に進むことをお勧めします。"
        elif trend == "declining":
            return "パフォーマンスが低下傾向にあります。基礎の復習や休憩を検討してください。"
        else:
            return "安定した学習パフォーマンスを維持しています。現在のペースを継続してください。"
    
    def _summarize_clusters(self, clusters: List[Dict]) -> Dict[str, int]:
        """クラスター要約統計"""
        summary = {}
        for cluster_info in clusters:
            cluster_name = cluster_info['cluster']
            summary[cluster_name] = summary.get(cluster_name, 0) + 1
        return summary
    
    def _generate_cluster_recommendation(self, clusters: List[Dict]) -> str:
        """クラスタリング結果の推奨事項生成"""
        summary = self._summarize_clusters(clusters)
        dominant_pattern = max(summary.keys(), key=lambda k: summary[k])
        
        recommendations = {
            "high_performance_long": "高パフォーマンス・長時間学習パターンです。効率的な学習スタイルを維持してください。",
            "high_performance_short": "高パフォーマンス・短時間学習パターンです。集中力を活かした学習が得意のようです。",
            "low_performance_long": "長時間学習しているが成果が出にくいパターンです。学習方法の見直しを推奨します。",
            "average_performance": "平均的な学習パターンです。継続的な学習を心がけてください。"
        }
        
        return recommendations.get(dominant_pattern, "学習パターンを分析中です。")

def main():
    """メイン処理: JSON入力を受け取り統計分析を実行"""
    if len(sys.argv) < 2:
        print(json.dumps({"error": "analysis_type required"}))
        sys.exit(1)
    
    analysis_type = sys.argv[1]
    
    try:
        # 標準入力からJSONデータを読み取り
        input_data = json.loads(sys.stdin.read())
        
        engine = LearningStatisticsEngine()
        
        if analysis_type == "time-pattern":
            result = engine.analyze_time_pattern_significance(input_data)
        elif analysis_type == "difficulty-progression":
            result = engine.analyze_difficulty_progression(input_data)
        elif analysis_type == "learning-clustering":
            result = engine.analyze_learning_clustering(input_data)
        else:
            result = {"error": "unknown_analysis_type"}
        
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
    except Exception as e:
        print(json.dumps({
            "error": "analysis_failed",
            "message": str(e)
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()