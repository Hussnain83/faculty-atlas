/**
 * Runs an animation loop only while the element is on screen and the tab is visible,
 * so 3D pieces scrolled out of view cost nothing. Returns a cleanup function.
 */
export function animateWhileVisible(el: Element, frame: (t: number) => void): () => void {
  let onScreen = true;
  let raf = 0;
  const running = () => onScreen && document.visibilityState === "visible";
  const loop = (t: number) => {
    if (!running()) {
      raf = 0;
      return;
    }
    frame(t);
    raf = requestAnimationFrame(loop);
  };
  const kick = () => {
    if (running() && !raf) raf = requestAnimationFrame(loop);
  };
  const io = "IntersectionObserver" in window ? new IntersectionObserver(([e]) => ((onScreen = e.isIntersecting), kick()), { rootMargin: "100px" }) : null;
  io?.observe(el);
  document.addEventListener("visibilitychange", kick);
  kick();
  return () => {
    cancelAnimationFrame(raf);
    io?.disconnect();
    document.removeEventListener("visibilitychange", kick);
  };
}
