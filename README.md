# GenDia

A modern diagram generation tool that creates visual diagrams from simple text instructions without using LLMs. This hobby project is inspired by Pikchr and provides a clean, rule-based approach to diagram creation.

## Features

- **Modern Dark Theme Playground**: Professional web-based editor with syntax highlighting
- **Grid-Based Coordinate System**: 20px grid with visual alignment and coordinate display
- **Arrow Support**: Single arrows (`arrow`) and double arrows (`doublearrow`)
- **Contour-Based Connections**: Lines connect to shape boundaries, not centers
- **Real-time Preview**: Live diagram rendering as you type
- **File-Based Examples**: Dynamic example loading from `.gendia` files

## Overview

GenDia uses a custom `.gendia` file format to define diagrams through three sections:
- **POSITION_MAP**: Node positions using relative positioning grammar
- **CONNECTION_MAP**: Node connections with line styles and arrows
- **SHAPE_MAP**: Node shapes (rect, circ, diamond)

## File Format

```gendia
POSITION_MAP
r{8}CENTER|A
d{5}A|B
l{5}B|C

CONNECTION_MAP
A:B|arrow
B:C|dotted
C:A|line

SHAPE_MAP
A:rect
B:circ
C:rect
```

## Positioning Grammar

- **Directional**: `l|r|u|d{distance}knownNode|newNode`
  - `l` = left, `r` = right, `u` = up, `d` = down
  - Distance in grid units (1 unit = 20px grid square)
- **Angular**: `{angle}deg{distance}knownNode|newNode`
  - Angle in degrees (0-360), distance in grid units
- **CENTER** is the required starting reference point at (0,0)

## Connection Types

- `line`: Solid line connection
- `dotted`: Dotted line connection
- `arrow`: Single-headed arrow
- `doublearrow`: Double-headed arrow

## Shape Types

- `rect`: Rectangle
- `circ`: Circle
- `diamond`: Diamond shape

## Getting Started

1. Open `index.html` in a web browser
2. Use the built-in editor to write GenDia instructions
3. Click example buttons to see sample diagrams
4. Diagrams render automatically with live preview

## Project Structure

```
gendia/
├── index.html          # Main playground interface
├── gendia.js          # Core GenDia engine and playground
├── utils.js           # File parsing utilities
├── examples/          # Example .gendia files
│   ├── basic.gendia
│   ├── flowchart.gendia
│   ├── angular.gendia
│   └── tree.gendia
└── test/             # Test files
```

## Tech Stack

- **Frontend**: HTML5 Canvas, Modern CSS, Vanilla JavaScript
- **Parsing**: Custom grammar parser (no external dependencies)
- **Styling**: Dark theme with gradient effects and modern typography
- **Architecture**: ES6 modules with async file loading