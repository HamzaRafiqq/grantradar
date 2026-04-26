-- 012_weekly_plans.sql
CREATE TABLE IF NOT EXISTS weekly_plans (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  plan       jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_plans" ON weekly_plans FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS weekly_plan_completions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     uuid NOT NULL REFERENCES weekly_plans(id) ON DELETE CASCADE,
  task_key    text NOT NULL,  -- e.g. "urgent_0", "important_2", "social_0"
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_id, task_key)
);
ALTER TABLE weekly_plan_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_completions" ON weekly_plan_completions FOR ALL USING (
  plan_id IN (SELECT id FROM weekly_plans WHERE user_id = auth.uid())
);
