# ferhattufekci.github.io

This repository contains my personal portfolio website, designed and developed as a **fully responsive one-page application based on modern portfolio design standards**.

**Live:**
https://ferhattufekci.github.io

---

## Tech Stack

- **HTML5 / CSS3 / JavaScript**
- **jQuery + MagnificPopup (AJAX content loading)**
- **GitHub Pages** (static hosting)

---

## Project Structure

```text
.
├─ index.html
├─ css/                    # Stylesheets
├─ js/                     # Client-side logic (UI + AdSense + AJAX handling)
├─ images/                 # Images and blog assets
├─ fonts/                  # Local fonts & icons
├─ *.html                  # Standalone blog article pages
├─ FerhatTufekci_CV.pdf
├─ ads.txt                 # AdSense configuration
├─ robots.txt              # Crawler rules
├─ sitemap-2026.xml        # SEO sitemap
└─ BingSiteAuth.xml / google*.html  # Search engine verification
```

---

## Run Locally (Blog Pages Work Correctly)

Because this site uses AJAX-loaded blog pages and relative asset paths, opening files directly like:

```
file:///path/index.html

```

will break navigation and blog content.

Always run it via an HTTP server.

### Option VS Code Live Server (Recommended)

1. Open the repository in VS Code

2. Install Live Server

3. Right-click index.html → Open with Live Server

Then open:

```
http://127.0.0.1:5500/

```

---

## Important Notes for Blog Development

##### Blog posts are loaded dynamically into:

```
#ajax-page

```

This means new content is injected into the DOM after initial page load.

##### File naming is case-sensitive on GitHub Pages:

```
how-to-write-requirements.html ≠ How-To-Write-Requirements.html
```

##### Always use kebab-case for blog filenames:

```
    effective-requirement-writing-techniques.html

```

---

## License

This project is published for portfolio and demonstration purposes.

**Any commercial use, redistribution, or derivative work requires prior written permission.**

All personal content, articles, images, and branding are the intellectual property of **Ferhat Tüfekçi.**

---

## Author

[![Author](https://img.shields.io/badge/author-ferhattufekci-red)](https://github.com/ferhattufekci)
[![Contact](https://img.shields.io/badge/contact-linkedin-blue)](https://www.linkedin.com/in/ferhattufekci/)
