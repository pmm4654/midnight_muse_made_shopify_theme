---
name: image-prompt-optimizer
description: Optimize image generation prompts for product photography using Google Product Studio best practices and platform-specific guidelines. Use when generating or improving image prompts for Instagram posts or product images.
user-invocable: true
---

# Image Generation Prompt Optimizer

You are an expert at crafting image generation prompts for e-commerce product photography. When generating or refining an `imageGenerationPrompt` for the Instagram post generator (or any product image generation task), follow these rules strictly.

## Prompt Structure

Every image generation prompt MUST include these 7 elements in order:

1. **Image style** — e.g., "product photography", "studio product photo", "creative product photograph", "macro photography", "lifestyle product photo"
2. **Product description** — what the product is (e.g., "a pair of custom acrylic earrings", "a glass tumbler with a gothic design")
3. **Usage context** — where and how this product would realistically be used (see "Contextual Realism" section below)
4. **Placement** — where the product sits, informed by the usage context (e.g., "resting on a nightstand beside an open book", "sitting on a kitchen counter next to a French press")
5. **Surroundings** — what's around the product — items that someone would naturally have nearby when using this product (e.g., "with a pair of reading glasses and a bookmark nearby", "next to a steaming cup of coffee and a folded newspaper")
6. **Background** — what's behind/beyond the scene, matching the realistic setting (e.g., "a dimly lit bedroom with fairy lights in soft focus", "a cozy kitchen with warm morning light through a window")
7. **Quality modifiers** — technical photography terms (see "Quality Modifiers" section below)

## Contextual Realism

**This is the most important section.** AI-generated product photos look fake when the product floats in a generic styled scene with no connection to real life. To fix this, you MUST consider three questions before writing the prompt:

### 1. What IS this product?
Understand the product category and its physical properties. A tumbler is a drinking vessel. Earrings are jewelry worn on ears. A pet bandana is pet clothing. This determines what kind of scene makes sense.

### 2. What is it USED FOR?
Think about the product's function and the activity it's part of. A tumbler is used for drinking beverages — coffee in the morning, wine in the evening, water at a desk. Earrings are worn as accessories — getting ready for a night out, a daily outfit choice. A pet bandana is dressed on a pet for photos, walks, or events.

### 3. WHERE would someone use it?
Think about the real physical environment. A tumbler lives on a kitchen counter, a desk, a car cupholder, a bedside table. Earrings are on a vanity, a dresser, in a jewelry dish by the front door. A pet bandana might be laid out on an entryway bench next to a leash.

### How to Apply Contextual Realism

Use the answers above to build a **"moment in time" scene** — the product caught mid-use or just before/after use. The scene should feel like a snapshot of someone's real life, not a sterile product shoot.

**Instead of this (sterile/fake):**
> "Earrings on a dark marble surface surrounded by crystals and candles"

**Do this (realistic moment):**
> "Earrings resting in a vintage ceramic ring dish on a dark wooden vanity, next to an open vintage perfume bottle and a half-drunk cup of tea, with a dimly lit bedroom mirror reflecting warm fairy lights in the background"

**Category-specific realism guidelines:**

| Product Type | Realistic Setting | Natural Companion Items |
|---|---|---|
| **Drinkware** (tumblers, mugs) | Kitchen counter, desk, bedside table, outdoor patio table | Coffee beans, tea bags, coasters, books, laptops, breakfast items |
| **Jewelry** (earrings, necklaces) | Vanity/dresser top, ring dish, jewelry box on a shelf | Perfume bottles, hand mirror, other jewelry pieces, hairbrush |
| **Pet accessories** (bandanas, collars, tags) | Entryway bench, beside a door, on a blanket | Leash, treat bag, pet toys, a folded blanket |
| **Apparel** (t-shirts, hoodies) | Folded on a bed, draped over a chair, on a hanger on a door | Other clothing items, shoes nearby, a bag |
| **Home decor** (signs, ornaments) | Mounted on a wall, on a shelf, on a mantelpiece | Other decor items, plants, picture frames, books |
| **Stickers / small items** | On a laptop lid, on a water bottle, on a notebook | Pens, desk items, phone, headphones |

### Realism Do's and Don'ts

- DO place the product where it would naturally live in someone's home
- DO include "companion items" — things that would realistically be near the product during use
- DO suggest a time of day through lighting (morning light for coffee mugs, evening candlelight for wine tumblers)
- DO make the scene feel lived-in — a slightly rumpled blanket, an open book face-down, a half-drunk beverage
- DO still keep the product as the clear focal point — realism is the backdrop, not the subject
- DON'T create scenes that are impossibly perfect or overly curated — slight imperfection reads as real
- DON'T combine incompatible items (e.g., beach props with a cozy winter product)
- DON'T forget the brand aesthetic — the scene should be realistic AND match Midnight Muse Made's gothic-cozy vibe

## Quality Modifiers

Include 2-4 of these where appropriate:
- "in focus, clear, and sharp"
- "professional product photography"
- "studio lighting, soft shadows"
- "high resolution"
- "reflective surface" (for glossy products)
- "diffused lighting"
- "open aperture" (for bokeh/depth of field)
- "soft directional light"

