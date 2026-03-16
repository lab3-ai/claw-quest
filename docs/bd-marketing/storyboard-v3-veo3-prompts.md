# ClawQuest Waitlist Video — Storyboard V3 + Veo 3 Prompts

## Specs

| Property | Value |
|----------|-------|
| Duration | ~18s |
| Aspect | 16:9 (1920x1080) |
| Platform | X/Twitter (mute autoplay) |
| Style | Hybrid: AI-generated clips (Veo 3) + motion graphics (CapCut) |
| Design rule | **Text carries 100% of message** (mute-first) |
| Opening | PAS formula: Problem (video) → Agitate → Solution |

---

## Veo 3 Clips to Generate

### Clip 1: "Agent Running" (1.5-2s)

**What it shows:** Close-up of a screen/monitor displaying code or terminal output scrolling rapidly — looks like an AI agent actively working.

```
Prompt:
"Cinematic close-up of a computer monitor in a dark room showing green terminal
text rapidly scrolling, code compiling and AI agent logs running. The screen
reflects on the person's glasses. Shallow depth of field, moody blue-teal
lighting from the monitor glow. Dark background. Shot on anamorphic lens.
3 seconds, slow motion."
```

**Alternative prompt (simpler):**
```
"Close-up of a glowing computer screen in a dark room showing lines of code
scrolling fast, green text on black terminal. Monitor light illuminating the
desk. Cinematic, moody lighting. 3 seconds."
```

**Notes:**
- Chỉ cần 1.5-2s usable footage
- Trim trong CapCut, lấy đoạn đẹp nhất
- Nếu Veo 3 render mặt người trên screen → crop chỉ lấy phần monitor

---

### Clip 2: "Frustrated Developer" (1.5-2s)

**What it shows:** A developer sitting at desk, drops their head or leans back in frustration. Multiple monitors in background showing code.

```
Prompt:
"A young developer sitting at a desk with dual monitors showing code, in a dark
room with ambient monitor lighting. They slowly drop their head into their hands
in frustration. Defeated body language. Cinematic lighting, shallow depth of
field, dark moody atmosphere. Shot from the side at 45 degrees. 4 seconds."
```

**Alternative prompt (no face focus — safer for AI generation):**
```
"Over-the-shoulder shot of a person sitting at a desk with multiple monitors
showing code. They slowly lean back and drop their shoulders in defeat. Dark room,
only lit by the blue glow of computer screens. Cinematic, moody. 4 seconds."
```

**Notes:**
- Over-the-shoulder/side angle tránh vấn đề AI generate mặt
- 4s prompt → trim lấy đoạn body language đẹp nhất (~1.5s)
- Nếu cần, generate 3-5 lần chọn clip tốt nhất

---

### Clip 3 (Optional): "Screen with Dollar Signs / Empty Wallet"

**If needed for extra punch on "AGENTS EARN? ✗":**

```
Prompt:
"Close-up of a computer screen in a dark room showing a cryptocurrency wallet
interface with $0.00 balance. The screen glows faintly. Moody, cinematic
lighting. 2 seconds."
```

**Notes:** Có thể không cần nếu text overlay đã đủ mạnh.

---

## Veo 3 Generation Tips

1. **Generate nhiều takes:** Mỗi prompt chạy 3-5 lần, pick best
2. **Duration:** Prompt 3-4s, trim trong CapCut lấy 1.5-2s đẹp nhất
3. **Lighting consistency:** Tất cả clips nên dark room + monitor glow → match với phần motion graphics dark bg sau
4. **Aspect ratio:** Generate 16:9 để match output
5. **Style keywords luôn thêm:** `cinematic`, `shallow depth of field`, `dark moody`, `anamorphic`

---

## Full Storyboard V3

### ACT 1: PROBLEM (0-4.5s) — Video + Text Overlay

> PAS Formula: Problem phase. Viewer nhận ra pain point của mình.

**0-1.5s — Clip 1: Agent Running**
- **Visual:** Veo 3 clip — code/terminal scrolling on screen, dark room
- **Overlay:** `AGENTS BROWSE. ✓` — white text, coral checkmark
- **Text animation:** Fade-in from left, checkmark pops with scale bounce
- **Color grade:** CapCut — add dark overlay 30%, slight green tint to match particle wave later

**1.5-3s — Clip 1 continues OR cut to Clip 2 early**
- **Visual:** Same clip (code running) hoặc transition to developer
- **Overlay:** `AGENTS CODE. ✓` — white text, coral checkmark
- **Text animation:** Same style, stagger 0.3s delay
- **Transition:** Subtle glitch between clips if cutting

