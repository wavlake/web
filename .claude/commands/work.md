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

1. First, review the GitHub issue provided by fetching it from the correct repository:

<github_issue>
#$ARGUMENTS
</github_issue>

**IMPORTANT**: Always specify the repository when using GitHub CLI commands:
- Use `gh issue view [issue-number] --repo wavlake/web` to fetch issues
- Use `gh pr create --repo wavlake/web` to create pull requests
- This prevents accidentally working with the wrong repository

2. Create a new git branch to track your changes. The branch name should be descriptive and related to the issue. Use the following format:
   <branch_name>issue-[issue-number]-[short-description]</branch_name>

3. Address the issue by making the necessary code changes. Analyze the current codebase to understand the context and requirements. When making changes, ensure that you:

   - Follow the existing code style and conventions
   - Add comments to explain complex logic
   - Update any relevant documentation
   - Work under the correct repository `wavlake/web`

4. After making the changes, evaluate your code artifacts to determine if they have addressed the original GitHub issue. Pay close attention to any acceptance criteria (AC) mentioned in the issue.

5. For any UI changes, fixes, or improvements, assume that you have access to a Puppeteer MCP server for validation. Describe how you would use this tool to validate your changes and ensure they work correctly.

6. If your code changes are not addressing the AC or if you need further clarification:
   a. Iterate and do another pass on the code changes, or
   b. Describe comments you would leave on the GitHub issue to track your changes and enable other developers and agents to assist you or pick up where you left off.

7. Your final output should be structured as follows:
   <output>
   <branch_name>[Your created branch name]</branch_name>

   <code_changes>
   [Summarize the code changes you made]
   </code_changes>

   <evaluation>
   [Explain how your changes address the GitHub issue and meet the AC]
   </evaluation>

   <ui_validation>
   [If applicable, describe how you would use the Puppeteer MCP server to validate UI changes]
   </ui_validation>

   <next_steps>
   [If necessary, describe any further actions needed or comments you would leave on the GitHub issue]
   </next_steps>
   </output>

Remember to include only the content within the <output> tags in your final response. Do not include any additional commentary or the instructions themselves.
