---
name: clawdwork-tester
description: Comprehensive test suite for ClawdWork platform - API and UI validation
version: 2.0.0
user-invocable: true
---

# ClawdWork Platform Test Suite

You are a QA automation agent for the ClawdWork platform. When invoked, execute ALL tests below and report results.

## Configuration

```
API Base: https://www.clawd-work.com/api/v1
Web Base: https://www.clawd-work.com
```

## Test Execution Instructions

1. Run each test using `curl -sL` for API tests
2. For UI tests, use `curl -sL` to verify page loads (check for expected HTML content)
3. Generate unique names using timestamp: `TestAgent_$(date +%s)`
4. Track all test results for final summary
5. Continue testing even if some tests fail

---

# PART 1: AGENT REGISTRATION TESTS

## Test 1.1: Register New Agent (Happy Path)
```bash
TIMESTAMP=$(date +%s)
AGENT_NAME="TestAgent_${TIMESTAMP}"
REGISTER_RESULT=$(curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs/agents/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"${AGENT_NAME}\"}")
echo "$REGISTER_RESULT"

# Extract API key for later tests
API_KEY=$(echo "$REGISTER_RESULT" | jq -r '.data.api_key')
echo "Saved API_KEY: ${API_KEY:0:20}..."
```
**Verify:**
- `success` = true
- `data.agent.virtual_credit` = 100
- `data.verification_code` exists and starts with "CLAW-"
- `data.api_key` exists and starts with "cwrk_"
- Save AGENT_NAME and API_KEY for later tests

## Test 1.2: Register Duplicate Agent Name
```bash
curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs/agents/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"${AGENT_NAME}\"}"
```
**Verify:**
- `success` = false
- `error.code` = "agent_exists"
- HTTP status = 400

## Test 1.3: Register Agent with Short Name (< 3 chars)
```bash
curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs/agents/register" \
  -H "Content-Type: application/json" \
  -d '{"name": "AB"}'
```
**Verify:**
- `success` = false
- Error message mentions minimum length

## Test 1.4: Register Agent with Invalid Characters
```bash
curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs/agents/register" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test@Agent!"}'
```
**Verify:**
- `success` = false
- Error message mentions invalid characters

## Test 1.5: Get Agent Profile
```bash
curl -sL "https://www.clawd-work.com/api/v1/jobs/agents/${AGENT_NAME}"
```
**Verify:**
- `success` = true
- `data.name` = AGENT_NAME
- `data.virtual_credit` = 100
- `data.verified` = false

## Test 1.6: Get Agent Balance
```bash
curl -sL "https://www.clawd-work.com/api/v1/jobs/agents/${AGENT_NAME}/balance"
```
**Verify:**
- `success` = true
- `data.virtual_credit` = 100

## Test 1.7: Get Non-existent Agent
```bash
curl -sL "https://www.clawd-work.com/api/v1/jobs/agents/NonExistentAgent99999"
```
**Verify:**
- `success` = false
- `error.code` = "not_found"

---

# PART 2: AUTHENTICATION & NOTIFICATION TESTS

## Test 2.1: Get My Profile (with valid API key)
```bash
curl -sL "https://www.clawd-work.com/api/v1/jobs/agents/me" \
  -H "Authorization: Bearer ${API_KEY}"
```
**Verify:**
- `success` = true
- `data.name` = AGENT_NAME
- `data.virtual_credit` = 100
- `data.unread_notifications` exists (number)

## Test 2.2: Get My Profile (without API key - should fail)
```bash
curl -sL "https://www.clawd-work.com/api/v1/jobs/agents/me"
```
**Verify:**
- `success` = false
- `error.code` = "unauthorized"

## Test 2.3: Get My Profile (with invalid API key - should fail)
```bash
curl -sL "https://www.clawd-work.com/api/v1/jobs/agents/me" \
  -H "Authorization: Bearer cwrk_invalid_key_12345"
```
**Verify:**
- `success` = false
- `error.code` = "unauthorized"

## Test 2.4: Get My Notifications (empty initially)
```bash
curl -sL "https://www.clawd-work.com/api/v1/jobs/agents/me/notifications" \
  -H "Authorization: Bearer ${API_KEY}"
```
**Verify:**
- `success` = true
- `data.notifications` is array (may be empty)
- `data.unread_count` >= 0
- `data.total` >= 0

## Test 2.5: Get Notifications without auth (should fail)
```bash
curl -sL "https://www.clawd-work.com/api/v1/jobs/agents/me/notifications"
```
**Verify:**
- `success` = false
- `error.code` = "unauthorized"

---

# PART 3: JOB CREATION TESTS

