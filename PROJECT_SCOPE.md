Act as an expert software engineer and UI/UX designer. Build a mobile-first web application called "Caney Flow Tracker" for kayakers and trout anglers on the Caney Fork River in Tennessee. 

The application is hosted entirely as a static site on GitHub Pages. Dynamic data updates are handled via scheduled automated scripts (GitHub Actions) compiling raw data into static JSON files.

### 1. Architecture & Data Ingestion
The app relies on two distinct data paths to bypass browser CORS restrictions:

A. Scheduled Pre-Schedule Pipeline (GitHub Actions)
* A background GitHub Action workflow runs on a cron schedule (e.g., every morning at 5:00 AM CST and hourly updates).
* The workflow executes a scraping script (Node.js/Axios/Cheerio or Python) that hits the public USACE Nashville District Water Management page: https://www.lrn-wc.usace.army.mil/tva_schedule.shtml
* The script parses the Center Hill Dam hourly generator preschedule table (values of 0, 1, or 2 generators, or CFS equivalents) for the current 24-hour block.
* The script saves this parsed data as a static JSON file (`data/schedule.json`) in the repository and commits it, instantly updating the GitHub Pages deployment.

B. Live Actual Flow Pipeline (Frontend)
* The client-side frontend directly calls the public, CORS-friendly USGS Water Services REST API to get real-time data from the Caney Fork River gauges:
  - USGS Gauge Near Carthage, TN (Station: 03426310)
  - USGS Gauge at Elmwood, TN (Station: 03426250)
* The app fetches the current verified Cubic Feet per Second (CFS) and gauge height to display as a "Live Verified Flow" badge.

### 2. Core River Logic & Flow Mapping Engine
The frontend application reads the `data/schedule.json` file and maps estimated river conditions down the tailwater using these exact parameters:

* Water Travel & Receding Speeds:
  - 1 Generator active: Water wave front moves downstream at 2.75 MPH.
  - 2 Generators active: Water wave front moves downstream at 3.75 MPH.
  - 0 Generators active: Water recedes/drains out at a slower rate of ~1.5 MPH.
* The "Double Wave" Logic: The flow engine must accurately calculate overlapping generation windows. If the dam schedules a morning pulse and an afternoon pulse, the UI timeline must visually track both moving wave fronts and the trailing low-water drop-outs as they migrate down the river simultaneously.
* River Points & Distances (Miles from Center Hill Dam):
  - Long Branch Recreation Area (Dam Right): 0.0 miles
  - Buffalo Valley Recreation Area (Dam Left): 0.0 miles
  - Lancaster Pull-offs: 0.75 miles
  - Happy Hollow Boat Ramp: 3.5 miles
  - Betty's Island Boat Ramp: 9.0 miles
  - Stonewall Bridge Boat Ramp: 14.5 miles
  - South Carthage Ag Center: 18.5 miles
  - Carthage Lighthouse (Mouth of the Cumberland): 21.0 miles

### 3. Frontend UI Components (Mobile-First Focus)
* Interactive Flow Timeline: A visual, scannable graph or interactive chart showing the 12-to-24-hour water projection for the entire river. Users can see a wave "moving" through the points over time.
* Point-by-Point Status Cards: When a user selects a specific ramp, display:
  - Wading Safety Badge: Green (Safe / Sustained 0 Gen), Yellow (Caution / Water Rising or Falling), Red (Dangerous / Active High Flow).
  - Paddling Profile: 0 Gen ("Low & Slow" - expect to drag on shallow shoals); 1 Gen ("Optimal Cruise" - fast moving, easy tracking); 2 Gen ("Swift Current" - heavy push, advanced only).
  - Live vs. Predicted Comparison: Compare what the preschedule *said* the water should be doing versus what the live USGS gauge says it is *actually* doing right now.
  - Section-Specific Warnings: 
    * Constant: 52–55°F water temperature warning (hypothermia/safety risk).
    * Carthage Lighthouse Specific: Warning badge highlighting that water levels and swifter eddies at this final ramp are highly volatile due to back-up influence from the Cumberland River confluence.

### 4. Technical Constraints & UI Styling
* Built for standard mobile viewports first (highly responsive for use at the boat ramp).
* Modern, clean UI using Tailwind CSS or shadcn/ui styles.
* Clear "Data Status" indicator showing the exact timestamp of the last successful GitHub Actions scrape and the last live USGS API pull.