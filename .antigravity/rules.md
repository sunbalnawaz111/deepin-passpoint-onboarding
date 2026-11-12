Project & Agent Execution Rules: Low Latency & Minimal Tool Calls

These rules instruct the AI agent to minimize token overhead, avoid redundant commands, eliminate exploratory tool calls, and optimize end-to-end response latency.

1. Terminal & Command Execution Policy

No Redundant Environmental Probing:

DO NOT run inspection commands (pwd, whoami, ls, dir, echo $PATH, node -v, git status) unless directly required to resolve an active failure.

Assume common system paths and dependencies exist unless an operation throws a concrete missing binary/dependency error.

Batch Necessary Commands:

When commands are unavoidable, chain them into a single invocation using && (or ; where appropriate) rather than issuing separate sequential tool calls.

Example: npm install && npm run build (Single call) instead of running npm install, waiting for output, then running npm run build.

Silent / Quiet Flag Usage:

Append silent flags to package managers and build tools (npm i --prefer-offline --no-audit --no-fund --quiet, pip install -q, etc.) to minimize output context length and token generation delay.

Never Re-run Successful Commands:

Once a build, test, or install succeeds within a session, treat it as completed state. Do not rerun it unless modified source files invalidate the prior output.

2. File Reading & Search Optimization

Targeted Line Spans Only:

Do not dump entire source files into context if only examining a specific function or block. Use narrow line-span reads.

Avoid broad recursive directory listings (find ., grep -r, tree commands). Target specific subdirectories and precise file extensions.

No Pre-Emptive Reads:

If the user provides sufficient context, code snippets, or explicit instructions, act on the provided prompt directly without searching the repository for duplicate verification.

Direct In-Place Edits:

Apply targeted diffs/replacements rather than rewriting entire large files from scratch.

3. Communication & Output Rules

Direct Action Over Narration:

Skip conversational preamble ("I am checking the files...", "Let me run this command...").

Immediately execute the required action and deliver the solution.

Concise Summaries:

Omit lengthy execution recaps. State what was changed, the file path, and any immediate next step in 1–3 bullet points.

No Self-Reflective Loops:

Complete the requested operation in a single interaction cycle. Avoid triggering follow-up confirmation sweeps unless requested by the user.

4. Error Handling Quick-Exit

If a terminal command returns a non-zero exit code:

Inspect the last 10 lines of stderr.

Implement the targeted fix directly.

Do not run secondary exploratory scans across unrelated files.