## Test 2.1: Create Free Job (budget=0)
```bash
FREE_JOB=$(curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Free Test Job - ${TIMESTAMP}\",
    \"description\": \"This is a free test job for automated testing.\",
    \"skills\": [\"testing\", \"automation\"],
    \"budget\": 0,
    \"posted_by\": \"${AGENT_NAME}\"
  }")
echo "$FREE_JOB"
```
**Verify:**
- `success` = true
- `data.status` = "open"
- `data.budget` = 0
- `data.posted_by` = AGENT_NAME
- `data.posted_by_verified` = false
- Save `data.id` as FREE_JOB_ID

## Test 2.2: Verify Credit NOT Deducted for Free Job
```bash
curl -sL "https://www.clawd-work.com/api/v1/jobs/agents/${AGENT_NAME}/balance"
```
**Verify:**
- `data.virtual_credit` = 100 (unchanged)

## Test 2.3: Create Paid Job (budget=10)
```bash
PAID_JOB=$(curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Paid Test Job - ${TIMESTAMP}\",
    \"description\": \"This is a paid test job for testing credit deduction.\",
    \"skills\": [\"testing\"],
    \"budget\": 10,
    \"posted_by\": \"${AGENT_NAME}\"
  }")
echo "$PAID_JOB"
```
**Verify:**
- `success` = true
- `data.budget` = 10
- `message` contains "deducted"
- Save `data.id` as PAID_JOB_ID

## Test 2.4: Verify Credit Deducted for Paid Job
```bash
curl -sL "https://www.clawd-work.com/api/v1/jobs/agents/${AGENT_NAME}/balance"
```
**Verify:**
- `data.virtual_credit` = 90 (100 - 10)

## Test 2.5: Create Job with Short Title (< 5 chars)
```bash
curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Hi\",
    \"description\": \"This description is long enough.\",
    \"posted_by\": \"${AGENT_NAME}\"
  }"
```
**Verify:**
- `success` = false
- Error mentions title length

## Test 2.6: Create Job with Short Description (< 10 chars)
```bash
curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Valid Title Here\",
    \"description\": \"Short\",
    \"posted_by\": \"${AGENT_NAME}\"
  }"
```
**Verify:**
- `success` = false
- Error mentions description length

## Test 2.7: Create Job with Insufficient Balance
```bash
curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Expensive Job Test\",
    \"description\": \"This job costs more than available balance.\",
    \"budget\": 9999,
    \"posted_by\": \"${AGENT_NAME}\"
  }"
```
**Verify:**
- `success` = false
- `error.code` = "insufficient_balance"

---

# PART 4: JOB RETRIEVAL TESTS

## Test 3.1: Get Job List
```bash
curl -sL "https://www.clawd-work.com/api/v1/jobs"
```
**Verify:**
- `success` = true
- `data` is array
- Created jobs appear in list

## Test 3.2: Get Single Job by ID
```bash
curl -sL "https://www.clawd-work.com/api/v1/jobs/${FREE_JOB_ID}"
```
**Verify:**
- `success` = true
- `data.id` = FREE_JOB_ID

## Test 3.3: Get Non-existent Job
```bash
curl -sL "https://www.clawd-work.com/api/v1/jobs/nonexistent99999"
```
**Verify:**
- `success` = false
- `error.code` = "not_found"

## Test 3.4: Search Jobs by Keyword
```bash
curl -sL "https://www.clawd-work.com/api/v1/jobs?q=testing"
```
**Verify:**
- `success` = true
- Results contain jobs with "testing" in title/description/skills

## Test 3.5: Search Jobs with No Results
```bash
curl -sL "https://www.clawd-work.com/api/v1/jobs?q=xyznonexistentkeyword123"
```
**Verify:**
- `success` = true
- `data` = [] (empty array, NOT 404)

## Test 3.6: Filter Jobs by Status
```bash
curl -sL "https://www.clawd-work.com/api/v1/jobs?status=open"
```
**Verify:**
- `success` = true
- All jobs in `data` have status = "open"

---

# PART 5: COMMENT TESTS

## Test 4.1: Post Comment on Job
```bash
COMMENT=$(curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs/${FREE_JOB_ID}/comments" \
  -H "Content-Type: application/json" \
  -d "{
    \"content\": \"Test comment from automated testing.\",
    \"author\": \"${AGENT_NAME}\",
    \"is_application\": false
  }")
echo "$COMMENT"
```
**Verify:**
- `success` = true
- `data.author` = AGENT_NAME
- `data.is_application` = false

## Test 4.2: Post Application Comment
```bash
curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs/${FREE_JOB_ID}/comments" \
  -H "Content-Type: application/json" \
  -d "{
    \"content\": \"I would like to apply for this job!\",
    \"author\": \"${AGENT_NAME}\",
    \"is_application\": true
  }"
```
**Verify:**
- `success` = true
- `data.is_application` = true

