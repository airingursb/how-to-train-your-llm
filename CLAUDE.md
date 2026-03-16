# How to Train Your LLM

An interactive explorable explanation that teaches how LLMs are trained — from raw text to aligned assistant — through hands-on game mechanics inspired by [ncase.me/trust](https://ncase.me/trust/).

## Project Links

- **Repo:** git@github.com:airingursb/how-to-train-your-llm.git
- **Linear:** Claude Game project in MoFlow team
- **Design Spec:** docs/superpowers/specs/2026-03-16-how-to-train-your-llm-design.md

## Tech Stack

- PIXI.js (Canvas rendering) + GSAP (animation) + Rough.js (sketch effect) + Howler.js (audio)
- Vanilla JS + ES modules, built with Vite
- i18n-ready: all text in src/locales/*.json

## Key Conventions

- **No hardcoded display text.** All strings go through i18n.
- **Chapters are self-contained.** No cross-chapter imports. Use core/ and components/ for shared code.
- **Chapter module interface:** Each chapter exports `{ id, title, act, init(engine), start(), destroy() }`
- **Visual style:** Tech-flavored hand-drawn. Warm cream background (#F5F0E8), charcoal text (#2D2D2D), act-specific accent colors.
- **Performance:** Target 60fps on 2020 MacBook.

## Agent Workflow Per Chapter

```
researcher → technical brief
writer → narrative script + locale strings
interaction-designer → interaction specs
frontend-dev → implementation
reviewer → quality review
```

## Development Commands

```bash
npm run dev      # Start Vite dev server
npm run build    # Production build
npm run preview  # Preview production build
```
