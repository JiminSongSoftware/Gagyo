-- ============================================================================
-- RLS Policy Validation Test
-- ============================================================================
-- This SQL validates that RLS policies are correctly defined.
-- Run through Supabase MCP or Supabase SQL Editor.
--
-- This test checks:
-- 1. RLS is enabled on all required tables
-- 2. Policies exist and have correct structure
-- 3. Policies reference auth.uid() for user identification
-- 4. Policies enforce tenant isolation
-- ============================================================================

WITH rls_validation AS (
  -- Check 1: RLS is enabled on all tenant-scoped tables
  SELECT
    'RLS Enabled' as check_category,
    tablename as table_name,
    CASE
      WHEN rowsecurity THEN 'PASS'
      ELSE 'FAIL'
    END as result
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN (
      'tenants', 'users', 'memberships', 'zones', 'small_groups', 'ministries',
      'ministry_memberships', 'conversations', 'conversation_participants', 'messages',
      'event_chat_exclusions', 'prayer_cards', 'prayer_card_recipients',
      'pastoral_journals', 'pastoral_journal_comments', 'notifications',
      'device_tokens', 'attachments'
    )

  UNION ALL

  -- Check 2: All tables have at least one SELECT policy
  SELECT
    'Has SELECT Policy' as check_category,
    tablename as table_name,
    CASE
      WHEN policy_count > 0 THEN 'PASS'
      ELSE 'FAIL'
    END as result
  FROM (
    SELECT
      t.tablename,
      COUNT(p.policyname) as policy_count
    FROM pg_tables t
    LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.cmd = 'SELECT'
    WHERE t.schemaname = 'public'
      AND t.tablename IN (
        'tenants', 'users', 'memberships', 'zones', 'small_groups', 'ministries',
        'ministry_memberships', 'conversations', 'conversation_participants', 'messages',
        'event_chat_exclusions', 'prayer_cards', 'prayer_card_recipients',
        'pastoral_journals', 'pastoral_journal_comments', 'notifications',
        'device_tokens', 'attachments'
      )
    GROUP BY t.tablename
  ) sub

  UNION ALL

  -- Check 3: device_tokens has tenant_id in policies
  SELECT
    'device_tokens tenant isolation' as check_category,
    'device_tokens' as table_name,
    CASE
      WHEN qual LIKE '%tenant_id%' THEN 'PASS'
      ELSE 'FAIL'
    END as result
  FROM pg_policies
  WHERE tablename = 'device_tokens' AND cmd = 'SELECT'

  UNION ALL

  -- Check 4: device_tokens requires user_id = auth.uid()
  SELECT
    'device_tokens user ownership' as check_category,
    'device_tokens' as table_name,
    CASE
      WHEN qual LIKE '%user_id = auth.uid()%' THEN 'PASS'
      ELSE 'FAIL'
    END as result
  FROM pg_policies
  WHERE tablename = 'device_tokens' AND cmd = 'SELECT'

  UNION ALL

  -- Check 5: prayer_cards has recipient_scope filtering
  SELECT
    'prayer_cards scope filtering' as check_category,
    'prayer_cards' as table_name,
    CASE
      WHEN qual LIKE '%recipient_scope%' THEN 'PASS'
      ELSE 'FAIL'
    END as result
  FROM pg_policies
  WHERE tablename = 'prayer_cards' AND cmd = 'SELECT'

  UNION ALL

  -- Check 6: pastoral_journals has role-based access
  SELECT
    'pastoral_journals role filtering' as check_category,
    'pastoral_journals' as table_name,
    CASE
      WHEN qual LIKE '%role%' OR qual LIKE '%has_role%' THEN 'PASS'
      ELSE 'FAIL'
    END as result
  FROM pg_policies
  WHERE tablename = 'pastoral_journals' AND cmd = 'SELECT'
)
SELECT
  check_category,
  table_name,
  result,
  CASE WHEN result = 'PASS' THEN '✓' ELSE '✗' END as status
FROM rls_validation
ORDER BY
  CASE WHEN result = 'FAIL' THEN 0 ELSE 1 END,
  check_category,
  table_name;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Get a summary of all checks
WITH summary AS (
  SELECT
    COUNT(*) FILTER (WHERE result = 'PASS') as passed,
    COUNT(*) FILTER (WHERE result = 'FAIL') as failed
  FROM rls_validation
)
SELECT
  '=== RLS POLICY VALIDATION SUMMARY ===' as summary,
  passed as tests_passed,
  failed as tests_failed,
  CASE
    WHEN failed = 0 THEN '✓ ALL CHECKS PASSED'
    ELSE '✗ SOME CHECKS FAILED'
  END as overall_status
FROM summary;
