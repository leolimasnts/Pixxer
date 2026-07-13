# Pixxer

> A lightweight browser tool to inspect pixel art palettes, isolate colors, and count exactly how many pixels each color occupies.

---

## Overview

**Pixxer** is a small utility built for pixel artists and collaborative pixel canvases. Upload any pixel art image and instantly inspect its palette, see how many pixels belong to each color, and isolate individual colors while dimming the rest of the image.

The goal is simple: make it easier to recreate, analyze, or paint pixel art one color at a time.

---

## Features

* Upload any pixel art image directly in the browser.
* Automatically extracts every unique color from the image.
* Counts the number of pixels for each color.
* Click a color to isolate it while fading all others.
* Draws outlines around matching pixels for easier visualization.
* Displays cursor coordinates and color information.
* Copy a pixel's hexadecimal color with the middle mouse button.
* Zoom and pan around large pixel art without smoothing.

---

### Controls

| Action                       | Result                               |
| ---------------------------- | ------------------------------------ |
| Left Click                   | Select or deselect the clicked color |
| Click a color in the sidebar | Isolate that palette color           |
| Mouse Wheel                  | Zoom in or out                       |
| Left Click + Drag            | Pan the canvas                       |
| Middle Click                 | Copy the hovered pixel's HEX color   |
| Clear Filter                 | Show the original image again        |

---

## Why?

This project was built as a simple utility for inspecting pixel art. It is particularly useful when recreating artwork on collaborative pixel canvases or whenever you need to work through an image one color at a time.
