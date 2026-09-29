---
version: alpha
name: "Ferhat Tüfekçi Portfolio"
description: "A software engineering portfolio with readable article covers and repository information."
colors:
  primary: "#0099e5"
  primary-dark: "#58a6ff"
  surface: "#ffffff"
  surface-dark: "#161b22"
  text: "#333333"
  text-dark: "#e6edf3"
typography:
  sans:
    fontFamily: "Roboto, Helvetica, sans-serif"
  display:
    fontFamily: "Poppins, Helvetica, sans-serif"
rounded:
  card: "6px"
omitted:
  - section: spacing
    reason: "Existing main.css and blog-cards.css retain layout ownership; this change defines interactions only."
components:
  card:
    transitionDuration: "220ms"
    hoverLift: "-2px"
    imageScale: "1.04"
---

# Portfolio design context

## Overview

The portfolio helps readers and prospective collaborators inspect engineering articles and repositories. It uses the existing Poppins/Roboto typography, blue accents, understated borders and six-pixel card corners. English interface labels coexist with original Turkish/English article content. The register is a personal content site; no application workflow or rebrand is introduced.

Runtime CSS remains canonical (Model B). `css/dark-theme.css` owns palette and theme-specific shadow values. `css/card-interactions.css` owns interaction tokens and selectors. This document mirrors those sources and records the approved interaction policy.

## Colors

Light/dark colors above map directly to `--color-accent`, `--color-surface` and `--color-text-primary` in dark-theme.css. Card action text derives `--card-link-color` from accent and primary text for readable contrast. Hover border and surface derive from theme tokens, while each theme owns a different `--card-hover-shadow`.

## Typography

Existing body, heading and utility styles retain their fonts, sizes and line heights. Article titles/excerpts remain complete. Hover does not change type size or weight.

## Layout

Blog and Projects keep their existing responsive grids, gaps and content geometry. Card transforms do not change layout dimensions or move neighboring cards. Blog covers keep a reserved 16:9 frame and use centered object-fit: cover without stretching. The current landscape photos and centered text illustration were checked for safe cropping; new text/diagram covers require the same content check before publication.

## Elevation & Depth

Only the active card gains a two-pixel lift, controlled shadow and subtle surface/border contrast. No glow, gradients or card enlargement. Dark shadows use a different recipe from light shadows.

## Shapes

Cards keep six-pixel corners. The stretched repository-link area follows the same card frame.

Only the desktop sidebar avatar receives a static one-pixel outer ring and two soft shadow layers, sourced from --sidebar-avatar-ring and --sidebar-avatar-shadow in dark-theme.css. The scoped #site_header .sidebar-avatar > a rule starts at 992px. Its size, crop, position, circular shape and focus indicator remain unchanged; mobile/header portraits and drawer portraits receive no added depth or motion.

## Components

Blog has one native link covering its card. Projects expands the native repository link through a CSS pseudo-element; its owner link remains above that area as an independent target. There are no nested links or JavaScript click proxies.

`--card-transition-duration` and `--card-transition-easing` map to explicit transform/shadow/border/surface transitions in card-interactions.css. `--card-hover-lift`, `--card-image-hover-scale` and `--card-arrow-offset` map to the card, Blog image and external-link arrows respectively. Image zoom is Blog-specific; Projects emphasizes repository links.

Keyboard focus has a visible accent outline and the same depth feedback. Hover motion runs only with hover-capable fine pointers. Reduced motion sets duration/lift/arrow offset to zero and image scale to one; focus, underline and contrast remain visible.

## Do's and Don'ts

- Keep theme color ownership separate from shared motion behavior.
- Match the visual interaction area to its native link target.
- Preserve language/category filtering and source article data.
- Avoid transition: all, duplicated theme hover recipes, JavaScript hover listeners and excessive movement.

## Category filters and navigation

Blog and Projects share category-filter-scroll, category-filter-bar and category-filter button presentation in css/category-filters.css. Each page retains its own category state and scoped renderer/handlers. Both use native buttons and aria-pressed. Shared typography, colors, active shadow, underline and inset focus ring derive from semantic filter tokens; dark-theme.css overrides only palette/shadow values. Horizontal scrolling preserves label size. The hint is measured on activation, completion, fonts and ResizeObserver changes; only activation with the default All category resets scroll position.

Mobile and coarse touch navigation reuse deterministic left/right translate animations at 220ms without perspective or scale. Reduced motion switches pages directly. Desktop retains its existing animation selection. Completion waits for both page animations and ignores descendant animation events.