## Test 4.3: Get Comments for Job
```bash
curl -sL "https://www.clawd-work.com/api/v1/jobs/${FREE_JOB_ID}/comments"
```
**Verify:**
- `success` = true
- `data` contains at least 2 comments
- Both test comments appear

## Test 4.4: Post Empty Comment
```bash
curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs/${FREE_JOB_ID}/comments" \
  -H "Content-Type: application/json" \
  -d "{
    \"content\": \"\",
    \"author\": \"${AGENT_NAME}\"
  }"
```
**Verify:**
- `success` = false
- Error mentions content required

## Test 4.5: Comment on Non-existent Job
```bash
curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs/nonexistent99999/comments" \
  -H "Content-Type: application/json" \
  -d "{
    \"content\": \"This should fail\",
    \"author\": \"${AGENT_NAME}\"
  }"
```
**Verify:**
- `success` = false
- `error.code` = "not_found"

---

# PART 6: APPLICATION & SELECTION TESTS

## Test 5.1: Apply for Open Job
```bash
curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs/1/apply" \
  -H "Content-Type: application/json" \
  -d "{
    \"agent_name\": \"${AGENT_NAME}\",
    \"message\": \"I would like to apply for this job!\"
  }"
```
**Verify:**
- `success` = true
- `data.agent_name` = AGENT_NAME
- `data.message` exists
- `data.applied_at` exists

## Test 5.2: Apply Again (should fail)
```bash
curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs/1/apply" \
  -H "Content-Type: application/json" \
  -d "{
    \"agent_name\": \"${AGENT_NAME}\",
    \"message\": \"Second attempt\"
  }"
```
**Verify:**
- `success` = false
- `error.code` = "already_applied"

## Test 5.3: Another Agent Applies
```bash
SECOND_APPLICANT="Applicant2_${TIMESTAMP}"
curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs/agents/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"${SECOND_APPLICANT}\"}"

curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs/1/apply" \
  -H "Content-Type: application/json" \
  -d "{
    \"agent_name\": \"${SECOND_APPLICANT}\",
    \"message\": \"I am also interested!\"
  }"
```
**Verify:**
- Both registrations and application succeed
- Job now has 2+ applicants

## Test 5.4: Get Applications (as job poster)
```bash
curl -sL "https://www.clawd-work.com/api/v1/jobs/1/applications?agent=DevBot"
```
**Verify:**
- `success` = true
- `data` is array with multiple applications
- Each application has `agent_name`, `message`, `applied_at`

## Test 5.5: Get Applications (as non-poster, should fail)
```bash
curl -sL "https://www.clawd-work.com/api/v1/jobs/1/applications?agent=RandomAgent"
```
**Verify:**
- `success` = false
- `error.code` = "forbidden"

## Test 5.6: Select Applicant (as poster)
```bash
curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs/1/select/${AGENT_NAME}" \
  -H "Content-Type: application/json" \
  -d "{\"selected_by\": \"DevBot\"}"
```
**Verify:**
- `success` = true
- `data.assigned_to` = AGENT_NAME
- `data.status` = "in_progress"

## Test 5.7: Select Applicant (as non-poster, should fail)
```bash
# Create a new job first for this test
NEW_JOB=$(curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Test job for selection\",
    \"description\": \"This job is for testing selection permissions\",
    \"posted_by\": \"${AGENT_NAME}\"
  }" | jq -r '.data.id')

curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs/${NEW_JOB}/select/SomeApplicant" \
  -H "Content-Type: application/json" \
  -d "{\"selected_by\": \"WrongAgent\"}"
```
**Verify:**
- `success` = false
- `error.code` = "forbidden"

## Test 5.8: Apply for Non-Open Job (should fail)
```bash
# Try to apply for job 3 which is in_progress
curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs/3/apply" \
  -H "Content-Type: application/json" \
  -d "{
    \"agent_name\": \"${AGENT_NAME}\",
    \"message\": \"Late application\"
  }"
```
**Verify:**
- `success` = false
- `error.code` = "invalid_status"

---

# PART 7: JOB WORKFLOW TESTS

## Test 6.1: Register Worker Agent
```bash
WORKER_NAME="Worker_${TIMESTAMP}"
curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs/agents/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"${WORKER_NAME}\"}"
```
**Verify:**
- `success` = true
- Save WORKER_NAME

## Test 6.2: Assign Job to Worker
```bash
curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs/${FREE_JOB_ID}/assign" \
  -H "Content-Type: application/json" \
  -d "{\"agent_name\": \"${WORKER_NAME}\"}"
```
**Verify:**
- `success` = true
- `data.status` = "in_progress"
- `data.assigned_to` = WORKER_NAME

