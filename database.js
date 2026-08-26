const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.resolve(__dirname, 'photobooth.db');

let db = null;

async function getDatabase() {
  if (db) return db;

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      gemini_api_key TEXT,
      gemini_api_endpoint TEXT DEFAULT 'https://generativelanguage.googleapis.com',
      mock_ai_generation INTEGER DEFAULT 0,
      admin_password_hash TEXT,
      backend_api_key TEXT DEFAULT 'PB-SECRET-KEY-123'
    );

    CREATE TABLE IF NOT EXISTS prompts (
      name TEXT PRIMARY KEY,
      prompt_text TEXT
    );

    CREATE TABLE IF NOT EXISTS generations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      booth_mode TEXT,
      filter_name TEXT,
      captured_frame TEXT,
      generated_output TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert default settings if not exists
  const settingsCount = await db.get('SELECT COUNT(*) as count FROM settings');
  if (settingsCount.count === 0) {
    const defaultPasswordHash = await bcrypt.hash('admin123', 10);
    await db.run(
      `INSERT INTO settings (gemini_api_key, gemini_api_endpoint, mock_ai_generation, admin_password_hash, backend_api_key) 
       VALUES (?, ?, ?, ?, ?)`,
      ['', 'https://generativelanguage.googleapis.com', 0, defaultPasswordHash, 'PB-SECRET-KEY-123']
    );
  }

  // Prepopulate prompts if empty
  const promptsCount = await db.get('SELECT COUNT(*) as count FROM prompts');
  if (promptsCount.count === 0) {
    const defaultPrompts = {
      'Renaissance Painting': `Use uploaded photo as identity reference.
Create 1:1 Renaissance oil painting framed portrait sticker mockup.

Preserve exact facial likeness and identity.
Create half-body portrait composition, around waist-up or mid-torso-up.
Do not make it full body.
Do not crop too close.

Dress subject in regal Renaissance garments.
If head covering is present, preserve it and reinterpret it naturally in Renaissance styling.
Use elegant noble fabrics, embroidery, and museum-style portrait fashion.
Expression serious with subtle slight smile.

Render as Renaissance oil painting:
deep rich colors, visible canvas texture, realistic brushstrokes, subtle paint layering, museum-quality old-master finish.

Use a cohesive painted Renaissance background:
painterly sky, distant towers or classical architecture, floral garden, atmospheric landscape.

Place the painting inside an ornate gilded classical frame with carved decorative details.

Important:
cutline follows only the outer frame shape.
Do not create white outline around the person.
Do not separate the figure from the background.
Do not create inner die-cut around the subject.

Final look:
half-body Renaissance portrait, ornate museum frame, one unified framed sticker, subtle shadow, plain white background outside, premium print-ready mockup.

Avoid:
full body, character cutout, white outline around person, floating figure, modern clothing, text, logo, watermark, anime, cartoon.`,

      'Action Toys': `Use the uploaded image as the main identity reference.

VERY IMPORTANT:
Preserve the person’s recognizable face, facial features, hairstyle or head covering if present, facial hair if present, expression, skin tone, body proportion, and overall identity.
Do not change the face.
Do not make the person look like someone else.

Transform the person into a 1/7 scale realistic action figure toy made of high-gloss molded plastic.
The figure should look like a real premium poseable toy, not a cartoon, not anime, not a flat illustration.

The figure must have visible articulation joints at the shoulders, elbows, wrists, hips, knees, and ankles.
The surface should look glossy, smooth, molded, and toy-like.

Dress the figure as a warm-weather mountain climber / outdoor adventurer.
Reimagine the outfit in a practical, stylish, character-appropriate way.
Respect the original person’s presentation and coverage.
If the source includes a head covering or modest styling, preserve it appropriately.

Pose the figure standing in a confident action pose.

Create a compact outdoor adventure backdrop behind the figure and a sandbox base under the figure.
Include supportive elements such as sand, small hills or mountain shapes, a few trees or foliage, and a small number of adventure props.

IMPORTANT STICKER COMPOSITION RULE:
The final sticker artwork must read as ONE unified die-cut shape.
All supporting elements must be visually connected to the main figure or the base.
Do not create floating or isolated elements.
Do not scatter small decorative objects around the composition.
Do not leave disconnected clouds, signs, trees, props, or icons separated from the main silhouette.
The outer contour must be clean, compact, stable, and easy to understand for sticker cutting.

Keep the background simple and structured.
Use only a small number of larger background elements.
Make the overall silhouette balanced, compact, and cohesive.
The figure must remain the main focus.

Final output format:
Create a print-ready die-cut sticker mockup.
Use a plain white outer background.
Include the full action figure, sandbox base, and compact connected backdrop inside the sticker artwork.
Add one clean bold white die-cut outline around the entire unified artwork.
Add a subtle sticker shadow.
Keep the composition centered, full-body, stable, polished, and print-ready.
Do not crop the head, hands, or feet.

Overall look:
realistic action figure toy filter, high-gloss molded plastic, compact outdoor adventure backdrop, unified sticker silhouette, stable die-cut contour, premium print-ready sticker mockup.

No floating background elements.
No isolated clouds.
No separate signboards.
No disconnected trees.
No scattered props.
No complex multi-part silhouette.
No unstable cut shape.
No cluttered composition.
No busy decorative elements.
No text.
No watermark.
No logo.
No cartoon style.
No anime style.
No flat illustration.
No distorted face.
No extra fingers.
No extra limbs.

Create the sticker as one unified silhouette. All background and prop elements must connect to the main figure or base. Do not use floating or isolated decorative elements. Keep the outer contour clean, compact, stable, and easy to read for die-cut sticker cutting.`,

      'Cereal Box': `Use the uploaded photo as the main identity reference.

Create a retro 1970s cereal box sticker design called “Banana Flakes”.

IMPORTANT PRIORITY:
The character on the cereal box must clearly resemble the real person in the uploaded photo.
Preserve the person’s recognizable identity, facial features, face shape, eyes, nose, lips, expression, skin tone, hairstyle or head covering if present, and overall presentation.
Do not replace the person with a generic cartoon character.
Do not simplify the face so much that the identity is lost.

Turn the person into a 1970s cartoon version of themselves on the front of the cereal box.
Show the character winking and giving a thumbs-up.
Do not add gloves.

Presentation and styling rule:
Preserve identity and presentation.
Adapt the character respectfully.
Maintain appropriate coverage and styling based on the original person.
If head covering is present, keep it.
If modest styling is implied, preserve it.
If the person’s look is more casual or non-modest, adapt naturally while keeping the character recognizable and appropriate.
Do not change the person’s gender presentation.
Do not remove distinctive styling elements that are important to the original look.

Design the cereal box in a fun retro 1970s style with banana-themed packaging graphics:
swirls, bananas, palm trees, and playful vintage cereal-box styling.

Include a “prize inside” detail showing a tiny keychain of the same person’s face.

IMPORTANT STYLE RULE:
Keep the retro cartoon style, but make the face more portrait-based and identity-driven.
The character must look like the uploaded person first, and a retro cereal mascot second.

IMPORTANT COMPOSITION RULE:
The final result must be a stable, compact die-cut sticker mockup.
The cereal box should be upright or only slightly angled, mostly front-facing, with a clean and simple outer silhouette.
Keep all graphics contained within the cereal box.
Do not place decorative elements outside the box shape.

Final output:
- plain white background
- one clean die-cut sticker mockup
- neat white sticker border following the cereal box silhouette
- subtle sticker shadow
- print-ready look

Overall look:
retro cereal box sticker, 1970s cartoon packaging, banana theme, strong facial likeness to the uploaded photo, inclusive identity-preserving styling, premium die-cut sticker mockup, clean print-ready sticker design.

Avoid: generic cartoon face, random man face, random woman face, inaccurate likeness, wrong face shape, different eyes, different nose, different smile, changed skin tone, missing hairstyle, missing head covering when present, changed gender presentation, over-simplified cartoon face, exaggerated caricature, anime style, modern mascot style, unstable box angle, floating graphics, text errors, watermark

Keyline:
Preserve identity and presentation. Adapt the character respectfully. Maintain appropriate coverage based on the original character. If head covering is present, keep it. If modest styling is implied, preserve it. 
Facial resemblance is the highest priority. Even in a retro cartoon style, the character must look unmistakably like the person in the uploaded photo.`,

      '90s Sitcom': `Turn the input character into a premium, photorealistic 90s family sitcom die-cut sticker.

CANVAS / EXPORT AREA RULE:
The final image must be composed on a perfect 1:1 square canvas / artboard.

Important:
1:1 refers only to the canvas or export area, not the sticker shape.
Do not make the sticker itself square, rectangular, or box-shaped.
Do not follow the input image aspect ratio if it is landscape, portrait, vertical, horizontal, or cropped.

The sticker artwork must sit centered inside the square canvas with balanced empty margin on all sides.
The square canvas is only for print-safe export.
The die-cut outline must follow the unified sticker silhouette only, not the square canvas edge.

CHARACTER PRESERVATION & REALISM:
Preserve the character’s recognizable identity, but render them with highly realistic, photographic facial features. The face must look like a real human photograph with natural skin texture, lifelike eyes, realistic hair, and a genuine, warm smile. Strictly avoid any cartoon, 2D, illustrated, or animatic appearance.

Dress the character in realistic, colorful oversized mid-90s fashion, with a cheerful sitcom feel. The outfit should feature lifelike fabric textures (like real knitwear, denim overalls, bright cotton tops) and relaxed sneakers, maintaining casual family-sitcom styling.

Add small, realistic 90s sitcom props around the character, such as:
- an oversized cordless phone
- framed family pictures
- a potted plant
- cheerful home decor accents
- small cozy living-room details

IMPORTANT COMPOSITION RULE:
All decorative props and background accents must be integrated into ONE unified sticker composition.

Do NOT create separate floating sticker pieces.
Do NOT create disconnected prop islands.
Do NOT make the props look like individual stickers behind the character.

Instead:
- arrange all props so they are visually connected to the main character
- merge the character and props into one cohesive silhouette
- keep all elements grouped tightly around the figure
- make the decorative elements feel attached and nested behind the character
- ensure there is only ONE single print/cut area
- the final die-cut outline must wrap around the entire combined composition as one continuous outer contour

The sticker shape should feel:
- compact
- stable
- balanced
- easy to read
- clean for print production

The character must remain the main focus.
Props should support the character without overpowering them.

STYLE:
- photorealistic studio photography
- highly detailed, lifelike face and skin textures
- cinematic, warm 90s sitcom studio lighting
- crisp, realistic fabric and prop details
- friendly and nostalgic
- premium physical sticker mockup look (a photograph printed on die-cut sticker paper)

1:1 COMPOSITION LOCK:
Keep the entire sticker composition fully visible inside a square 1:1 canvas.
Center the sticker on the square canvas.
Leave comfortable white margin around the sticker on all four sides.
Do not crop the top, bottom, left, or right side of the unified sticker composition.
Do not create a portrait export.
Do not create a landscape export.
Do not make the cutline follow the canvas edge.

FINAL OUTPUT REQUIREMENTS:
- plain white background
- centered composition
- full character visible
- one single unified die-cut sticker shape
- bold clean white die-cut outline around the whole combined artwork
- subtle realistic sticker shadow
- print-ready photographic sticker mockup look
- final export on a perfect 1:1 square canvas

AVOID:
- illustration, 2D drawing, animatic style, cartoon, anime, line art, painting
- stylized or airbrushed faces
- separate cut areas
- multiple outlines
- floating props
- disconnected objects
- messy layout
- cluttered background
- poster-like composition
- realistic room background (props only)
- text
- watermark
- logo
- square sticker shape
- rectangular sticker shape
- box-shaped sticker
- cutline following canvas edge
- border around the full canvas
- portrait export
- landscape export
- non-square export`,

      'Pixel Art': `Use the input photo as the reference to create a premium collectible die-cut sticker in authentic 16-bit pixel art style, inspired by classic 1990s arcade fighting games.

## Character

Transform the subject into a heroic medieval knight while faithfully preserving their facial identity.

Preserve:
- Facial features
- Hairstyle
- Hair color
- Skin tone
- Facial hair
- Glasses (if present)
- Body proportions
- Gender
- Estimated age

The subject must remain instantly recognizable.

If the input photo is a selfie or half-body portrait, intelligently reconstruct the missing body to create a complete full-body character with natural proportions.

Dress the subject in detailed medieval European knight armor inspired by the late Middle Ages, including appropriate armor pieces, cape, gauntlets, boots, shield, sword, or heraldic details while maintaining the person's recognizable appearance.

Pose the knight in a powerful, battle-ready low fighting stance inspired by classic arcade fighting games.

---

## Art Style

Create authentic 16-bit pixel art with:

- Clean pixel-perfect rendering
- Rich but limited retro color palette
- Sharp pixel edges
- Consistent pixel scale
- Classic 90s arcade sprite aesthetic
- Highly readable silhouette
- Premium handcrafted pixel artwork

Avoid blurry pixels, anti-aliasing, AI-smoothed edges, or modern digital painting effects.

---

## Background

Create a simple medieval European-inspired scene using minimal environmental elements such as:

- Castle walls
- Stone archways
- Medieval village buildings
- Castle towers
- Cobblestone ground
- Banners
- Shields
- A subtle dragon silhouette in the distance

The background should support the character without becoming visually busy.

Do not include additional people, enemies, or creatures.

---

## Sticker Composition

The character and background must be designed as one unified illustration.

Do NOT create separate sticker layers for the character and background.

After the illustration is complete, surround the entire artwork with ONE continuous white die-cut contour that follows the outer silhouette of both the character and the connected background elements.

The result should resemble a professionally manufactured collectible vinyl die-cut sticker.

---

## Canvas

- 1:1 square ratio
- Full-body character visible from head to feet
- Character occupies approximately 80–85% of the canvas
- Comfortable margin around the artwork for the die-cut outline
- Centered composition

---

## Sticker Finish

The final image should include:

- Plain white background outside the sticker
- One bold white die-cut outline surrounding the complete artwork
- Subtle soft drop shadow beneath the sticker
- Crisp print-ready edges
- High-resolution output suitable for cutting sticker production

---

## Avoid

Do NOT include:
- Guns
- Modern weapons
- Text
- Logos
- Watermarks
- Game UI
- Health bars
- Speech bubbles
- Multiple characters
- Background people
- Separate outlines around individual objects
- Cropped body parts
- Blurry pixel art
- Modern clothing

The final result should look like a premium collectible 16-bit medieval knight die-cut sticker that could be sold as official merchandise, with a single clean die-cut outline surrounding the entire integrated artwork.`,

      'Y2K Nostalgia': `Use the uploaded image as the main identity reference.

Preserve the person’s recognizable face, facial features, hairstyle, skin tone, and overall identity, but transform the final image into a stylized premium Y2K fashion die-cut sticker artwork, not a simple photo cutout.

Redraw and stylize the person as a high-quality editorial sticker character with a polished semi-realistic fashion illustration look, cinematic 35mm-inspired lighting, and Y2K attitude.

Pose:
Show the person sitting down in a dynamic, confident, fashion-editorial pose, relaxed but full of attitude.
The pose should feel intentional, stylish, and iconic, not casual or stiff.

Outfit:
- massively oversized baggy slouchy grey cotton zip-up hoodie
- faded green-yellow star print on the hoodie, subtle and worn-in
- low-rise grey-blue wash ultra wide-leg jeans
- raw hem, grungy denim texture
- no midriff showing
- chunky early-2000s skate shoes
- forest green suede
- beige accents
- fat laces
- gum-brown rubber sole
- absolutely no logos or branding anywhere

Accessories:
- muted olive / sage green rectangular Y2K sunglasses perched on top of the head
- thick plastic rims
- dark tinted lenses
- stacked chunky silver rings
- silver spider ring
- chrome fish-shaped ring
- abstract tribal / cyber-sigilism silver band
- layered Y2K necklaces:
  - black cord necklace with small dark beads
  - silver fish skeleton charm necklace with black, grey, and clear stones

Neo-Frutiger Aero decorative elements:
Add dreamy blue-white-purple gradients, glossy translucent bubbles, chrome hearts, soft lens flares, liquid-glass highlights, iridescent glow, and subtle digital haze.

IMPORTANT COMPOSITION RULE:
These decorative elements must be integrated into ONE unified sticker composition.
They must wrap around and connect to the character naturally as part of the same artwork.
Do not create a separate background blob, separate glow shape, or second silhouette behind the character.
Do not create floating detached elements that read as a separate sticker layer.
Do not create two print areas.

STICKER CUTLINE RULE:
Create only ONE single die-cut silhouette for the entire design.
The whole artwork must read as ONE unified sticker with ONE continuous outer contour.
The white die-cut border must follow the combined silhouette of the character plus connected decorative elements.
There must be no inner cutline, no second outline, no separate back shape, and no second print area.
Avoid the look of “character in front of a separate sticker-shaped background.”
The final result must feel like one professionally manufactured die-cut sticker, not layered stickers stacked together.

BACKGROUND / PRINT AREA RULE:
Use a plain white background outside the sticker only.
Inside the sticker, all decorative elements must be part of the single print area.
Do not create a large disconnected aura cloud behind the character.
Do not create a second background mass that competes with the character.
Keep the silhouette compact, balanced, and easy to understand for sticker cutting.

Composition:
- clean centered composition
- full-body character visible
- 1:1 square ratio
- character remains the hero
- decorative elements support the figure without overpowering it
- silhouette should feel stable and cohesive

Sticker finish:
- bold but neat white die-cut border
- only one outer border
- subtle sticker shadow
- print-ready mockup look
- polished premium finish

Overall look:
Premium Y2K Neo-Frutiger Aero fashion sticker.
Grungy streetwear.
Glossy digital chrome aesthetic.
Editorial attitude.
Polished die-cut sticker artwork.
Print-ready mockup.

Negative Prompt:
simple photo cutout, raw photo pasted on background, boring seated pose, ID photo pose, flat clipart bubbles, random hearts, messy outline, overly thick white border, distorted face, changed identity, extra fingers, extra limbs, messy hands, logos, branding, text, watermark, midriff showing, gloves, plain fashion catalog photo, full digital landscape background, realistic room background, poster layout, low-quality sticker edge, blurry outline, chibi style, childish cartoon style, detached decorative elements, separate glow blob, second silhouette, second sticker layer, double cutline, inner cutline, separate background shape behind character, two print areas, floating disconnected sticker elements.

Do not simply cut out the original photo.
Redraw and stylize the person into a premium editorial sticker character while keeping the face recognizable.
The final sticker must have one unified silhouette and one single print area only.

CRITICAL OUTPUT RULE:
The final sticker must have ONLY ONE print area.
Do not make the character one sticker and the aero background another sticker.
Do not create a separate soft blob or aura shape behind the person.
All visual elements must be fused into one compact unified silhouette with one continuous white die-cut border.
If any decorative element is used, it must connect visually to the main figure so the final cut shape reads as one single sticker only.`,

      'Bali-esque': `You are an expert illustrator specializing in premium collectible die-cut sticker artwork for print production.

Create a premium Bali-inspired full-body collectible die-cut sticker illustration from the uploaded photo.

The final artwork must preserve the original person’s identity, personal presentation, and original fashion style while celebrating Bali through tasteful accessories and a unified illustrated background.

This is a premium souvenir sticker, not a costume transformation.

The uploaded image may be a selfie, half-body portrait, or full-body photo. Regardless of the input crop, always create a complete full-body illustration from head to toe. If the uploaded photo only shows the face or upper body, intelligently reconstruct the missing body parts with realistic proportions while preserving the visible body type, pose logic, and outfit style.

IDENTITY PRESERVATION — HIGHEST PRIORITY:
The person must remain instantly recognizable as the same person from the uploaded photo.

Preserve the person’s:
- facial likeness
- face shape
- facial proportions
- eyes
- eyebrows
- nose
- lips
- jawline
- cheeks
- skin tone
- expression
- smile
- hairstyle
- hair color
- hair length
- head covering if present
- glasses if present
- facial hair if present
- body type
- gender presentation
- age impression
- overall personal presentation

Do not beautify the face into a different model.
Do not masculinize or feminize the person.
Do not change the person’s age.
Do not make the face generic, doll-like, or overly symmetrical.
Do not create a different person.

HEAD COVERING / HIJAB / MODESTY RULE:
If the subject wears a hijab, scarf, cap, hat, turban, or any head covering, keep it.

Do not remove the head covering.
Do not expose hair if it is covered in the original image.
Do not replace a hijab or head covering with loose hair.
Do not add hair outside the head covering.

If the original outfit is modest or covered, preserve the same coverage level.
Do not expose midriff, cleavage, shoulders, thighs, or any body areas that are covered in the source photo.

CLOTHING RULE — VERY IMPORTANT:
Preserve the person’s original outfit and personal fashion style as much as possible.

If the outfit is visible:
- keep the same shirt, jacket, dress, pants, skirt, shoes, colors, silhouette, and fashion style
- do not replace the outfit with full traditional Balinese clothing
- do not invent a completely new outfit
- do not turn the person into a dancer, performer, ceremonial figure, fantasy character, or costume character

If the outfit is only partially visible:
- preserve all visible clothing details
- reconstruct the missing outfit naturally and consistently with the visible style
- keep the result believable and aligned with the original person’s presentation

If the outfit is not visible:
- create a simple modern outfit that respects the person’s visible presentation, coverage level, and identity
- do not create revealing, theatrical, or costume-like clothing

BALINESE ACCESSORY RULE:
Add only tasteful, subtle, culturally respectful Bali-inspired accessories.

Accessories should complement the person’s original clothing, not replace it.

Use accessories adaptively based on the subject’s visible presentation, outfit, and coverage level.

Possible accessories include:
- subtle Balinese textile accent
- sash or selendang only if appropriate
- saput-inspired fabric accent only if appropriate
- refined gold accessory
- traditional bracelet
- traditional necklace
- frangipani detail
- small floral ornament
- Balinese pattern accent
- tasteful fabric detail
- tropical resort-inspired styling

If the subject has a hijab or head covering:
- integrate Bali-inspired colors, textile accents, or subtle decorative details respectfully
- do not remove the head covering
- do not expose hair
- do not attach flowers in a way that breaks the original modest presentation

Do not overload the character with accessories.
Do not create a full ceremonial costume.
Do not create religious ritual attire.
Do not make the outfit look like hotel staff, dancer costume, fantasy costume, or tourist costume.

ARTISTIC STYLE:
Create a premium modern digital illustration with:
- clean vector-inspired linework
- rich vibrant colors
- soft shading
- expressive face
- polished finish
- high detail
- warm friendly tone
- collectible sticker aesthetic
- print-ready clarity

The style should feel modern, warm, colorful, premium, energetic, and suitable for YouTube creators.

Avoid photorealism.
Avoid flat low-detail cartoon.
Avoid childish chibi style unless the input already suggests that style.

BACKGROUND:
Create a simple unified Bali-inspired illustrated environment behind and around the character.

Choose one or a few iconic Bali-inspired elements, such as:
- Garuda Wisnu Kencana-inspired silhouette
- Pura Ulun Danu-inspired lake temple
- Handara Gate-inspired scenery
- Candi Bentar-inspired gate
- Bali rice terraces
- tropical jungle
- beach cliffs
- Balinese temple gate
- traditional Balinese carvings
- tropical leaves
- frangipani flowers
- local architecture
- warm sunset
- soft tropical sky

Do not always use a temple.
Do not overcrowd the background.
Do not make the background more important than the person.
Do not use sacred or ritual scenes in an inaccurate or disrespectful way.

UNIFIED PRINT AREA RULE — MOST IMPORTANT:
The final sticker must have ONE single unified print area.

The character, accessories, and Bali background must be illustrated as one continuous connected artwork.

Do not separate the character and background into different sticker layers.
Do not create floating prop islands.
Do not create disconnected background pieces.
Do not create multiple cut areas.
Do not create separate white outlines around individual objects.
Do not make the character look like one sticker and the background like another sticker.

All decorative elements must visually connect to the main character or to the shared background shape.

The background should flow behind the character as one cohesive silhouette. Use connected shapes such as leaves, clouds, terrain, flowers, gates, landscape forms, or soft backdrop curves to unify the composition.

The final white die-cut outline must wrap around the entire combined artwork as ONE continuous outer contour.

There should be:
- one character
- one connected Bali background composition
- one outer white die-cut border
- one unified sticker silhouette
- one print/cut area only

Do not generate any decorative element unless it is physically or visually connected to the main sticker silhouette.

The sticker should feel like a professionally manufactured collectible travel sticker, not layered stickers stacked together.

COMPOSITION:
- square 1:1 ratio
- full-body character visible from head to toe
- character centered
- head and feet fully inside the canvas
- character occupies approximately 75–85% of the canvas height
- comfortable margin for the white die-cut border
- background elements support the character without overpowering
- compact, balanced, stable silhouette
- easy to cut and print

PRINT QUALITY:
The final artwork must be suitable for sticker production:
- crisp edges
- clean silhouettes
- high resolution
- balanced colors
- no blur
- no noise
- no messy outlines
- no broken sticker contour
- no overly thin detached elements
- premium print-ready mockup look
- final export on a perfect 1:1 square canvas

FINAL OUTPUT:
Create a premium Bali souvenir die-cut sticker where the original person is instantly recognizable, wearing their original outfit enhanced only with tasteful Bali-inspired accessories, standing in a beautifully illustrated Bali-inspired environment.

The entire artwork must be enclosed in one clean continuous white die-cut outline, with a plain white background outside the sticker and a subtle realistic sticker shadow.

The final file must be a perfect 1:1 square canvas containing one centered organic die-cut sticker artwork.
The sticker shape must remain organic and unified.
The square canvas is only the export area, not the sticker shape.

NEGATIVE PROMPT:
changed identity, different person, generic face, over-beautified face, masculinized subject, feminized subject, changed age, changed skin tone, changed eye shape, changed nose shape, changed mouth shape, changed jawline, hairstyle drift, hair length change, head covering removed, hijab removed, exposed hair under hijab, glasses removed, facial hair removed, changed body type, revealing outfit, exposed midriff, exposed cleavage, exposed shoulders, exposed covered body areas, outfit replaced, full traditional Balinese costume, ceremonial costume, dancer costume, fantasy costume, hotel staff outfit, tourist costume, over-accessorized character, inaccurate ritual attire, multiple characters, cropped body, cropped feet, cropped hands, half-body only, bust portrait, photorealistic output, low-quality cartoon, chibi style, dark fantasy, horror style, separate character sticker, separate background sticker, disconnected props, floating background elements, multiple cut areas, multiple white outlines, inner white outline around character, sticker inside sticker, layered sticker look, messy silhouette, broken cutline, cluttered background, text, logo, watermark, blurry, noisy, low resolution, portrait export, landscape export, non-square export, vertical canvas, horizontal canvas, cutline following canvas edge, border around the full canvas, sticker touching canvas edge, square sticker shape, rectangular sticker shape, box-shaped sticker`,

      'Video Snap': `Generate a stylized transformation video of the subject from the attached photo, snapping their fingers 4 times. Camera is static — no zoom, no pan.

Maintain a consistent character identity and appearance across all styles (same facial structure, hairstyle, and expression), even as the visual style changes.

If multiple people appear in the source image, focus only on the most prominent subject.

Sequence:
1. Subject appears in the original style, about to snap fingers.

2. On the first snap, the style transitions to a Wes Anderson-inspired look: symmetrical retro-pastel room, quirky vintage wardrobe. Keep the character's pose and finger-snap action consistent with the original — one snap only in this segment.

3. On the next snap, the style transitions to a stylized video-game render set in an urban environment: streetwear or tactical-style outfit, moody city alley background with painted wall art reading "\${channelName}". One snap only in this segment.

4. On the next snap, the style transitions to a Studio Ghibli-inspired hand-drawn animation look: whimsical illustrated wardrobe, lush painted background (cozy room or grassy landscape). One snap only in this segment.

5. On the final snap, the style transitions to a travel/holiday scene set near a recognizable Bali landmark: appropriate holiday outfit for the setting. If the subject is wearing a hijab in the source image, keep the hijab and modest styling consistent throughout. One snap only in this segment.

Style guidance:
- Each style should be visually distinct and self-contained — no blending between styles within a segment.
- Character identity, pose, and hand action stay consistent across all segments.
- Each segment runs approximately 1–1.5 seconds.
- Output format: portrait 9:16.`
    };

    for (const [name, text] of Object.entries(defaultPrompts)) {
      await db.run('INSERT OR IGNORE INTO prompts (name, prompt_text) VALUES (?, ?)', [name, text]);
    }
  }

  return db;
}

module.exports = {
  getDatabase
};
