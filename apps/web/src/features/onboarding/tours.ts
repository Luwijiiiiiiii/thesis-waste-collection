// Guided-tour copy for every screen. Each `target` matches a `data-tour="…"` attribute on that screen;
// a step whose target isn't on screen (e.g. no recent results yet) is skipped.
import type { TourDef } from "@/components/Tour";

export const landingTour: TourDef = {
  id: "landing",
  steps: [
    {
      target: "upload-card",
      title: "Step 1 · Upload a file",
      text: "Have a route file? This option is already picked. It's a .json listing the garage and every pickup point.",
    },
    {
      target: "dropzone",
      title: "Drop your file here",
      text: "Drag your file into this box, or press “Choose a file”. It's checked right away and you'll see what's missing.",
    },
    {
      target: "sample",
      title: "No file? Use the sample",
      text: "Loads a real Baguio route so you can try everything first. Nothing to prepare.",
    },
    {
      target: "draw-card",
      title: "Or draw it on the map",
      text: "Tap to place the garage (G), then tap each stop. Good when you don't have a file.",
    },
    {
      target: "recent",
      title: "Your recent results",
      text: "Past runs are saved. Open one to see its results again, or go to History for all of them.",
    },
    {
      target: "help",
      title: "Need help again?",
      text: "Press ? any time. Every screen has its own quick tour.",
    },
  ],
};

export const reviewTour: TourDef = {
  id: "review",
  resetTo: "tab-map",
  steps: [
    {
      target: "tab-map",
      activate: true,
      title: "Step 2 · Check your data",
      text: "Map shows every stop, numbered in your file's order. G is the garage.",
    },
    {
      target: "tab-points",
      activate: true,
      title: "Collection points table",
      text: "One row per stop: ID, name, waste type, priority and coordinates. Type in a box to fix a value.",
    },
    {
      target: "tab-details",
      activate: true,
      title: "Route and truck details",
      text: "Route name, driver, truck speed, fuel use, fuel price and CO₂ factor. The defaults are fine if unsure.",
    },
    {
      target: "loaded-file",
      title: "Your file",
      text: "The file you're working on. Load a different one here at any time.",
    },
    {
      target: "validation",
      title: "Validation",
      text: "Green ticks mean the data is OK. A red one tells you exactly what to fix.",
    },
    {
      target: "run",
      title: "Step 3 · Run the simulation",
      text: "Unlocks once validation passes. Each step ticks off as it works, and you'll go to the results when it's done.",
    },
  ],
};

export const drawTour: TourDef = {
  id: "draw",
  resetTo: "tab-map",
  steps: [
    {
      target: "draw-map",
      title: "Tap to add points",
      text: "Your first tap places the garage (G). Every tap after that adds a stop. Drag a marker to move it.",
    },
    {
      target: "stop-list",
      title: "Your stops, in order",
      text: "This order is the traditional route. Use the arrows to reorder, Undo to step back, or Clear all.",
    },
    {
      target: "tab-points",
      activate: true,
      title: "Name your stops",
      text: "A table of every point. Give them names, waste types and priorities.",
    },
    {
      target: "tab-details",
      activate: true,
      title: "Route and truck details",
      text: "Route name, driver, truck speed, fuel use, fuel price and CO₂ factor. The defaults are fine if unsure.",
    },
    {
      target: "run",
      title: "Run the simulation",
      text: "Unlocks once you have enough stops and validation passes.",
    },
  ],
};

export const resultsTour: TourDef = {
  id: "results",
  resetTo: "tab-map",
  steps: [
    {
      target: "savings",
      title: "Step 4 · What you save",
      text: "Each tile compares the traditional route with the optimized one. Green means the optimized route is better.",
    },
    {
      target: "tab-map",
      activate: true,
      title: "Route map",
      text: "Switch between Optimized and Traditional. Pick a stop in the list to find it on the map.",
    },
    {
      target: "tab-comparison",
      activate: true,
      title: "Comparison table",
      text: "Distance, time, fuel, cost and CO₂ side by side, with how much is saved.",
    },
    {
      target: "tab-routes",
      activate: true,
      title: "Route details",
      text: "The visiting order of each route, stop by stop, with the distance of every leg.",
    },
    {
      target: "tab-network",
      activate: true,
      title: "Road network",
      text: "Where each stop joins the road. A warning sign means a stop is far from any road.",
    },
    {
      target: "tab-export",
      activate: true,
      title: "Export",
      text: "Download the tables, routes and map layers for your report.",
    },
  ],
};

export const reviewInvalidTour: TourDef = {
  id: "review-invalid",
  steps: [
    {
      target: "validation",
      title: "This file needs a fix",
      text: "The red items list exactly what's wrong, like a missing garage or a bad coordinate.",
    },
    {
      target: "template",
      title: "Start from the template",
      text: "Download a file that already has the right layout, then fill in your own stops.",
    },
    {
      target: "loaded-file",
      title: "Load the fixed file",
      text: "Press Replace to load your corrected file. It's checked again right away.",
    },
  ],
};

export const historyTour: TourDef = {
  id: "history",
  steps: [
    {
      target: "history-stats",
      title: "Your track record",
      text: "How many runs you've done, the average distance saved and your best result.",
    },
    {
      target: "history-table",
      title: "Every run, newest first",
      text: "Each row shows the route, its stops, and the Traditional vs Optimized distance. Saved is green when the optimized route is shorter.",
    },
    {
      target: "history-open",
      title: "Open a past run",
      text: "Click its ID to see the full results, map and exports again.",
    },
    {
      target: "new-simulation",
      title: "Run a new one",
      text: "Go back to the workspace and add another route.",
    },
  ],
};