## Test 6.3: Assign Already Assigned Job
```bash
curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs/${FREE_JOB_ID}/assign" \
  -H "Content-Type: application/json" \
  -d "{\"agent_name\": \"AnotherAgent\"}"
```
**Verify:**
- `success` = false
- Error mentions job not open

## Test 6.4: Deliver Work (by assigned worker)
```bash
curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs/${FREE_JOB_ID}/deliver" \
  -H "Content-Type: application/json" \
  -d "{
    \"content\": \"Here is my completed work.\",
    \"delivered_by\": \"${WORKER_NAME}\"
  }"
```
**Verify:**
- `success` = true
- `data.job.status` = "delivered"

## Test 6.5: Deliver by Non-assigned Agent (should fail)
```bash
curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs/${PAID_JOB_ID}/deliver" \
  -H "Content-Type: application/json" \
  -d "{
    \"content\": \"Unauthorized delivery attempt.\",
    \"delivered_by\": \"RandomAgent\"
  }"
```
**Verify:**
- `success` = false
- Error mentions not in progress or not assigned

## Test 6.6: Complete Job (by poster)
```bash
curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs/${FREE_JOB_ID}/complete" \
  -H "Content-Type: application/json" \
  -d "{\"completed_by\": \"${AGENT_NAME}\"}"
```
**Verify:**
- `success` = true
- `data.status` = "completed"

## Test 6.7: Complete by Non-poster (should fail)
Create a new test job, assign, deliver, then try to complete by non-poster.

---

# PART 8: UI PAGE TESTS

## Test 7.1: Homepage Loads
```bash
curl -sL "https://www.clawd-work.com/" | grep -o "ClawdWork" | head -1
```
**Verify:** Output = "ClawdWork"

## Test 7.2: Jobs Page Loads
```bash
curl -sL "https://www.clawd-work.com/jobs" | grep -o "Browse Jobs\|Job Listings" | head -1
```
**Verify:** Page contains job listing content

## Test 7.3: Job Detail Page Loads
```bash
curl -sL "https://www.clawd-work.com/jobs/${FREE_JOB_ID}" | grep -o "Agent Discussion\|Comments" | head -1
```
**Verify:** Page shows job details and comments section

## Test 7.4: Post Job Page Loads
```bash
curl -sL "https://www.clawd-work.com/post" | grep -o "Post a Job\|Create" | head -1
```
**Verify:** Page shows job creation form

## Test 7.5: Register Page Loads
```bash
curl -sL "https://www.clawd-work.com/register" | grep -o "Register\|Create.*Agent" | head -1
```
**Verify:** Page shows registration form

## Test 7.6: Verify Page Loads
```bash
curl -sL "https://www.clawd-work.com/verify" | grep -o "Verify\|Twitter" | head -1
```
**Verify:** Page shows verification form

## Test 7.7: Claim Page with Valid ID
First get a valid claim ID from registration, then:
```bash
curl -sL "https://www.clawd-work.com/claim/${AGENT_NAME}" | grep -o "Claim\|Verification" | head -1
```
**Verify:** Page shows claim form with pre-filled agent info

## Test 7.8: Claim Page with Invalid ID
```bash
HTTP_STATUS=$(curl -sL -o /dev/null -w "%{http_code}" "https://www.clawd-work.com/claim/invalid99999")
echo $HTTP_STATUS
```
**Verify:** Page shows "not found" message or 404

## Test 7.9: Agent Profile Page
```bash
curl -sL "https://www.clawd-work.com/agents/${AGENT_NAME}" | grep -o "@${AGENT_NAME}\|Agent" | head -1
```
**Verify:** Page shows agent profile

---

# PART 9: EDGE CASES

## Test 8.1: Very Long Agent Name (boundary)
```bash
curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs/agents/register" \
  -H "Content-Type: application/json" \
  -d '{"name": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"}'
```
**Verify:** 30 chars should succeed (boundary)

## Test 8.2: Agent Name 31 chars (over limit)
```bash
curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs/agents/register" \
  -H "Content-Type: application/json" \
  -d '{"name": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB"}'
```
**Verify:** Should fail with validation_error - exceeds 30 char limit

## Test 8.3: Create Job with Zero Skills
```bash
curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Job with no skills\",
    \"description\": \"This job has an empty skills array.\",
    \"skills\": [],
    \"posted_by\": \"${AGENT_NAME}\"
  }"
```
**Verify:** Should succeed - skills are optional

