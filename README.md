# How to Train Your LLM

An interactive explorable explanation that teaches how large language models are trained — from raw text to aligned assistant — through hands-on game mechanics.

**[Play it live →](https://airingursb.github.io/how-to-train-your-llm)**

## What You'll Learn

The game covers the full LLM training pipeline across 3 acts and 10 chapters:

**Act I: Pretraining**
- Ch 0: The Magic Trick — Watch token-by-token generation
- Ch 1: Tokenization — Build a BPE tokenizer by merging character pairs
- Ch 2: The Guessing Game — Race against a bigram model
- Ch 3: Paying Attention — Draw attention connections and explore Q/K/V
- Ch 4: The Transformer — Assemble the architecture via drag-and-drop
- Ch 5: Feeding the Beast — Control training hyperparameters in real-time

**Act II: Supervised Fine-Tuning**
- Ch 6: The Obedient Student — Spot the SFT model in A/B comparisons
- Ch 7: Teaching by Example — Rank responses as a data annotator

**Act III: RLHF & Alignment**
- Ch 8: What Do Humans Want? — Train a reward model from preferences
- Ch 9: The Alignment Game — Balance helpfulness, harmlessness, and honesty

## Tech Stack

- **Rendering:** Canvas 2D + DOM hybrid split-view layout
- **Animation:** GSAP, CSS animations, requestAnimationFrame
- **Audio:** Web Audio API (synthesized ambient music + sound effects)
- **Sketch Style:** Rough.js
- **Build:** Vite
- **i18n:** English + Chinese with hot-reload language switching

## Development

```bash
npm install
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview production build
```

## License

MIT

## Author

[Airing](https://ursb.me)
