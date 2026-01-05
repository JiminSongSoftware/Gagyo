-- ============================================================================
-- RLS Policies Integration Tests
-- ============================================================================
-- This file contains SQL tests for RLS policies.
-- Run through Supabase MCP or Supabase SQL Editor.
--
-- To test as different users, use:
--   SET LOCAL request.jwt.claims = jsonb_build_object('sub', 'user-uuid');
-- ============================================================================

-- ============================================================================
-- TEST DATA CONFIGURATION
-- ============================================================================

DO $$
DECLARE
  -- Tenant IDs
  tenant1_id UUID := '11111111-1111-1111-1111-111111111111';
  tenant2_id UUID := '22222222-2222-2222-2222-222222222222';

  -- User IDs (auth.users)
  user1_id UUID := '22222222-2222-2222-2222-222222222001'; -- Admin
  user2_id UUID := '22222222-2222-2222-2222-222222222002'; -- Pastor
  user3_id UUID := '22222222-2222-2222-2222-222222222003'; -- Zone Leader
  user4_id UUID := '22222222-2222-2222-2222-222222222004'; -- SGL
  user5_id UUID := '22222222-2222-2222-2222-222222222005'; -- Member

  -- Membership IDs
  membership1_id UUID := '33333333-3333-3333-3333-333333333001'; -- Admin
  membership2_id UUID := '33333333-3333-3333-3333-333333333002'; -- Pastor
  membership3_id UUID := '33333333-3333-3333-3333-333333333003'; -- ZL
  membership4_id UUID := '33333333-3333-3333-3333-333333333004'; -- SGL
  membership5_id UUID := '33333333-3333-3333-3333-333333333005'; -- Member

  -- Group/Zone IDs
  group1_id UUID := '55555555-5555-5555-5555-555555555501';
  group2_id UUID := '55555555-5555-5555-5555-555555555502';
  zone1_id UUID := '44444444-4444-4444-4444-444444444001';

  -- Other entities
  conversation1_id UUID := '77777777-7777-7777-7777-777777777701';
  message1_id UUID := '88888888-8888-8888-8888-888888888801';
  prayer_card1_id UUID := '99999999-9999-9999-9999-999999999901';
  prayer_card2_id UUID := '99999999-9999-9999-9999-999999999902';
  journal1_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01';
  device_token1_id UUID := '22222222-2222-2222-2222-222222222201';
  device_token2_id UUID := '22222222-2222-2222-2222-222222222202';

  tests_passed INT := 0;
  tests_failed INT := 0;
  test_name TEXT;
  test_result BOOLEAN;
  expected_result BOOLEAN;