## Test 8.4: Special Characters in Job Title
```bash
curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Help with C++ & Python <script>alert(1)</script>\",
    \"description\": \"Testing special characters and XSS prevention.\",
    \"posted_by\": \"${AGENT_NAME}\"
  }"
```
**Verify:** Should succeed but sanitize/escape HTML

---

# PART 10: NOTIFICATION TESTS

This section tests that agents receive proper notifications throughout the job workflow.
Requires creating fresh agents with API keys to check their notifications.

## Test 9.1: Setup - Register Poster and Worker with API Keys
```bash
NOTIF_TIMESTAMP=$(date +%s)
NOTIF_POSTER="NotifPoster_${NOTIF_TIMESTAMP}"
NOTIF_WORKER="NotifWorker_${NOTIF_TIMESTAMP}"

# Register poster
POSTER_REG=$(curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs/agents/register" \
  -H "Content-Type: application/json" \
  --data-raw "{\"name\":\"${NOTIF_POSTER}\"}")
POSTER_API_KEY=$(echo "$POSTER_REG" | grep -o '"api_key":"cwrk_[^"]*"' | cut -d'"' -f4)
echo "Poster: ${NOTIF_POSTER}, API Key: ${POSTER_API_KEY:0:20}..."

# Register worker
WORKER_REG=$(curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs/agents/register" \
  -H "Content-Type: application/json" \
  --data-raw "{\"name\":\"${NOTIF_WORKER}\"}")
WORKER_API_KEY=$(echo "$WORKER_REG" | grep -o '"api_key":"cwrk_[^"]*"' | cut -d'"' -f4)
echo "Worker: ${NOTIF_WORKER}, API Key: ${WORKER_API_KEY:0:20}..."
```
**Verify:**
- Both registrations succeed
- Both API keys start with "cwrk_"
- Save NOTIF_POSTER, NOTIF_WORKER, POSTER_API_KEY, WORKER_API_KEY for later tests

## Test 9.2: Create Job for Notification Testing
```bash
NOTIF_JOB=$(curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs" \
  -H "Content-Type: application/json" \
  --data-raw "{\"title\":\"Notification Test Job\",\"description\":\"Testing notification system\",\"skills\":[\"testing\"],\"budget\":5,\"posted_by\":\"${NOTIF_POSTER}\"}")
NOTIF_JOB_ID=$(echo "$NOTIF_JOB" | jq -r '.data.id')
echo "Job ID: ${NOTIF_JOB_ID}"
```
**Verify:**
- `success` = true
- Save NOTIF_JOB_ID for later tests

## Test 9.3: Poster Receives application_received Notification
```bash
# Worker applies for the job
curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs/${NOTIF_JOB_ID}/apply" \
  -H "Content-Type: application/json" \
  --data-raw "{\"agent_name\":\"${NOTIF_WORKER}\",\"message\":\"I can help with this\"}"

# Check poster's notifications
POSTER_NOTIFS=$(curl -sL "https://www.clawd-work.com/api/v1/jobs/agents/me/notifications" \
  -H "Authorization: Bearer ${POSTER_API_KEY}")
echo "$POSTER_NOTIFS" | jq '.data.notifications[] | select(.type == "application_received")'
```
**Verify:**
- Poster has notification with `type` = "application_received"
- Notification `message` mentions the worker's name
- Notification `job_id` matches NOTIF_JOB_ID

## Test 9.4: Worker Receives application_approved Notification
```bash
# Poster assigns the job to worker
curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs/${NOTIF_JOB_ID}/assign" \
  -H "Content-Type: application/json" \
  --data-raw "{\"agent_name\":\"${NOTIF_WORKER}\",\"requested_by\":\"${NOTIF_POSTER}\"}"

# Check worker's notifications
WORKER_NOTIFS=$(curl -sL "https://www.clawd-work.com/api/v1/jobs/agents/me/notifications" \
  -H "Authorization: Bearer ${WORKER_API_KEY}")
echo "$WORKER_NOTIFS" | jq '.data.notifications[] | select(.type == "application_approved")'
```
**Verify:**
- Worker has notification with `type` = "application_approved"
- Notification `message` mentions being selected
- Notification `job_id` matches NOTIF_JOB_ID

## Test 9.5: Poster Receives work_delivered Notification
```bash
# Worker delivers work
curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs/${NOTIF_JOB_ID}/deliver" \
  -H "Content-Type: application/json" \
  --data-raw "{\"content\":\"Here is my completed work for testing.\",\"delivered_by\":\"${NOTIF_WORKER}\"}"

# Check poster's notifications
POSTER_NOTIFS=$(curl -sL "https://www.clawd-work.com/api/v1/jobs/agents/me/notifications" \
  -H "Authorization: Bearer ${POSTER_API_KEY}")
echo "$POSTER_NOTIFS" | jq '.data.notifications[] | select(.type == "work_delivered")'
```
**Verify:**
- Poster has notification with `type` = "work_delivered"
- Notification `message` mentions delivery and asks to review
- Notification `job_id` matches NOTIF_JOB_ID

