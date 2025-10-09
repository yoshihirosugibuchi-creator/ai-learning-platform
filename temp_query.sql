SELECT COUNT(*) as total_quiz_answers, COUNT(DISTINCT user_id) as unique_users, session_type, COUNT(*) as count_by_type FROM quiz_answers GROUP BY session_type;