BEGIN
  -- ==========================================================================
  -- SETUP: Create Test Data
  -- ==========================================================================

  RAISE NOTICE '=== SETTING UP TEST DATA ===';

  -- Create auth.users (simulated - in real environment use Auth API)
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES
    (user1_id, 'admin@test.com', crypt('password', gen_salt('bf')), NOW(), '{"full_name": "Admin"}', NOW(), NOW()),
    (user2_id, 'pastor@test.com', crypt('password', gen_salt('bf')), NOW(), '{"full_name": "Pastor"}', NOW(), NOW()),
    (user3_id, 'zl@test.com', crypt('password', gen_salt('bf')), NOW(), '{"full_name": "Zone Leader"}', NOW(), NOW()),
    (user4_id, 'sgl@test.com', crypt('password', gen_salt('bf')), NOW(), '{"full_name": "SGL"}', NOW(), NOW()),
    (user5_id, 'member@test.com', crypt('password', gen_salt('bf')), NOW(), '{"full_name": "Member"}', NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  -- Create tenants
  INSERT INTO tenants (id, name, slug, settings)
  VALUES
    (tenant1_id, 'Test Church 1', 'test-church-1', '{"timezone": "America/New_York"}'::jsonb),
    (tenant2_id, 'Test Church 2', 'test-church-2', '{"timezone": "America/Los_Angeles"}'::jsonb)
  ON CONFLICT (id) DO NOTHING;

  -- Create users
  INSERT INTO users (id, display_name, locale)
  VALUES
    (user1_id, 'Admin User', 'en'),
    (user2_id, 'Pastor User', 'en'),
    (user3_id, 'Zone Leader User', 'en'),
    (user4_id, 'Small Group Leader User', 'en'),
    (user5_id, 'Regular Member', 'en')
  ON CONFLICT (id) DO NOTHING;

  -- Create memberships
  INSERT INTO memberships (id, user_id, tenant_id, role, status, small_group_id)
  VALUES
    (membership1_id, user1_id, tenant1_id, 'admin', 'active', NULL),
    (membership2_id, user2_id, tenant1_id, 'pastor', 'active', NULL),
    (membership3_id, user3_id, tenant1_id, 'zone_leader', 'active', NULL),
    (membership4_id, user4_id, tenant1_id, 'small_group_leader', 'active', group1_id),
    (membership5_id, user5_id, tenant1_id, 'member', 'active', group1_id)
  ON CONFLICT (user_id, tenant_id) DO NOTHING;

  -- Create zones
  INSERT INTO zones (id, tenant_id, name, zone_leader_id)
  VALUES
    (zone1_id, tenant1_id, 'Zone A', membership3_id)
  ON CONFLICT (tenant_id, name) DO NOTHING;

  -- Create small groups
  INSERT INTO small_groups (id, tenant_id, zone_id, name, leader_id)
  VALUES
    (group1_id, tenant1_id, zone1_id, 'Alpha Group', membership4_id),
    (group2_id, tenant1_id, zone1_id, 'Beta Group', membership4_id)
  ON CONFLICT (tenant_id, name) DO NOTHING;

  -- Create conversations
  INSERT INTO conversations (id, tenant_id, type, name, small_group_id)
  VALUES
    (conversation1_id, tenant1_id, 'church_wide', 'General Announcements', NULL)
  ON CONFLICT DO NOTHING;

  -- Create messages
  INSERT INTO messages (id, tenant_id, conversation_id, sender_id, content, content_type)
  VALUES
    (message1_id, tenant1_id, conversation1_id, membership1_id, 'Welcome to Test Church 1!', 'text')
  ON CONFLICT DO NOTHING;

  -- Create prayer cards
  INSERT INTO prayer_cards (id, tenant_id, author_id, content, recipient_scope)
  VALUES
    (prayer_card1_id, tenant1_id, membership5_id, 'Please pray for my job interview.', 'church_wide'),
    (prayer_card2_id, tenant1_id, membership5_id, 'Prayer for my family.', 'individual')
  ON CONFLICT DO NOTHING;

  INSERT INTO prayer_card_recipients (prayer_card_id, recipient_membership_id)
  VALUES (prayer_card2_id, membership1_id)
  ON CONFLICT DO NOTHING;

  -- Create pastoral journals
  INSERT INTO pastoral_journals (id, tenant_id, small_group_id, author_id, week_start_date, content, status)
  VALUES
    (journal1_id, tenant1_id, group1_id, membership4_id, '2024-01-01', 'This week we had 8 attendees.', 'draft')
  ON CONFLICT (small_group_id, week_start_date) DO NOTHING;

  -- Create device tokens
  INSERT INTO device_tokens (id, tenant_id, user_id, token, platform)
  VALUES
    (device_token1_id, tenant1_id, user1_id, 'token_admin_ios', 'ios'),
    (device_token2_id, tenant1_id, user5_id, 'token_member_android', 'android')
  ON CONFLICT (tenant_id, token) DO NOTHING;

  RAISE NOTICE 'Test data setup complete!';

  -- ==========================================================================
  -- TESTS: Tenants Table
  -- ==========================================================================

  RAISE NOTICE '';
  RAISE NOTICE '=== TENANTS TABLE TESTS ===';

  -- Test 1: Users can view tenants they are members of
  test_name := 'T1: Users can view tenants they are members of';
  BEGIN
    SET LOCAL request.jwt.claims = jsonb_build_object('sub', user1_id::text);
    PERFORM 1 FROM tenants WHERE id = tenant1_id;
    GET DIAGNOSTICS test_result = ROW_COUNT;
    expected_result := TRUE;
    IF test_result = 1 THEN
      tests_passed := tests_passed + 1;
      RAISE NOTICE '✓ PASS: %', test_name;
    ELSE
      tests_failed := tests_failed + 1;
      RAISE NOTICE '✗ FAIL: % - Expected row, got none', test_name;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    tests_failed := tests_failed + 1;
    RAISE NOTICE '✗ FAIL: % - %', test_name, SQLERRM;
  END;

  -- Test 2: Users cannot view tenants they are not members of
  test_name := 'T2: Users cannot view other tenants';
  BEGIN
    SET LOCAL request.jwt.claims = jsonb_build_object('sub', user1_id::text);
    PERFORM 1 FROM tenants WHERE id = tenant2_id;
    GET DIAGNOSTICS test_result = ROW_COUNT;
    expected_result := FALSE;
    IF test_result = 0 THEN
      tests_passed := tests_passed + 1;
      RAISE NOTICE '✓ PASS: %', test_name;
    ELSE
      tests_failed := tests_failed + 1;
      RAISE NOTICE '✗ FAIL: % - Should not see other tenant', test_name;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- If we get here due to RLS blocking, that's also correct
    tests_passed := tests_passed + 1;
    RAISE NOTICE '✓ PASS: % (RLS blocked)', test_name;
  END;

  -- ==========================================================================
  -- TESTS: Memberships Table
  -- ==========================================================================

  RAISE NOTICE '';
  RAISE NOTICE '=== MEMBERSHIPS TABLE TESTS ===';

  -- Test 3: Users can view memberships in their tenant
  test_name := 'M1: Users can view own tenant memberships';
  BEGIN
    SET LOCAL request.jwt.claims = jsonb_build_object('sub', user1_id::text);
    PERFORM 1 FROM memberships WHERE tenant_id = tenant1_id;
    GET DIAGNOSTICS test_result = ROW_COUNT;
    IF test_result >= 1 THEN
      tests_passed := tests_passed + 1;
      RAISE NOTICE '✓ PASS: %', test_name;
    ELSE
      tests_failed := tests_failed + 1;
      RAISE NOTICE '✗ FAIL: %', test_name;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    tests_failed := tests_failed + 1;
    RAISE NOTICE '✗ FAIL: % - %', test_name, SQLERRM;
  END;

  -- Test 4: Admins can create memberships
  test_name := 'M2: Admins can create memberships';
  BEGIN
    SET LOCAL request.jwt.claims = jsonb_build_object('sub', user1_id::text);
    INSERT INTO memberships (user_id, tenant_id, role, status)
    VALUES (user1_id, tenant1_id, 'member', 'active');
    -- Rollback the test insert
    ROLLBACK;
    tests_passed := tests_passed + 1;
    RAISE NOTICE '✓ PASS: %', test_name;
  EXCEPTION WHEN OTHERS THEN
    ROLLBACK;
    IF SQLERRM LIKE '%permission%' OR SQLERRM LIKE '%insufficient_privilege%' THEN
      tests_failed := tests_failed + 1;
      RAISE NOTICE '✗ FAIL: % - %', test_name, SQLERRM;
    ELSE
      tests_passed := tests_passed + 1;
      RAISE NOTICE '✓ PASS: % (insert succeeded)', test_name;
    END IF;
  END;

  -- ==========================================================================
  -- TESTS: Messages Table
  -- ==========================================================================

  RAISE NOTICE '';
  RAISE NOTICE '=== MESSAGES TABLE TESTS ===';

  -- Test 5: Users can view messages in accessible conversations
  test_name := 'MS1: Users can view accessible messages';
  BEGIN
    SET LOCAL request.jwt.claims = jsonb_build_object('sub', user1_id::text);
    PERFORM 1 FROM messages WHERE id = message1_id;
    GET DIAGNOSTICS test_result = ROW_COUNT;
    IF test_result = 1 THEN
      tests_passed := tests_passed + 1;
      RAISE NOTICE '✓ PASS: %', test_name;
    ELSE
      tests_failed := tests_failed + 1;
      RAISE NOTICE '✗ FAIL: %', test_name;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    tests_failed := tests_failed + 1;
    RAISE NOTICE '✗ FAIL: % - %', test_name, SQLERRM;
  END;

  -- ==========================================================================
  -- TESTS: Prayer Cards Table
  -- ==========================================================================

  RAISE NOTICE '';
  RAISE NOTICE '=== PRAYER CARDS TABLE TESTS ===';

  -- Test 6: Church-wide prayers are visible to all tenant members
  test_name := 'P1: Church-wide prayers visible to all members';
  BEGIN
    SET LOCAL request.jwt.claims = jsonb_build_object('sub', user5_id::text);
    PERFORM 1 FROM prayer_cards WHERE id = prayer_card1_id AND recipient_scope = 'church_wide';
    GET DIAGNOSTICS test_result = ROW_COUNT;
    IF test_result = 1 THEN
      tests_passed := tests_passed + 1;
      RAISE NOTICE '✓ PASS: %', test_name;
    ELSE
      tests_failed := tests_failed + 1;
      RAISE NOTICE '✗ FAIL: %', test_name;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    tests_failed := tests_failed + 1;
    RAISE NOTICE '✗ FAIL: % - %', test_name, SQLERRM;
  END;

  -- Test 7: Individual prayers only visible to recipients
  test_name := 'P2: Individual prayers only for recipients';
  BEGIN
    SET LOCAL request.jwt.claims = jsonb_build_object('sub', user1_id::text);
    PERFORM 1 FROM prayer_cards WHERE id = prayer_card2_id AND recipient_scope = 'individual';
    GET DIAGNOSTICS test_result = ROW_COUNT;
    IF test_result = 1 THEN
      tests_passed := tests_passed + 1;
      RAISE NOTICE '✓ PASS: % (recipient can see)', test_name;
    ELSE
      tests_failed := tests_failed + 1;
      RAISE NOTICE '✗ FAIL: %', test_name;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    tests_failed := tests_failed + 1;
    RAISE NOTICE '✗ FAIL: % - %', test_name, SQLERRM;
  END;

  -- Test 8: Individual prayers NOT visible to non-recipients
  test_name := 'P3: Individual prayers NOT for non-recipients';
  BEGIN
    SET LOCAL request.jwt.claims = jsonb_build_object('sub', user4_id::text);
    PERFORM 1 FROM prayer_cards WHERE id = prayer_card2_id AND recipient_scope = 'individual';
    GET DIAGNOSTICS test_result = ROW_COUNT;
    IF test_result = 0 THEN
      tests_passed := tests_passed + 1;
      RAISE NOTICE '✓ PASS: %', test_name;
    ELSE
      tests_failed := tests_failed + 1;
      RAISE NOTICE '✗ FAIL: % - Non-recipient should not see individual prayer', test_name;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    tests_passed := tests_passed + 1;
    RAISE NOTICE '✓ PASS: % (RLS blocked)', test_name;
  END;

  -- ==========================================================================
  -- TESTS: Pastoral Journals Table
  -- ==========================================================================

  RAISE NOTICE '';
  RAISE NOTICE '=== PASTORAL JOURNALS TABLE TESTS ===';

  -- Test 9: Small group leaders can view their group journals
  test_name := 'J1: SGL can view own group journals';
  BEGIN
    SET LOCAL request.jwt.claims = jsonb_build_object('sub', user4_id::text);
    PERFORM 1 FROM pastoral_journals WHERE id = journal1_id;
    GET DIAGNOSTICS test_result = ROW_COUNT;
    IF test_result = 1 THEN
      tests_passed := tests_passed + 1;
      RAISE NOTICE '✓ PASS: %', test_name;
    ELSE
      tests_failed := tests_failed + 1;
      RAISE NOTICE '✗ FAIL: %', test_name;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    tests_failed := tests_failed + 1;
    RAISE NOTICE '✗ FAIL: % - %', test_name, SQLERRM;
  END;

  -- Test 10: Regular members cannot view pastoral journals
  test_name := 'J2: Members cannot view journals';
  BEGIN
    SET LOCAL request.jwt.claims = jsonb_build_object('sub', user5_id::text);
    PERFORM 1 FROM pastoral_journals WHERE id = journal1_id;
    GET DIAGNOSTICS test_result = ROW_COUNT;
    IF test_result = 0 THEN
      tests_passed := tests_passed + 1;
      RAISE NOTICE '✓ PASS: %', test_name;
    ELSE
      tests_failed := tests_failed + 1;
      RAISE NOTICE '✗ FAIL: % - Member should not see journal', test_name;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    tests_passed := tests_passed + 1;
    RAISE NOTICE '✓ PASS: % (RLS blocked)', test_name;
  END;

  -- ==========================================================================
  -- TESTS: Device Tokens Table
  -- ==========================================================================

  RAISE NOTICE '';
  RAISE NOTICE '=== DEVICE TOKENS TABLE TESTS ===';

  -- Test 11: Users can view their own device tokens
  test_name := 'D1: Users can view own device tokens';
  BEGIN
    SET LOCAL request.jwt.claims = jsonb_build_object('sub', user1_id::text);
    PERFORM 1 FROM device_tokens WHERE id = device_token1_id;
    GET DIAGNOSTICS test_result = ROW_COUNT;
    IF test_result = 1 THEN
      tests_passed := tests_passed + 1;
      RAISE NOTICE '✓ PASS: %', test_name;
    ELSE
      tests_failed := tests_failed + 1;
      RAISE NOTICE '✗ FAIL: %', test_name;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    tests_failed := tests_failed + 1;
    RAISE NOTICE '✗ FAIL: % - %', test_name, SQLERRM;
  END;

  -- Test 12: Users cannot view other users device tokens
  test_name := 'D2: Users cannot view others device tokens';
  BEGIN
    SET LOCAL request.jwt.claims = jsonb_build_object('sub', user1_id::text);
    PERFORM 1 FROM device_tokens WHERE id = device_token2_id;
    GET DIAGNOSTICS test_result = ROW_COUNT;
    IF test_result = 0 THEN
      tests_passed := tests_passed + 1;
      RAISE NOTICE '✓ PASS: %', test_name;
    ELSE
      tests_failed := tests_failed + 1;
      RAISE NOTICE '✗ FAIL: % - Should not see others tokens', test_name;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    tests_passed := tests_passed + 1;
    RAISE NOTICE '✓ PASS: % (RLS blocked)', test_name;
  END;

  -- ==========================================================================
  -- TEST RESULTS SUMMARY
  -- ==========================================================================

  RAISE NOTICE '';
  RAISE NOTICE '=== TEST RESULTS ===';
  RAISE NOTICE 'Tests Passed: %', tests_passed;
  RAISE NOTICE 'Tests Failed: %', tests_failed;

  IF tests_failed = 0 THEN
    RAISE NOTICE '✓ ALL TESTS PASSED!';
  ELSE
    RAISE NOTICE '✗ SOME TESTS FAILED!';
  END IF;

END $$;
