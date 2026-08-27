# Visual thesis — The impossible study garden

## Direction and rationale

Explain Then Check uses **surreal editorial scenery**: a quiet midnight garden where a monumental ear, clipped paper fragments, and a small coral staircase turn speaking, omissions, and return practice into a physical landscape. It fits the product because explaining is generative and slightly vulnerable; the scene feels contemplative rather than evaluative. It never implies automatic grading. The interface itself is a precise field notebook layered over that world: warm paper, ink rules, numbered cues, and circular “missing piece” markers.

The phone experience drops the large illustration after the home introduction and stacks every practice cue. On wider screens the practice paper and contextual sidebar sit side-by-side. Content is grouped by proximity; borders are reserved for editable paper and independently actionable retry slips.

## Palette

- `night #17182B`: primary text and dark backdrop, drawn from the garden sky.
- `paper #F7F1E5`: primary background, like an annotated notebook; `night` on `paper` is 15:1.
- `paper-deep #EDE3D3`: secondary surface and rules.
- `iris #6656A7`: primary action and focus motif; white on `#55458F` is 7.1:1.
- `coral #A6382B`: omission/action accent, darkened for 5.4:1 contrast on the deepest paper surface.
- `moss #2E6B55`: success/clearer state; white contrast 6.1:1.
- `ochre #8A5A10`: warning text on pale ochre.
- `danger #9C3535`: destructive action.
- Dark treatment paints `night` explicitly in the hero and install surfaces; the working surface stays warm paper by design. This is a deliberate dual treatment, not an OS theme toggle—the high-focus writing environment should not shift underneath a learner.

## Type and rhythm

- Display: Georgia, Cambria, “Times New Roman”, serif. Its editorial curves make a learner’s own language feel important.
- Interface/body: Inter fallback stack (`ui-sans-serif`, system UI, sans-serif). No font files or third-party requests.
- Scale: 14 / 16 / 18 / 24 / 36 / clamp(44–76) px. Body is never below 16px.
- Spacing follows an 8px base with 4px for micro-alignment: 4, 8, 12, 16, 24, 32, 48, 64.
- Long text is capped near 68 characters; writing fields use 1.55 leading.

## Interaction grammar

- The primary action is a filled iris pill; secondary actions are ink text with a precise underline or paper outline.
- A practice is a three-step page: **Explain → Check yourself → Return**. Progress is textual and numbered, never color-only.
- The timer is an optional 90-second focus ring. It counts up and gently completes; it never locks input or forces submission.
- Missing pieces become small retry slips with a due label. A retry asks only for that omission and records whether the new explanation felt clearer. No score, correctness badge, or machine judgment appears anywhere.
- All mutations report into a polite live region. Destructive deletion names the scope and requires confirmation; deleting one retry supports a brief undo.

## Motion

- 180–240 ms transforms/opacity for page transitions and drawers; elements enter from the control that invoked them.
- The timer ring advances once per second without decorative looping. No parallax or perpetual ambient animation.
- Under `prefers-reduced-motion: reduce`, transitions are removed and the timer remains numerical with an instant ring update.

## Original asset plan and provenance

- `public/art/study-garden.webp`: wide hero scenery generated for this product, with enough negative space for a compact caption and no embedded UI/text. Source PNG and prompt sidecar are retained in `assets/src/`.
- App icons are hand-authored SVG: an open speech-shaped folio and coral omission dot. They are original project assets.

### Prompt sheet

Subject: a monumental sculptural ear listening toward three hovering blank paper fragments, a tiny coral staircase and one circular cut-out representing an omission.

World/materials: impossible midnight study garden; matte paper, carved plaster, soft moss, editorial cut-paper construction.

Light/lens: moonlit soft studio key, long calm shadows, wide 3:2 editorial composition, tactile depth.

Palette words: deep aubergine night, warm ivory paper, dusty iris, restrained coral, moss green.

Negative list: people, faces, letters, writing, screens, logos, brands, watermark, neon gradient, glossy 3D app icons, classroom clichés.

Generation prompt (verbatim): “Use case: stylized-concept. Asset type: responsive landing-page hero illustration. Primary request: an impossible midnight study garden where a monumental sculptural ear listens toward three hovering blank paper fragments; a tiny coral staircase leads to one clean circular cut-out in a paper plane, suggesting a missing piece waiting to be revisited. Scene/backdrop: sparse dreamlike landscape with soft moss islands and deep aubergine sky. Style/medium: sophisticated surreal editorial illustration, tactile cut paper and matte carved plaster, subtle grain, original art. Composition/framing: wide 3:2, central-right subject, generous calm negative space, readable at mobile crop. Lighting/mood: moonlit soft studio key, long quiet shadows, contemplative and inviting, never ominous. Color palette: deep aubergine, warm ivory, dusty iris, restrained coral, moss green. Constraints: no people, no UI, no text, no watermark, no logo, no recognizable brands, no letters or symbols.”

Generated 2026-08-27 using the factory Azure image deployment (`factory-image`, OpenAI image generation). Original asset made for this product; no third-party or copyrighted source imagery was used. The selected asset was reviewed for text artifacts, brands, seams, and misleading capability claims.
