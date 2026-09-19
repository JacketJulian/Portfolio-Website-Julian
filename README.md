# Julian Mangual's Portfolio Website

## Overview
This is a modern, responsive, and interactive personal portfolio website designed to showcase my skills, projects, and educational background as a Software Engineer. Built with React, it features a clean, polished UI/UX with smooth animations and a unique iMessage-inspired "About" section.

## Features

### Dynamic & Responsive Design
-   **Smooth Scrolling:** Seamless navigation between sections with smooth scroll effects.
-   **Responsive Layout:** Adapts gracefully to various screen sizes (desktop, tablet, mobile).
-   **Themed Components:** Consistent styling across the application using a centralized theme.
-   **Custom Favicon:** Includes a custom favicon for brand recognition.

### About Section
-   **Personalized Greeting:** Features a "👋 Hi, I'm" greeting with a custom font weight.
-   **iMessage-Inspired Bubble:** The main text content is presented within a unique iMessage-style speech bubble with a custom blue background (`#1CA4ED`), rounded corners, and a precisely positioned SVG tail.
-   **Profile Picture:** Displays a profile image within a custom-sized (360px width, 400px height) placeholder with a subtle drop shadow.
-   **Resume Button:** A transparent, rounded button with a blue border and white text, linking directly to the resume. The button's background turns blue on hover for visual feedback.
-   **Scroll Indicator:** A bouncing `⬇️` emoji at the bottom of the section guides users to scroll down.

### Projects Section
-   **Dynamic Project Display:** Showcases projects with images, titles, and descriptions.
-   **Styled Descriptions:** Project descriptions are presented in a rounded-rectangle container with a blue background and contrasting white, left-aligned text for readability.
-   **Styled Hyperlinks:** "Live Demo" and "GitHub" links are styled as rounded buttons with a blue background (`#1CA4ED`) and white text, similar to the resume button.
-   **Description Overflow:** Project descriptions are limited in height with a scrollbar for longer content, maintaining card uniformity.

### Education Section (New!)
-   **Detailed Education List:** Presents educational background in a clear, structured list format.
-   **Sorted Entries:** Education entries are sorted by date (most recent first).
-   **Tech Stack Bubbles:** Technologies learned are displayed as rounded, blue (`#1CA4ED`) bubbles with white text, providing a quick overview of skills.
-   **Uniform Padding:** The section's content padding aligns with the Projects section for a consistent look.

### Navigation Bar
-   **Clean & Thin Design:** A sleek, thinner navigation bar with smaller, normal-weight text elements.
-   **Blur Effect on Scroll:** When scrolled, the navigation bar becomes semi-transparent with a "stain white" background and a subtle blur effect on the content underneath, enhancing the modern aesthetic.
-   **Hover Effects:** Navigation links change color on hover for improved interactivity.

## Technologies Used
-   **React:** A JavaScript library for building user interfaces.
-   **HTML5:** Standard markup language for creating web pages.
-   **CSS3:** Styling language for web content.
-   **JavaScript (ES6+):** Programming language for interactive web pages.
-   **React Scroll:** For smooth scrolling navigation.
-   **Bootstrap:** For responsive design utilities.
-   **Google Fonts (Inter):** For a clean, Apple-like typography.

## Getting Started

### Prerequisites
-   Node.js (LTS version recommended)
-   npm (Node Package Manager)

### Installation
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/JacketJulian/Portfolio-Website-Julian-.git
    cd Portfolio-Website-Julian-
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```

### Running Locally
To start the development server:
```bash
npm start
```
The application will typically open in your browser at `http://localhost:3000`.

### Local portfolio editor

On localhost or a loopback address, **Edit portfolio** opens a full-width, half-height bottom tray. The live site above it remains interactive. Choose Projects, Experience, or Education, use **Show section**, and drag the component onto that section. A dashed version of the actual component marks placement. **Add** (or Enter/Space on the preview) provides a keyboard alternative.

Edit the new draft in the tray; its fields update the real page collection. The shelf, live items, and placeholders share `PortfolioItem`, and controls reuse `Button` or `TgtButton` according to the current theme. Escape cancels an active drag; otherwise it closes the tray.

While **Edit portfolio** is open, hover or keyboard-focus an existing project, experience, or education item to highlight its whole area with a themed dashed boundary. Click or tap the item (or press Enter/Space) to open its fields. There is no separate Modify button, and closing the editor restores normal browsing without editing highlights. Original entries are edited in place without duplicates; **Reset changes** restores the source entry. Added entries keep their **Remove draft** action.

The **About** tab edits the existing page body: name/headline, description, resume URL and label, and images. Clicking About text or its image on the live page opens the corresponding field. Apple uses one portrait for desktop and mobile; Target has separate desktop and mobile banner URLs (blank mobile uses desktop). Each theme saves independently, and **Reset changes** restores only that theme's About content. Existing project/experience/education drafts are preserved.

Local development drafts are saved only in this browser under `julian-portfolio-cms-drafts-v2`. They survive reloads but do **not** modify `src/data.js` or publish automatically. Production builds never enable the localhost bypass.

The production CMS uses `/admin`: Google sign-in is verified on the server and only the configured, verified Google account can edit. Changes preview in the same existing components; **Publish** explicitly saves them for all visitors. Production edits remain in memory until published. Do not close/reload a tab with unpublished work. Local browser drafts are not automatically uploaded.

Focused editor checks: `CI=true npm test -- --watchAll=false --runInBand --testPathPattern='DeveloperMode|cmsDrafts|useCmsDrafts|PortfolioItem|cmsAbout|About.*test'`.

## Customization
-   **`src/data.js`:** Update your personal information, projects, education details, and contact links.
-   **`src/theme.js`:** Modify color schemes to match your personal branding.
-   **CSS Files:** Adjust styling in individual component CSS files for fine-grained control.

## Deployment

Production uses Cloud Run in `optical-genre-468001-v1`, service `portfolio`, region `us-central1`. The Node server serves the React build and same-origin CMS endpoints. See [the production CMS runbook](docs/production-cms.md) for required OAuth/Secret Manager setup, deployment and rollback.

The older GitHub Pages workflow remains unchanged, but a static Pages deployment cannot provide the production admin API. The existing GCP trigger's inline definition now matches `cloudbuild.yaml`, including backend tests and runtime Secret Manager references. Future changes to this file must also be synchronized to the inline trigger (or the trigger explicitly migrated to a repository filename). The initial production rollout was built from the local workspace; subsequent GitHub-triggered builds use the committed source on `main`.

## Contact
-   **Julian Mangual** - [julianjmangual@gmail.com](mailto:julianjmangual@gmail.com)
-   **LinkedIn:** [Julian Mangual](https://www.linkedin.com/in/julian-mangual-949a0622b/)
-   **GitHub:** [JacketJulian](https://github.com/JacketJulian/)

---
