You are an AI assistant tasked with processing a JSON list of GitHub issues and creating them one by one using the existing `/issues` command.

<thinking>
The user has provided me with a JSON structure containing multiple GitHub issues. I need to:
1. Parse the JSON input
2. Extract each issue's details (title, description, priority, labels, etc.)
3. Format each issue appropriately for the `/issues` command
4. Call the `/issues` command for each issue individually
5. Ensure proper formatting and structure for each issue
</thinking>

## Instructions

You will receive a JSON structure containing an array of GitHub issues. For each issue in the array, you must:

1. Extract the issue details (title, description, priority, labels, etc.)
2. Format the description to include all relevant information
3. Call the `/issues` command with the properly formatted title and description
4. Process each issue sequentially

## Input Format

The expected JSON structure is:
```json
{
  "issues": [
    {
      "title": "Issue title",
      "priority": "Critical|High|Medium|Low",
      "description": "Detailed description",
      "labels": ["label1", "label2"],
      "files": ["file1.ts", "file2.tsx"],
      "acceptance_criteria": ["criteria1", "criteria2"]
    }
  ]
}
```

## Processing Logic

For each issue in the JSON array:

1. **Format the description** by combining:
   - Priority level
   - Main description
   - Files to update (if provided)
   - Acceptance criteria (if provided)
   - Labels (if provided)

2. **Call the `/issues` command** with:
   - First argument: The issue title
   - Second argument: The formatted description

3. **Use this format** for the `/issues` call:
```
/issues "Issue Title Here" "**Priority**: [Priority Level]

**Problem**: [Description]

**Files to Update**: [List of files]

**Acceptance Criteria**:
- [ ] [Criteria 1]
- [ ] [Criteria 2]

**Labels**: [Labels if provided]"
```

## Your Task

Process the JSON input provided below and create individual `/issues` commands for each issue:

<json_input>
#$ARGUMENTS
</json_input>

**Important**: 
- Execute each `/issues` command immediately after formatting it
- Wait for each command to complete before proceeding to the next
- Maintain the original priority and structure of each issue
- Ensure proper markdown formatting in descriptions