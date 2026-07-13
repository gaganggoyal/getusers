/*!
 * GetUsers embeddable giveaway widget loader.
 *
 * Usage (one line on any page):
 *   <script async src="https://your-getusers-host/embed.js" data-giveaway="GIVEAWAY_ID"></script>
 *
 * Optional attributes:
 *   data-width="420"   max width in px (default: 100% of container)
 *
 * The script replaces its own <script> tag with a responsive iframe pointing at
 * /embed/GIVEAWAY_ID and auto-resizes it to fit the content.
 */
(function () {
  "use strict";

  var current =
    document.currentScript ||
    (function () {
      var s = document.getElementsByTagName("script");
      return s[s.length - 1];
    })();
  if (!current) return;

  var origin = new URL(current.src, window.location.href).origin;
  var frames = {}; // giveawayId -> iframe element

  function mount(script) {
    var id = script.getAttribute("data-giveaway");
    if (!id || script.dataset.guMounted) return;
    script.dataset.guMounted = "1";

    var iframe = document.createElement("iframe");
    iframe.src = origin + "/embed/" + encodeURIComponent(id);
    iframe.title = "GetUsers giveaway";
    iframe.loading = "lazy";
    iframe.setAttribute("scrolling", "no");
    iframe.setAttribute("frameborder", "0");
    iframe.allowTransparency = true;
    iframe.style.width = "100%";
    iframe.style.maxWidth = (script.getAttribute("data-width") || "440") + "px";
    iframe.style.border = "0";
    iframe.style.height = "300px"; // placeholder until the frame reports its size
    iframe.style.colorScheme = "normal";
    iframe.style.display = "block";
    iframe.style.overflow = "hidden";

    frames[id] = iframe;
    // Insert the iframe where the script tag sits, then remove the script.
    if (script.parentNode) {
      script.parentNode.insertBefore(iframe, script);
    }
  }

  // Only accept resize messages from our own origin and known giveaway ids.
  window.addEventListener("message", function (e) {
    if (e.origin !== origin) return;
    var d = e.data;
    if (!d || d.type !== "getusers:embed" || d.event !== "size") return;
    var iframe = frames[d.id];
    if (iframe && typeof d.height === "number" && d.height > 0) {
      iframe.style.height = d.height + "px";
    }
  });

  // Mount this script's own embed, plus any other embeds already on the page.
  mount(current);
  var all = document.querySelectorAll("script[data-giveaway]");
  for (var i = 0; i < all.length; i++) mount(all[i]);
})();
