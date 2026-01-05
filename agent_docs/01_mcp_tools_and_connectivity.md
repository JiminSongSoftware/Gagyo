---
tags: [mcp, tooling, connectivity, troubleshooting]
---

# 01 MCP Tools and Connectivity

## WHAT
How to verify MCP configuration and connectivity, including restart requirements.

## WHY
- MCP-first is a hard stop policy.
- Many MCP issues require restart to take effect.

## HOW

### Verification Checklist

1. **Validate MCP server registrations**
   - Ensure expected servers are listed
   - Verify credentials/tokens are valid

### Supabase MCP Not Responding

**CRITICAL: This is a hard stop scenario.**

If Supabase MCP is not responding:
1. STOP all work immediately
2. Notify owner to fix MCP
3. Do not proceed with workarounds
4. Do not attempt alternative database access
5. Document the failure for debugging

### Common Issues and Resolutions

#### Connection Timeout
- Check network connectivity
- Verify Supabase project is accessible
- Confirm API keys are valid

#### Authentication Failure
- Rotate credentials if compromised
- Verify correct environment (dev/staging/prod)
- Check token expiration

#### Tool Not Found
- Restart host process
- Verify MCP server registration
- Check for version mismatches

## Figma Access & Visual Validation

### Primary source (required)
- Use **Figma MCP** to:
  - Inspect layouts, spacing, colors, and component structure
  - Extract images of working components
  - Validate UI changes against the source of truth

### Fallback (last resort only)
- If Figma MCP access is unavailable:
  - Reference screenshots stored in `Figma_Screenshots/`
  - Treat screenshots as read-only visual references
  - Do not infer missing states or interactions not visible in screenshots

### Prohibited
- Recreating UI purely from text descriptions
- Guessing spacing, colors, or component hierarchy when a visual source exists

## rn-debugger MCP

### Capabilities
Provides runtime inspection, logging, network tracing, device interaction,
and OCR for React Native applications.

### Available Tools

#### Connection & Logs
- scan_metro
- connect_metro
- get_apps
- get_connection_status
- get_logs
- search_logs
- clear_logs

#### Network Tracking
- get_network_requests
- search_network
- get_request_details
- get_network_stats
- clear_network

#### App Inspection & Execution
- execute_in_app
- list_debug_globals
- inspect_global
- reload_app
- get_debug_server

#### Android (ADB)
- list_android_devices
- android_screenshot
- android_install_app
- android_launch_app
- android_list_packages
- android_tap
- android_long_press
- android_swipe
- android_input_text
- android_key_event
- android_get_screen_size
- android_find_element
- android_wait_for_element

#### iOS (via rn-debugger)
- list_ios_simulators
- ios_screenshot
- ios_install_app
- ios_launch_app
- ios_open_url
- ios_terminate_app
- ios_boot_simulator
- ios_find_element
- ios_wait_for_element

#### OCR
- ocr_screenshot

### Usage Rules
- Required for runtime debugging, log inspection, and network verification
- Must be used instead of manual guessing when diagnosing issues

## ios-simulator MCP

### Capabilities
Controls and inspects the iOS Simulator environment, including UI interaction,
media capture, and app lifecycle management.

### Available Tools
- get_booted_sim_id
- open_simulator
- ui_describe_all
- ui_tap
- ui_type
- ui_swipe
- ui_describe_point
- ui_view
- screenshot
- record_video
- stop_recording
- install_app
- launch_app

### Usage Rules
- Required for iOS-specific UI validation and simulator lifecycle control
- Preferred for visual verification (screenshots, recordings)

## Documentation MCPs

### context7 MCP
Used to retrieve the most recent and authoritative documentation before:
- Fixing bugs
- Making architectural changes
- Optimizing or refactoring code

### expo-docs MCP
Must be used to verify current Expo APIs, configuration,
and platform constraints before any Expo-related change.

## Supabase MCP

### Capabilities
- Database schema inspection
- Auth and user management
- RLS policy verification
- Backend debugging

### Usage Rules
- Required for all backend-related tasks
- Do not reason about backend behavior without using this MCP