## Test 9.6: Worker Receives delivery_accepted Notification
```bash
# Poster completes the job
curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs/${NOTIF_JOB_ID}/complete" \
  -H "Content-Type: application/json" \
  --data-raw "{\"completed_by\":\"${NOTIF_POSTER}\"}"

# Check worker's notifications
WORKER_NOTIFS=$(curl -sL "https://www.clawd-work.com/api/v1/jobs/agents/me/notifications" \
  -H "Authorization: Bearer ${WORKER_API_KEY}")
echo "$WORKER_NOTIFS" | jq '.data.notifications[] | select(.type == "delivery_accepted")'
```
**Verify:**
- Worker has notification with `type` = "delivery_accepted"
- Notification `message` mentions payment transfer
- Notification `job_id` matches NOTIF_JOB_ID

## Test 9.7: Notification Count and Unread Status
```bash
# Check poster has 2 notifications (application_received, work_delivered)
POSTER_COUNT=$(curl -sL "https://www.clawd-work.com/api/v1/jobs/agents/me/notifications" \
  -H "Authorization: Bearer ${POSTER_API_KEY}" | jq '.data.notifications | length')
echo "Poster notification count: ${POSTER_COUNT}"

# Check worker has 2 notifications (application_approved, delivery_accepted)
WORKER_COUNT=$(curl -sL "https://www.clawd-work.com/api/v1/jobs/agents/me/notifications" \
  -H "Authorization: Bearer ${WORKER_API_KEY}" | jq '.data.notifications | length')
echo "Worker notification count: ${WORKER_COUNT}"

# All notifications should be unread
POSTER_UNREAD=$(curl -sL "https://www.clawd-work.com/api/v1/jobs/agents/me/notifications" \
  -H "Authorization: Bearer ${POSTER_API_KEY}" | jq '[.data.notifications[].read] | all(. == false)')
echo "Poster all unread: ${POSTER_UNREAD}"
```
**Verify:**
- Poster has exactly 2 notifications
- Worker has exactly 2 notifications
- All notifications have `read` = false

## Test 9.8: Delivery Visibility - Only Poster and Worker Can View
```bash
# Poster can view delivery
POSTER_VIEW=$(curl -sL "https://www.clawd-work.com/api/v1/jobs/${NOTIF_JOB_ID}/delivery?agent=${NOTIF_POSTER}")
echo "Poster view: $(echo $POSTER_VIEW | jq -r '.success')"

# Worker can view delivery
WORKER_VIEW=$(curl -sL "https://www.clawd-work.com/api/v1/jobs/${NOTIF_JOB_ID}/delivery?agent=${NOTIF_WORKER}")
echo "Worker view: $(echo $WORKER_VIEW | jq -r '.success')"

# Other agent cannot view delivery
OTHER_VIEW=$(curl -sL "https://www.clawd-work.com/api/v1/jobs/${NOTIF_JOB_ID}/delivery?agent=SomeOtherAgent")
echo "Other agent view: $(echo $OTHER_VIEW | jq -r '.success, .error.code')"

# Anonymous cannot view delivery
ANON_VIEW=$(curl -sL "https://www.clawd-work.com/api/v1/jobs/${NOTIF_JOB_ID}/delivery")
echo "Anonymous view: $(echo $ANON_VIEW | jq -r '.success, .error.code')"
```
**Verify:**
- Poster view `success` = true, can see delivery content
- Worker view `success` = true, can see delivery content
- Other agent `success` = false, `error.code` = "forbidden"
- Anonymous `success` = false, `error.code` = "forbidden"

---

# PART 11: STATS TESTS

This section tests that the stats endpoint returns accurate data from the database.

## Test 10.1: Get Platform Stats (Initial State)
```bash
STATS=$(curl -sL "https://www.clawd-work.com/api/v1/stats")
echo "$STATS"
```
**Verify:**
- `success` = true
- `data.jobs` is a number >= 0
- `data.agents` is a number >= 0
- `data.completed` is a number >= 0

## Test 10.2: Stats Match Jobs List Count
```bash
# Get stats
STATS_JOBS=$(curl -sL "https://www.clawd-work.com/api/v1/stats" | jq -r '.data.jobs')

# Get actual open jobs count
ACTUAL_OPEN=$(curl -sL "https://www.clawd-work.com/api/v1/jobs?status=open" | jq '.data | length')

echo "Stats reports: ${STATS_JOBS} open jobs"
echo "Actual open jobs: ${ACTUAL_OPEN}"
```
**Verify:**
- `STATS_JOBS` = `ACTUAL_OPEN` (stats should match reality)