**3-4.5s — Clip 2: Frustrated Developer**
- **Visual:** Veo 3 clip — person drops head in frustration
- **Overlay:** `AGENTS EARN? ✗` — coral text (#FF574B), red X icon
- **Text animation:** Text shakes/vibrates 0.2s (micro-shake), X icon slams in
- **Audio cue:** (optional) Low bass hit / error sound

---

### ACT 2: AGITATE + PIVOT (4.5-6.5s) — Motion Graphics

> Moment of tension → release. "Until now" flips everything.

**4.5-5s — White Flash**
- Full white frame, 0.3s
- Hard cut from video footage → clean motion graphics
- Creates visual "reset"

**5-6.5s — "UNTIL NOW."**
- **Background:** Dark `#0A0A0F`, particle wave terrain fades in from bottom
- **Text:** `UNTIL NOW.` — coral `#FF574B`, bold, ALL CAPS
- **Animation:** Slam-in (scale 120%→100%, ease-out) with subtle glow pulse
- **Hold:** 1.5s
- Period at end = finality, confidence

---

### ACT 3: BRAND REVEAL (6.5-8.5s)

**6.5-8.5s — Logo + Tagline**
- **Visual:** Dark bg, particle wave background active
- **Animation:**
  - Logo wordmark (`logo-clawquest.svg`) — pixel/glitch reveal, 0.5s
  - Mascot (`mascot.svg`) slides in from right, subtle float
  - Tagline: `The quest platform for AI agents` — fade-in below, `#999999` muted
- **Font:** Geist Mono, 400 weight

---

### ACT 4: HOW IT WORKS (8.5-10.5s)

**8.5-10.5s — Step Flow**
- **Visual:** Animated flow diagram
```
[step-1-register]  →  [step-2-quest]  →  [step-3-paid]
   Register              Quest              Paid
```
- **Animation:** Nodes appear stagger 0.5s each, connected by animated coral line drawing left→right
- Coral glow pulse sweeps left→right when flow completes
- Square corners (Terminal theme, radius 0px)
- **Font:** Geist Mono, 400, white labels

---

### ACT 5: VALUE + SCARCITY (10.5-13.5s)

**10.5-11s — White Flash**
- Transition flash, 0.3s

**11-12.5s — "$50,000 IN REWARDS"**
- **Text:** `$50,000 IN REWARDS` — large, centered
- "$50,000" in coral `#FF574B`, heartbeat glow pulse (scale 100%→103%→100%)
- "IN REWARDS" in white
- **Background:** Dark + particle wave

**12.5-13.5s — OG Badge**
- **Text:** `OG PIONEERS — CLOSING SOON`
- MingCute `ShieldLine` icon instead of emoji
- Coral border badge, square corners, terminal style
- **Animation:** Badge scales in (0→100%), holds
- **Font:** Geist Mono, medium 500

---

### ACT 6: CTA + CLOSER (13.5-18s)

**13.5-15s — CTA Text**
- **Background:** Dims slightly
- **Text:** `CLAIM YOUR SPOT` — Geist Mono, semibold 600, white, centered
- Thin coral `#FF574B` neon border box around text
- Square corners
- **Animation:** Character scramble (WhalesPredict style) — letters shuffle then resolve

**15-16s — URL**
- **Text:** `clawquest.ai` — coral `#FF574B`, Geist Mono
- **Animation:** Animated underline draws left→right

**16-17s — Brand Lockup**
- Claw icon (`appicon.svg`) + mascot — compact, bottom-center
- Fade in, subtle float

**17-18s — End**
- Coral glow fade out → clean end frame
- Hold 1s on final card

---

## Timeline Overview

```
0s        1.5s       3s     4.5s 5s    6.5s      8.5s     10.5s 11s      12.5s   13.5s        18s
│─BROWSE──│──CODE──│─EARN?─│F│UNTIL│──BRAND──│──FLOW──│F│─$50K──│─OG──│────CTA + URL────│
│ Veo3    │ Veo3   │ Veo3  │ │NOW  │logo+tag │ steps  │ │reward │badge│scramble+url+end│
│ clip 1  │clip1/2 │clip 2 │ │     │         │        │ │       │     │                │
│ VIDEO   │ VIDEO  │ VIDEO │ │     MOTION GRAPHICS    │ │   MOTION GRAPHICS            │
```

---

## CapCut Layer Structure

```
Layer 5: Text overlays (✓ ✗ icons, all text)
Layer 4: Glow effects, particles (overlay blend mode)
Layer 3: Brand assets (logo, mascot, step SVGs, appicon)
Layer 2: Dark overlay (30-40% opacity, for video sections)
Layer 1: Background (Veo 3 clips for 0-4.5s, particle wave loop for 4.5-18s)
```

---

## Asset Checklist

### Cần Generate (Veo 3)
- [ ] Clip 1: Terminal/code running on screen in dark room (3-4s, trim to 1.5-2s)
- [ ] Clip 2: Developer frustrated, drops head (4s, trim to 1.5-2s)
- [ ] (Optional) Clip 3: Empty wallet screen

### Có sẵn (Brand Assets)
- [x] `logo-clawquest.svg` — brand reveal
- [x] `appicon.svg` — end lockup
- [x] `mascot.svg` — brand reveal + end lockup
- [x] `step-1-register.svg` — flow node 1
- [x] `step-2-quest.svg` — flow node 2
- [x] `step-3-paid.svg` — flow node 3
- [x] `mockup-quest-browser.png` — (optional, not used in v3)

### Cần tạo/tìm
- [ ] Particle wave background loop (dark, 1920x1080, seamless loop)
  - Option A: Stock footage "abstract dark particle wave" từ Pexels
  - Option B: Generate trong After Effects / Blender
  - Option C: CapCut built-in particle effect
- [ ] Font: Geist Mono (download từ Google Fonts hoặc Vercel)
- [ ] MingCute ShieldLine icon (export SVG từ @mingcute/react)

### CapCut Settings
- Project: 1920x1080, 30fps
- Export: H.264, bitrate 10Mbps
- Variant: thêm 1080x1080 cho X square format

---

## Design Tokens (Reference)

| Token | Value |
|-------|-------|
| Primary | `#FF574B` (ClawQuest Coral) |
| Dark bg | `#0A0A0F` |
| Text primary | `#FFFFFF` |
| Text muted | `#999999` |
| Font | Geist Mono (600 headings, 400 body) |
| Border radius | 0px |
| Checkmark color | `#FF574B` (coral) |
| Error/X color | `#FF574B` (coral, with shake) |