## General Do's

- DO build scenes around realistic usage context (see "Contextual Realism" above) — this is the #1 priority
- DO describe the scene/environment in vivid, specific detail
- DO match the mood to the Midnight Muse Made brand aesthetic (gothic, witchy, cozy, dark but inviting)
- DO specify lighting conditions (candlelight, moody studio light, warm amber glow, moonlight)
- DO mention textures and materials (velvet, marble, weathered wood, crystal, dried flowers)
- DO use the brand color palette in scene descriptions: deep purples, warm golds/coppers, near-black, cream
- DO describe composition (centered, rule-of-thirds, close-up, overhead/flat-lay)
- DO keep the product as the clear focal point
- DO suggest a "moment" — the product in the context of someone's life, not floating in a void

## General Don'ts

- DO NOT describe humans, people, hands, fingers, or body parts
- DO NOT include sexual content of any kind
- DO NOT include weapons, firearms, or violence
- DO NOT describe pets or animals (even though the brand sells pet products — show the product alone)
- DO NOT use vague descriptions like "nice background" or "good lighting"
- DO NOT describe text, logos, or watermarks to be rendered in the image
- DO NOT request multiple products in a single scene (one product per image works best)
- DO NOT create sterile "product on a surface with props" scenes — always ground in a realistic setting

## Unsupported Product Types

These don't work well with AI image generation — suggest using actual product photos instead:
- Wall art / framed prints
- Light fixtures
- Products that require being worn/held to understand

## Brand-Specific Scene Ideas for Midnight Muse Made

When generating prompts for this brand, lean into these atmospheric elements:
- **Surfaces:** dark marble, weathered wood, vintage velvet, slate, antique mirrors
- **Props/surroundings:** dried flowers, crystals, candles (unlit or lit), vintage books, apothecary bottles, moon phases, tarot cards, autumn leaves, pine cones, moss
- **Backgrounds:** dark moody gradients, purple/plum bokeh, candlelit rooms, moonlit windowsills, vintage bookshelves (blurred)
- **Lighting:** warm candlelight glow, soft amber studio light, moonlight through a window, dramatic side lighting with deep shadows
- **Seasonal:** pumpkins and autumn leaves (fall), evergreen and gold ornaments (winter holidays), cherry blossoms (spring), sunflowers at dusk (summer)

## Example Prompts

### Good Prompt (Earrings — realistic vanity scene)
"Lifestyle product photo of custom acrylic crescent moon earrings resting in a small vintage ceramic ring dish on a dark wooden vanity. Next to the dish sits an open antique perfume bottle and a half-drunk cup of chamomile tea in a black mug. A vintage hand mirror and a few loose dried rose petals are scattered nearby. The background shows a dimly lit bedroom with warm fairy lights reflected in a wall mirror, slightly out of focus. Professional product photography, in focus and sharp, soft warm directional lighting, open aperture with gentle bokeh."

### Good Prompt (Tumbler — morning kitchen scene)
"Creative product photograph of a gothic-design glass tumbler sitting on a dark granite kitchen counter beside a French press with fresh coffee in it. A folded black linen napkin and a small plate with a half-eaten croissant sit nearby. Morning light streams through a window to the left, casting long soft shadows across the counter. The background shows blurred dark kitchen cabinets and a potted herb plant on the windowsill. Professional product photography, in focus and sharp, natural morning light, soft shadows."

### Good Prompt (Pet bandana — entryway scene)
"Lifestyle product photo of a gothic-print pet bandana neatly folded on a dark wooden entryway bench beside a leather leash and a small canvas treat pouch. A pair of boots sit on the floor below the bench, and a set of keys rests on the bench surface. The background shows a dimly lit hallway with a coat rack and warm amber light from a wall sconce. Professional product photography, in focus and sharp, warm ambient lighting, slight depth of field."

### Bad Prompt (DON'T do this)
"A woman wearing earrings in a nice setting with good lighting" — describes humans, vague, no specific scene details.

### Bad Prompt (sterile/fake — DON'T do this)
"Earrings on a dark marble surface surrounded by crystals and candles with a velvet backdrop" — technically correct but reads as a generic styled shoot with no connection to real life. Where do these earrings live? Who uses them? The scene tells no story.

## How to Apply

When generating or optimizing an `imageGenerationPrompt`, follow this process:

1. **Identify the product** — What is it? (earrings, tumbler, bandana, etc.)
2. **Determine its purpose** — What is it used for? (drinking, wearing, decorating, etc.)
3. **Imagine the real-life setting** — Where would someone use or keep this product in their home/life?
4. **Build a "moment in time" scene** — Place the product in that realistic setting with natural companion items
5. **Apply the brand aesthetic** — Layer the Midnight Muse Made gothic-cozy mood onto the realistic scene (dark wood instead of light pine, candlelight instead of fluorescent, etc.)
6. **Write the 7-element prompt** — Image style → Product description → Usage context → Placement → Surroundings → Background → Quality modifiers

The prompt should read like a lifestyle photographer's creative brief — specific, atmospheric, visually rich, and grounded in a believable real-world moment. The goal is that someone looking at the generated image thinks "I want my life to look like that" rather than "that's a product photo."
