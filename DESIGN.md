# OrbitPM design system

Direction: light, calm, work-focused (Jira / Trello style). Reference: a project
tool people use all day, so the UI stays quiet and lets tasks, labels and status
carry the color.

## Color (Tailwind tokens in client/tailwind.config.js)
| Role | Token | Hex |
|---|---|---|
| Page canvas | `space-950` | #F4F5F7 |
| Surface (cards, sidebar, header) | `space-900` | #FFFFFF |
| Hover / subtle fill | `space-800` | #F1F2F4 |
| Border | `space-700` | #DFE1E6 |
| Strong border / input | `space-600` | #C1C7D0 |
| Muted text / icons | `space-400` | #6B778C |
| Secondary text | `space-300` | #505F79 |
| Primary text | `space-50` | #172B4D |
| Accent (primary buttons, links, active nav) | `orbit-500` | #0C66E4 |
| Accent hover / accent text | `orbit-600` | #0055CC |
| Accent tint (active nav, badges) | `orbit-50` | #E9F2FF |

Status/label colors (green, amber, red, purple) are used only for meaning:
task status, priority, labels. Never for decoration.

## Typography
Inter everywhere. Headings 600 with slight negative tracking, body 14px / 400,
labels 12-13px / 500, section labels 11px uppercase.

## Shape and depth
Radius 6px controls, 8px cards. Depth comes from 1px borders and a hairline
shadow (`shadow-card`), not gradients or glows. One accent-filled button per view.

## Components
- Sidebar: white, right border, active item = `orbit-50` fill + 3px left bar.
- Header: white, bottom border, search pill left, notifications right.
- Cards: white, `space-700` border, hover raises border to `space-600`.
- Inputs: white, `space-600` border, blue focus ring.

## Do / don't
Do keep surfaces flat and text contrast high. Don't add gradients, glows, or a
second accent color.
