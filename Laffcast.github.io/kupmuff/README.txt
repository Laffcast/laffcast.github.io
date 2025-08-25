Laffcast — KupMuff Archive Player (Drop‑in Patch)
=================================================

What this adds
--------------
• Click the "The KupMuff Show" logo → an HTML5 audio player is injected *under “The Archive”* and pushes the page down naturally.  
• The newest episode from **/assets/feeds/KupMuff/RSS-KupMuff.xml** is selected in the player.  
• Below it: the last 5 episodes are shown, with a "Load 10 more" button for the full scrollable history.  
• Centered layout (~44em wide), accessible markup, minimal styles.

Files
-----
- kupmuff/archive-player.js
- kupmuff/archive-player.css
- kupmuff/demo.html (stand‑alone demo)
- kupmuff/README.txt (this file)

How to integrate
----------------
1) Copy the entire `kupmuff/` folder into your site (e.g., `/<repo-root>/kupmuff/`).

2) In the page that has your "The Archive" heading, add a placeholder DIV **directly under that heading**:

   <div id="archive-player-anchor"></div>

3) Ensure your KupMuff logo element has an id you can target. Example:

   <a id="logo-kupmuff" href="/shows/kupmuff/">The KupMuff Show</a>

4) Include the CSS & JS (ideally just before </body>):

   <link rel="stylesheet" href="/kupmuff/archive-player.css">
   <script type="module" src="/kupmuff/archive-player.js"></script>

5) Feed path is set to **/assets/feeds/KupMuff/RSS-KupMuff.xml**. If your path differs, update the third argument in:
   KMArchivePlayer.attachToLogo("#logo-kupmuff", "#archive-player-anchor", "/assets/feeds/KupMuff/RSS-KupMuff.xml")

Notes
-----
• Autoplay is not forced (browsers often block). Newest episode is selected; user presses Play.
• Episode list is scrollable and begins with 5 items.
• "Load 10 more" reveals more until the end, then auto‑hides.
• If your logo is a link, navigation is prevented so you stay on the page.

Optional API
------------
Render on page load (for a dedicated show page) without waiting for a click:

   <script>
     document.addEventListener("DOMContentLoaded", () => {
       KMArchivePlayer.renderAt("#archive-player-anchor", "/assets/feeds/KupMuff/RSS-KupMuff.xml", { initialCount: 5 });
     });
   </script>