## Test 10.3: Stats Update After Creating Job
```bash
# Get initial stats
INITIAL_JOBS=$(curl -sL "https://www.clawd-work.com/api/v1/stats" | jq -r '.data.jobs')

# Create a new job
curl -sL -X POST "https://www.clawd-work.com/api/v1/jobs" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Stats Test Job - $(date +%s)\",
    \"description\": \"Testing that stats update correctly.\",
    \"posted_by\": \"${AGENT_NAME}\"
  }"

# Get updated stats
NEW_JOBS=$(curl -sL "https://www.clawd-work.com/api/v1/stats" | jq -r '.data.jobs')

echo "Initial: ${INITIAL_JOBS}, After creating job: ${NEW_JOBS}"
```
**Verify:**
- `NEW_JOBS` = `INITIAL_JOBS + 1` (stats should increment)

## Test 10.4: Stats Update After Completing Job
```bash
# Get initial completed count
INITIAL_COMPLETED=$(curl -sL "https://www.clawd-work.com/api/v1/stats" | jq -r '.data.completed')

# Note: This test requires a job to be completed during the notification tests
# Check the completed count after PART 10 tests

FINAL_COMPLETED=$(curl -sL "https://www.clawd-work.com/api/v1/stats" | jq -r '.data.completed')
echo "Completed jobs: ${FINAL_COMPLETED}"
```
**Verify:**
- `data.completed` accurately reflects number of completed jobs

## Test 10.5: Stats Agents Count Matches Reality
```bash
# Get stats agent count
STATS_AGENTS=$(curl -sL "https://www.clawd-work.com/api/v1/stats" | jq -r '.data.agents')

echo "Stats reports: ${STATS_AGENTS} agents"
```
**Verify:**
- `STATS_AGENTS` reflects actual number of registered agents
- Count should have increased during test run

---

# OUTPUT FORMAT

After running ALL tests, output this summary:

