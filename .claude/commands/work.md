You are an AI assistant tasked with addressing a GitHub issue for the wavlake/web repository. The issue can be a new feature, a feature enhancement, or a bug fix. Follow these instructions carefully to complete the task:

<thinking>
I need to approach this systematically and think through:
1. What is the exact problem or feature being requested?
2. What are the acceptance criteria and success conditions?
3. How does this fit into the existing codebase architecture?
4. What files and components will likely need to be modified?
5. What are potential edge cases or complications?
6. What testing approach should I use to validate the changes?
7. Are there any security, performance, or accessibility considerations?
8. How can I ensure I don't break existing functionality?
</thinking>

**Use extended thinking**: Work through this issue step by step, analyzing requirements, planning the implementation approach, and considering edge cases before making changes.

1. First, fetch the GitHub issue details using the following command:
   ```bash
   gh issue view #$ARGUMENTS --repo wavlake/web
   ```

**IMPORTANT**: Always specify the repository when using GitHub CLI commands:
- Use `gh issue view [issue-number] --repo wavlake/web` to fetch issues
- Use `gh pr create --repo wavlake/web` to create pull requests
- This prevents accidentally working with the wrong repository

2. Check for existing Pull Requests related to this issue:
   ```bash
   gh pr list --repo wavlake/web --search "#$ARGUMENTS"
   ```

   If a PR exists, review its status and any unresolved comments:
   ```bash
   gh pr view [pr-number] --repo wavlake/web --comments
   ```
   
   - Address any unresolved review comments, suggestions, or blocking issues
   - Check if the PR branch exists locally or needs to be checked out
   - Review the original issue for any AC failure comments from previous attempts
   - If there are unaddressed acceptance criteria or failure comments, prioritize resolving those first

3. Create or switch to the appropriate git branch:
   - If a PR branch exists, use: `git checkout [existing-branch-name]`
   - If no PR exists, create a new branch: `git checkout -b issue-#$ARGUMENTS-[short-description]`

4. Address the issue by making the necessary code changes. Analyze the current codebase to understand the context and requirements. Ensure that you:
   - Follow existing code style and conventions
   - Add comments to explain complex logic
   - Update relevant documentation
   - Work under the correct repository `wavlake/web`
   - Prioritize addressing any unresolved PR comments or AC failures from previous attempts

5. After making changes, check for TypeScript or build errors:
   - Run: `npm run ci` (this includes typecheck and build)
   - If any errors are found, address them before proceeding

6. Commit your changes:
   ```bash
   git add .
   git commit -m "fix: address issue #$ARGUMENTS - [brief description]

   🤖 Generated with [Claude Code](https://claude.ai/code)

   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

7. Push the code changes:
   ```bash
   git push origin [branch-name]
   ```

8. Create or update the Pull Request:
   - If no PR exists, use: `gh pr create --repo wavlake/web`
   - If updating an existing PR, the push will automatically update it
   - Ensure the PR is attached to the issue that was addressed
   - Provide a clear title and description for the PR, referencing the original issue

9. Evaluate your code artifacts to determine if they have addressed the original GitHub issue:
   - Pay close attention to any acceptance criteria (AC) mentioned in the issue
   - For any UI changes, fixes, or improvements, describe how you would use a Puppeteer MCP server to validate your changes and ensure they work correctly

10. **CRITICAL**: Validate Acceptance Criteria compliance:
    - Re-read the original GitHub issue to extract all acceptance criteria (AC)
    - Test each AC item against your implementation
    - For each AC item, determine if it PASSES or FAILS
    - If any AC item FAILS, document the specific failure context and add a comment to the GitHub issue explaining what still needs to be addressed

11. Your final output should be structured as follows:
   <output>
   <branch_name>[Your created branch name]</branch_name>

   <pr_status_check>
   [Document any existing PR found, its status, and how you addressed unresolved comments or AC failures]
   </pr_status_check>

   <code_changes>
   [Summarize the code changes you made]
   </code_changes>

   <error_check>
   [Describe the results of your TypeScript and build error checks]
   </error_check>

   <commit_and_push>
   [Summarize the commit and push actions you took]
   </commit_and_push>

   <pull_request>
   [Provide details about the created Pull Request]
   </pull_request>

   <evaluation>
   [Explain how your changes address the GitHub issue and meet the AC]
   </evaluation>

   <ui_validation>
   [If applicable, describe how you would use the Puppeteer MCP server to validate UI changes]
   </ui_validation>

   <ac_validation>
   [List each acceptance criteria from the original issue and mark as PASS/FAIL with context]
   [Example format:
   AC1: "Users should be able to..." - PASS: Implementation correctly handles...
   AC2: "System should prevent..." - FAIL: Current implementation does not address... (add GitHub comment required)
   ]
   </ac_validation>

   <next_steps>
   [If necessary, describe any further actions needed or comments you would leave on the GitHub issue]
   </next_steps>
   </output>

Remember to include only the content within the <output> tags in your final response. Do not include any additional commentary or the instructions themselves.