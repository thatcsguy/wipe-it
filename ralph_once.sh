# ralph.sh
# Usage: ./ralph.sh <iterations>

set -e

claude --permission-mode acceptEdits "$(cat <<'EOF'
@prd.json @progress.txt

1. Decide which task from the PRD to work on next. This should be the one YOU decide has the highest priority - not necessarily the first in the list. ONLY WORK ON A SINGLE TASK.

2. Validate your work using the playwright plugin. Don't save any screenshots to the repo.

3. After completing the task, append to progress.txt:
   - Task completed and PRD item reference
   - Key decisions made and reasoning
   - Files changed
   - Any blockers or notes for next iteration
   Keep entries concise. Sacrifice grammar for the sake of concision. This file helps future iterations skip exploration.

4. Make a git commit of that feature, and updates to prd.json and progress.txt.
   - Keep changes small and focused:
     - One logical change per commit
     - If a task feels too large, break it into subtasks
     - Prefer multiple small commits over one large commit

If, while implementing the feature, you notice that all work in the PRD is complete, output <promise>COMPLETE</promise>.
EOF
)"
