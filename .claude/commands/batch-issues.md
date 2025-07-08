You are an AI assistant tasked with creating GitHub issues. You can handle both individual feature requests AND batch JSON files containing multiple issues.

<thinking>
I need to determine what type of input I'm dealing with:
1. Is it a JSON file path? (ends with .json)
2. Is it raw JSON content? (starts with [ or {)
3. Is it a plain text feature description?

Based on the input type, I'll either:

- Process a batch of issues from JSON
- Create a single issue from a feature description
  </thinking>

## Input Detection and Processing

First, analyze the input to determine its type:

<input>
#$ARGUMENTS
</input>

### Step 1: Detect Input Type

1. **JSON File**: If input ends with `.json`, read the file
2. **Raw JSON**: If input starts with `[` or `{`, parse as JSON
3. **Feature Description**: Otherwise, treat as single issue description

### Step 2A: Batch Processing (JSON Input)

If JSON input is detected, process multiple issues:

**Expected JSON Formats:**

**Format 1 (Array):**

```json
[
  {
    "title": "Issue title",
    "body": "Complete issue description",
    "labels": ["label1", "label2"]
  }
]
```

**Format 2 (Object with issues):**

```json
{
  "issues": [
    {
      "title": "Issue title",
      "priority": "High",
      "description": "Description",
      "labels": ["label1", "label2"],
      "files": ["file1.ts"],
      "acceptance_criteria": ["AC1", "AC2"]
    }
  ]
}
```

**Batch Processing Steps:**

1. **Set Repository**:

   ```bash
   gh repo set-default wavlake/web
   ```

2. **For each issue in JSON**:

   - Extract title, body/description, labels
   - Format the body appropriately
   - Create issue with GitHub CLI
   - Add labels after creation

3. **Track Progress**:
   - Count total issues
   - Report success/failure for each
   - Summary at the end

### Step 2B: Single Issue Processing (Text Input)

If text input is detected, create a single well-structured issue:

**Single Issue Template:**

# Title

## Current Situation

## Proposed Solution

## Implementation Details

## Acceptance Criteria

**Processing Steps:**

1. Analyze the feature description
2. Expand into structured issue format
3. Create issue with GitHub CLI
4. Extract and add any mentioned labels

### Step 3: GitHub CLI Execution

**For Batch Issues:**

```bash
# For each issue in the batch
gh issue create \
  --repo wavlake/web \
  --title "$TITLE" \
  --body "$BODY" \
  --label "enhancement"

# Add additional labels if they exist
ISSUE_NUMBER=$(echo $ISSUE_URL | grep -o '[0-9]*$')
gh issue edit $ISSUE_NUMBER --add-label "$LABELS" 2>/dev/null || true
```

**For Single Issue:**

```bash
gh issue create \
  --repo wavlake/web \
  --title "Concise Title Here" \
  --body "$(cat <<'EOF'
[Structured issue description]
EOF
)" \
  --label "enhancement"
```

### Important Notes

- Always set repository to `wavlake/web` before creating issues
- Start with "enhancement" label (guaranteed to exist)
- Handle missing labels gracefully
- For batch processing, continue even if some issues fail
- Return issue URLs for all created issues

### Output Format

**For Batch Processing:**

```
Setting repository to wavlake/web...
Processing 5 issues from JSON...

Creating issue 1/5: "Enable Firebase Authentication"
✓ Created: https://github.com/wavlake/web/issues/23

Creating issue 2/5: "Add Password Reset Flow"
✓ Created: https://github.com/wavlake/web/issues/24

...

Summary:
- Total issues: 5
- Successfully created: 5
- Failed: 0
```

**For Single Issue:**

```
Creating GitHub issue...
✓ Created: https://github.com/wavlake/web/issues/25

Title: [Issue Title]
URL: https://github.com/wavlake/web/issues/25
```
