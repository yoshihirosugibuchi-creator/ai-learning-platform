#!/usr/bin/awk -f

/^      [a-z_]+: {$/ {
  table=$1
  gsub(/:/, "", table)
  gsub(/^ +/, "", table)
  
  # 関数名を除外
  if (table !~ /^(analyze_|calculate_|detect_|get_|initialize_|optimize_|predict_|process_|provide_|recalculate_|update_|add_to_)/) {
    print table
  }
}