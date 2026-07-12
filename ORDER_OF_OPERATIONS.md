# Caney Flow Tracker: Implementation Order of Operations

This document establishes the strict, step-by-step development sequence for building the Caney Flow Tracker web application. Developers/AI agents must focus entirely on the active phase and fully verify its functionality before moving to the next. Do not attempt to write code for future phases prematurely.

---

## Phase 1: Mobile-First UI Shell & Mock Layout
**Objective:** Establish the application's look, feel, responsive breakpoints, and static layout using localized mock data.

* **Tasks:**
  - Build a clean, single-page UI optimized explicitly for mobile viewports (boat-ramp usage).
  - Hardcode the 8 river access points and their absolute mile distances from the dam as defined in `PROJECT_SCOPE.md`.
  - Create a mock data structure representing a standard 24-hour dam release schedule (e.g., 0 generators all morning, 1 generator from 12:00 PM to 4:00 PM, 2 generators from 4:00 PM to 6:00 PM).
  - Design the placeholder layout for the main flow timeline chart and the detailed Point Status Cards.
* **Exit Criteria:** The UI renders beautifully on a mobile screen, and changing the hardcoded mock data manually reflects changes instantly in basic text states.

---

## Phase 2: Core Flow Mapping & Wave Simulation Engine
**Objective:** Program the predictive mathematical model that calculates water transit times down the tailwater.

* **Tasks:**
  - Implement the generation wave velocities (1 Gen = 2.75 MPH, 2 Gen = 3.75 MPH) and the drop-out/receding velocity (0 Gen = 1.5 MPH).
  - Write the algorithmic logic to calculate the exact arrival time of the water front at each downstream mileage marker based on the 24-hour schedule.
  - Solve the "Double Wave" complication: Ensure the engine tracks overlapping pulses (multiple distinct walls of high water and low water moving down the river simultaneously).
  - Dynamically apply color-coded Wading Status badges (Green, Yellow, Red) and text-based Paddling Difficulty profiles to each Access Point card based on the timeline calculation.
* **Exit Criteria:** Modifying the mock schedule correctly adjusts the predicted arrival times and safety statuses chronologically down the line of access points.

---

## Phase 3: Live USGS API Client-Side Integration
**Objective:** Connect the frontend to live, real-time river data to provide ground-truth verification.

* **Tasks:**
  - Integrate a direct frontend fetch request to the public, CORS-friendly USGS Water Services REST API.
  - Target Station 03426310 (Caney Fork Near Carthage, TN) and Station 03426250 (Caney Fork at Elmwood, TN).
  - Parse the current actual Cubic Feet per Second (CFS) flow rate and gauge height.
  - Display a prominent "Live Verified Flow" badge on the UI next to the schedule predictions, accompanied by a "Last Updated" timestamp for the API pull.
* **Exit Criteria:** The application successfully renders real-time data directly from the USGS gauges alongside the predictive model without triggering cross-origin browser errors.

---

## Phase 4: GitHub Actions Automated Scraping Backend
**Objective:** Replace the mock schedule data with automated, daily real-world schedule tracking.

* **Tasks:**
  - Write a standalone automation script (Node.js or Python) designed to run in a headless environment.
  - The script must fetch the raw HTML from the public USACE page: https://www.lrn-wc.usace.army.mil/tva_schedule.shtml
  - Parse the Center Hill Dam generation table out of the HTML and structure it into a clean, uniform JSON format.
  - Configure a `.github/workflows/scrape.yml` file to execute this script via GitHub Actions on a cron schedule (every morning at 5:00 AM CST, plus hourly refresh checks).
  - Ensure the workflow commits the compiled output directly to `data/schedule.json` in the repository to trigger a static GitHub Pages deployment rebuild.
  - Update the frontend to pull its predictive data natively from `/data/schedule.json`.
* **Exit Criteria:** The app runs completely end-to-end on GitHub Pages, automatically updating its underlying generation schedule file without manual developer intervention.