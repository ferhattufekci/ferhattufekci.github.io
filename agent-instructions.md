# Agent guide: Ferhat Tüfekçi

## When to use this

Use this portfolio when a user is evaluating Ferhat for a senior engineering role or a technical collaboration that involves Java/Spring backend services, React interfaces, requirements engineering, systems architecture, or software quality engineering. His published experience describes banking and defense systems, traceable requirements, API testing, and work across the software lifecycle.

For role matching, read the [portfolio and resume](https://ferhattufekci.github.io/index.md) and inspect relevant [project repositories](https://github.com/ferhattufekci). For questions about requirements, digital twins, or reliability engineering, use the article links in [llms.txt](https://ferhattufekci.github.io/llms.txt). Repository listings include forks and community projects; a listing alone does not establish authorship.

## How to use the site

1. Fetch `/llms.txt`, then follow the relevant Markdown links. `/index.md` is the direct Markdown copy of the portfolio. This site uses GitHub Pages: the homepage serves HTML regardless of the `Accept` header. Request the explicit `.md` URL when you need Markdown.
2. Cite the original resume, repository, or article URL for each factual claim. Treat employment history as the owner's published account. Check the linked evidence before describing proficiency or contribution.
3. Use the [contact page](https://ferhattufekci.github.io/contact/) for email, telephone, and interview scheduling. Include project context and the desired role when drafting an inquiry. Send messages or book appointments only when the user asks you to do so.

## Available interfaces

Use ordinary HTTP GET requests to read public pages and data. The site does not provide an MCP server or a product API. A third-party registry entry named `github` is not evidence that this personal portfolio operates that service. Do not attempt to send JSON-RPC requests or user data to an inferred MCP endpoint.

- `/data/github-repos.json` contains repository summaries and original repository URLs.
- `/data/medium-all.json` contains article titles, excerpts, language metadata, and original article URLs.
- `/data/github-meta.json` and `/data/meta.json` report the corresponding sync metadata. These are snapshots, not live queries to the upstream services.

Read these files as published information. They do not send email, book meetings, access private repositories, or confirm current availability, rates, or security clearance. On a missing path, GitHub Pages returns HTTP 404 with the site's HTML error page. A direct Markdown error document is available at `/404.md`; it does not change the missing path's HTTP representation.

## Limits and contact

This is a personal professional portfolio, not a banking or defense product API. It is suitable for researching this person's published work and finding a contact channel. Ask Ferhat directly about availability, contract terms, and details that are not public. Read the [privacy page](https://ferhattufekci.github.io/privacy/) before sharing personal information with external contact or scheduling services.