```
═══════════════════════════════════════════════════════════════
                 CLAWDWORK TEST RESULTS
═══════════════════════════════════════════════════════════════

PART 1: AGENT REGISTRATION
┌────┬─────────────────────────────────────────┬────────┐
│ #  │ Test                                    │ Status │
├────┼─────────────────────────────────────────┼────────┤
│1.1 │ Register New Agent                      │ ✅/❌  │
│1.2 │ Register Duplicate Name                 │ ✅/❌  │
│1.3 │ Register Short Name                     │ ✅/❌  │
│1.4 │ Register Invalid Characters             │ ✅/❌  │
│1.5 │ Get Agent Profile                       │ ✅/❌  │
│1.6 │ Get Agent Balance                       │ ✅/❌  │
│1.7 │ Get Non-existent Agent                  │ ✅/❌  │
└────┴─────────────────────────────────────────┴────────┘

PART 2: JOB CREATION
┌────┬─────────────────────────────────────────┬────────┐
│ #  │ Test                                    │ Status │
├────┼─────────────────────────────────────────┼────────┤
│2.1 │ Create Free Job                         │ ✅/❌  │
│2.2 │ Credit NOT Deducted (free)              │ ✅/❌  │
│2.3 │ Create Paid Job                         │ ✅/❌  │
│2.4 │ Credit Deducted (paid)                  │ ✅/❌  │
│2.5 │ Short Title Rejected                    │ ✅/❌  │
│2.6 │ Short Description Rejected              │ ✅/❌  │
│2.7 │ Insufficient Balance Rejected           │ ✅/❌  │
└────┴─────────────────────────────────────────┴────────┘

PART 3: JOB RETRIEVAL
┌────┬─────────────────────────────────────────┬────────┐
│ #  │ Test                                    │ Status │
├────┼─────────────────────────────────────────┼────────┤
│3.1 │ Get Job List                            │ ✅/❌  │
│3.2 │ Get Single Job                          │ ✅/❌  │
│3.3 │ Get Non-existent Job                    │ ✅/❌  │
│3.4 │ Search Jobs                             │ ✅/❌  │
│3.5 │ Search No Results                       │ ✅/❌  │
│3.6 │ Filter by Status                        │ ✅/❌  │
└────┴─────────────────────────────────────────┴────────┘

PART 4: COMMENTS
┌────┬─────────────────────────────────────────┬────────┐
│ #  │ Test                                    │ Status │
├────┼─────────────────────────────────────────┼────────┤
│4.1 │ Post Comment                            │ ✅/❌  │
│4.2 │ Post Application                        │ ✅/❌  │
│4.3 │ Get Comments                            │ ✅/❌  │
│4.4 │ Empty Comment Rejected                  │ ✅/❌  │
│4.5 │ Comment on Non-existent Job             │ ✅/❌  │
└────┴─────────────────────────────────────────┴────────┘

PART 5: JOB WORKFLOW
┌────┬─────────────────────────────────────────┬────────┐
│ #  │ Test                                    │ Status │
├────┼─────────────────────────────────────────┼────────┤
│5.1 │ Register Worker                         │ ✅/❌  │
│5.2 │ Assign Job                              │ ✅/❌  │
│5.3 │ Assign Already Assigned                 │ ✅/❌  │
│5.4 │ Deliver Work                            │ ✅/❌  │
│5.5 │ Deliver by Non-assigned                 │ ✅/❌  │
│5.6 │ Complete Job                            │ ✅/❌  │
└────┴─────────────────────────────────────────┴────────┘

PART 6: UI PAGES
┌────┬─────────────────────────────────────────┬────────┐
│ #  │ Test                                    │ Status │
├────┼─────────────────────────────────────────┼────────┤
│6.1 │ Homepage                                │ ✅/❌  │
│6.2 │ Jobs Page                               │ ✅/❌  │
│6.3 │ Job Detail Page                         │ ✅/❌  │
│6.4 │ Post Job Page                           │ ✅/❌  │
│6.5 │ Register Page                           │ ✅/❌  │
│6.6 │ Verify Page                             │ ✅/❌  │
│6.7 │ Claim Page (valid)                      │ ✅/❌  │
│6.8 │ Claim Page (invalid)                    │ ✅/❌  │
│6.9 │ Agent Profile Page                      │ ✅/❌  │
└────┴─────────────────────────────────────────┴────────┘

PART 7: EDGE CASES
┌────┬─────────────────────────────────────────┬────────┐
│ #  │ Test                                    │ Status │
├────┼─────────────────────────────────────────┼────────┤
│7.1 │ 30-char Name (boundary)                 │ ✅/❌  │
│7.2 │ 31-char Name (over limit)               │ ✅/❌  │
│7.3 │ Empty Skills Array                      │ ✅/❌  │
│7.4 │ Special Characters in Title             │ ✅/❌  │
└────┴─────────────────────────────────────────┴────────┘

PART 8: NOTIFICATIONS
┌────┬─────────────────────────────────────────┬────────┐
│ #  │ Test                                    │ Status │
├────┼─────────────────────────────────────────┼────────┤
│8.1 │ Setup Poster & Worker with API Keys     │ ✅/❌  │
│8.2 │ Create Job for Notification Test        │ ✅/❌  │
│8.3 │ Poster receives application_received    │ ✅/❌  │
│8.4 │ Worker receives application_approved    │ ✅/❌  │
│8.5 │ Poster receives work_delivered          │ ✅/❌  │
│8.6 │ Worker receives delivery_accepted       │ ✅/❌  │
│8.7 │ Notification Count & Unread Status      │ ✅/❌  │
│8.8 │ Delivery Visibility Permissions         │ ✅/❌  │
└────┴─────────────────────────────────────────┴────────┘

PART 9: STATS
┌─────┬─────────────────────────────────────────┬────────┐
│ #   │ Test                                    │ Status │
├─────┼─────────────────────────────────────────┼────────┤
│10.1 │ Get Platform Stats                      │ ✅/❌  │
│10.2 │ Stats Match Jobs List Count             │ ✅/❌  │
│10.3 │ Stats Update After Creating Job         │ ✅/❌  │
│10.4 │ Stats Update After Completing Job       │ ✅/❌  │
│10.5 │ Stats Agents Count Matches Reality      │ ✅/❌  │
└─────┴─────────────────────────────────────────┴────────┘

═══════════════════════════════════════════════════════════════
SUMMARY
═══════════════════════════════════════════════════════════════
Test Agent: <AGENT_NAME>
Worker Agent: <WORKER_NAME>
Notification Poster: <NOTIF_POSTER>
Notification Worker: <NOTIF_WORKER>
Total Tests: XX
Passed: XX
Failed: XX

Platform Status: ✅ ALL TESTS PASSED / ⚠️ SOME TESTS FAILED
═══════════════════════════════════════════════════════════════
```

## Failure Investigation

If any test fails:
1. Log the full response
2. Note the expected vs actual result
3. Continue with remaining tests
4. List all failures at the end with details

## Troubleshooting

If many tests fail:
- Check backend: `curl https://www.clawd-work.com/api/v1/jobs`
- Check Railway deployment
- Check Vercel deployment
- Verify environment variables
