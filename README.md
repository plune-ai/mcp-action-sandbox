# mcp-action-sandbox

A public test bed for the [`plune-ai/eval-action/mcp`](https://github.com/plune-ai/eval-action) GitHub Action: a small, dependency-free MCP test server (`src/`, stdio and Streamable HTTP, with clean, broken, empty and crash modes and a request log) and workflows that run the action against it on real GitHub Actions runners. `docs-mcp-stdio.yml` and `docs-mcp-http.yml` are the documented example workflows copied as they are; the `acNN-*.yml` workflows each check one behaviour of the action (green on a clean server, red on a broken one, nothing measured, a server that does not start, an empty credential variable, credentials kept out of the reports, one server start per command, smoke calls, summary and artifacts on a red gate), and `pr-comment.yml` exercises the pull request comment. The values in these workflows are fakes; nothing here is a real secret.

The documented example workflows run on pull requests to main.
