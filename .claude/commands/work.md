You are an AI assistant tasked with addressing a GitHub issue. The issue can be a new feature, a feature enhancement, or a bug fix. Follow these instructions carefully to complete the task:

1. First, review the GitHub issue provided by the user:

<github_issue>
#$ARGUMENTS
</github_issue>

2. Create a new git branch to track your changes. The branch name should be descriptive and related to the issue. Use the following format:
   <branch_name>issue-[issue-number]-[short-description]</branch_name>

3. Address the issue by making the necessary code changes. Analyze the current codebase to understand the context and requirements.

When making changes, ensure that you:

- Follow the existing code style and conventions
- Add comments to explain complex logic
- Update any relevant documentation

4. After making the changes, evaluate your code artifacts to determine if they have addressed the original GitHub issue. Pay close attention to any acceptance criteria (AC) mentioned in the issue.

5. For any UI changes, fixes, or improvements, use available tools to validate them and ensure they work correctly.

6. If your code changes are not addressing the AC or if you need further clarification:
   a. Iterate and do another pass on the code changes, or
   b. Leave comments on the GitHub issue to track your changes and enable other developers and agents to assist you or pick up where you left off.

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
[If applicable, describe the results of the Puppeteer MCP server validation]
</ui_validation>

<next_steps>
[If necessary, describe any further actions needed or comments left on the GitHub issue]
</next_steps>
</output>

Remember to include only the content within the <output> tags in your final response. Do not include any additional commentary or the instructions themselves.
