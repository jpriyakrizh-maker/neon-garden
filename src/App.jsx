import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import "./App.css";

const rnd = (a, b) => a + Math.random() * (b - a);
const BASE = [372, 562];

// [x, y, color] of each flower top
const TOPS = [
  [232, 312, "#8a5cf6"],
  [292, 232, "#8a5cf6"],
  [371, 162, "#4a8cff"],
  [452, 230, "#ff3d7a"],
  [516, 310, "#ff3d7a"],
];

// [baseX, height, bend, width]
const BLADES = [
  [150, 370, -6, 16], [165, 420, 10, 14], [180, 300, 18, 16], [195, 470, 30, 12],
  [135, 250, 12, 14], [130, 200, 20, 12],
  [420, 120, 0, 10], [400, 110, -8, 10], [385, 90, -12, 10], [350, 100, 10, 10],
  [340, 80, 14, 10], [310, 95, -10, 10], [300, 70, -14, 10], [360, 60, 0, 8], [375, 70, 6, 8],
];
// mirror the outer left blades to the right so the plants are symmetric
BLADES.slice(0, 6).forEach(([x, h, b, w], i) =>
  BLADES.push([2 * BASE[0] - x - w, h + (i % 2 ? 15 : -10), -b, w])
);

const bladePath = ([x, h, b, w]) => {
  const ty = 580 - h;
  const tx = x + b * 3;
  return `M${x} 590 C${x + b * 0.3} ${580 - h * 0.5} ${tx - b * 0.2} ${580 - h * 0.8} ${tx} ${ty} C${tx + 4} ${580 - h * 0.8} ${x + w + b * 0.4} ${580 - h * 0.5} ${x + w} 590Z`;
};

const stemPath = (x, y) => {
  const cx = (BASE[0] + x) / 2 + (x - BASE[0]) * 0.05;
  const cy = (BASE[1] + y) / 2 + 20;
  return `M${BASE[0]} ${BASE[1]} Q${cx} ${cy} ${x} ${y}`;
};

// blue (left) and pink (right) oval chains near the base
const SEEDS = [];
for (let i = 0; i < 16; i++) {
  const t = i / 15;
  [-1, 1].forEach((side) => {
    const x = BASE[0] + side * (12 + t * 135) + (i % 2 ? 6 : -6) * side;
    const y = 566 - Math.pow(t, 0.9) * 95 + (i % 2 ? 8 : -6);
    SEEDS.push({ x, y, a: side * (-25 - t * 40) + (i % 2 ? 15 : -15), c: side < 0 ? "#2cf" : "#f4a" });
  });
}

const WIDE = [-100, -65, 65, 100, 180];
const NARROW = [-42, -21, 0, 21, 42];
// [angle, length] of the centre buds
const BUDS = [[-36, 30], [-18, 40], [0, 48], [18, 40], [36, 30]];

export default function App() {
  const root = useRef(null);
  const ctx = useRef(null);

  const stars = useMemo(
    () =>
      Array.from({ length: 260 }, (_, i) => ({
        cx: rnd(-700, 1500),
        cy: rnd(-500, 1100),
        r: rnd(0.8, 2.4),
        fill: ["#fff", "#6cf", "#c9f", "#f6a"][i % 4],
        o: rnd(0.3, 0.9),
        spark: i % 5 === 0,
      })),
    []
  );

  const play = useCallback(() => {
    ctx.current?.revert();
    ctx.current = gsap.context(() => {
      const q = gsap.utils.selector(root.current);
      const grass = q(".blade");
      const stems = q(".stem");
      const flowers = q(".flower");
      const seeds = q(".seed");

      // starting state
      stems.forEach((s) => {
        const L = s.getTotalLength();
        gsap.set(s, { strokeDasharray: L, strokeDashoffset: L });
      });
      gsap.set(seeds, { opacity: 0, scale: 0, transformOrigin: "50% 50%" });
      gsap.set(grass, { scaleY: 0, transformOrigin: "50% 100%" });
      gsap.set(q(".petal"), { scale: 0, opacity: 0, transformOrigin: "50% 100%" });
      gsap.set(q(".bud"), { scale: 0, opacity: 0, transformOrigin: "50% 100%" });
      gsap.set(q(".halo"), { opacity: 0, transformOrigin: "50% 50%" });

      // sparkling stars
      q(".star").forEach((s) => {
        gsap.set(s, { opacity: rnd(0.1, 0.35), scale: 0.5, transformOrigin: "50% 50%" });
        gsap.to(s, {
          opacity: 1,
          scale: rnd(1.5, 2.4),
          duration: rnd(0.4, 1.5),
          repeat: -1,
          yoyo: true,
          repeatDelay: rnd(0, 2),
          delay: rnd(0, 3),
          ease: "sine.inOut",
        });
      });
      q(".spark").forEach((s) => {
        gsap.set(s, { opacity: 0, scale: 0, transformOrigin: "50% 50%" });
        gsap.to(s, {
          opacity: 1,
          scale: rnd(0.8, 1.8),
          rotation: rnd(-45, 45),
          duration: rnd(0.5, 1.2),
          repeat: -1,
          yoyo: true,
          repeatDelay: rnd(0.5, 3.5),
          delay: rnd(0, 4),
          ease: "power2.inOut",
        });
      });

      const tl = gsap.timeline();

      // 1. grass first
      tl.to(grass, {
        scaleY: 1,
        duration: 2.2,
        ease: "power2.out",
        stagger: { each: 0.12, from: "edges" },
      });

      // 2. all stems
      tl.to(stems, {
        strokeDashoffset: 0,
        duration: 1.6,
        ease: "power2.inOut",
        stagger: 0.18,
      }, ">+0.2");

      // 3. pink / blue spring after the stems
      tl.to(seeds, {
        opacity: 1,
        scale: 1,
        duration: 0.4,
        ease: "back.out(3)",
        stagger: 0.04,
      }, ">+0.1");

      // 4. flowers one by one (outside -> center)
      [0, 4, 1, 3, 2].forEach((i, k) => {
        tl.to(q(`.flower-${i} .petal`), {
          scale: 1,
          opacity: 1,
          duration: 1,
          ease: "back.out(2)",
          stagger: 0.05,
        }, k === 0 ? ">+0.3" : ">-0.2");
      });

      // 4b. centre buds grow after the petals open
      tl.to(q(".bud"), {
        scale: 1,
        opacity: 1,
        duration: 0.8,
        ease: "back.out(2.5)",
        stagger: 0.04,
      }, ">-0.4");

      // 5. big cyan neon glow appears once ...
      tl.to(q(".halo"), {
        opacity: 1,
        scale: 1.15,
        duration: 2,
        stagger: 0.15,
        ease: "power2.out",
      }, ">+0.5");
      tl.to(q(".petal-fill"), { attr: { "fill-opacity": 0.95 }, duration: 2 }, "<");

      // ... and then fades away
      tl.to(q(".halo"), {
        opacity: 0, // use 0.1 if you want a faint glow to stay
        scale: 1.4,
        duration: 2.5,
        stagger: 0.15,
        ease: "power2.inOut",
      }, "+=0.3");

      // 6. idle loops (no halo pulse any more)
      tl.add(() => {
        flowers.forEach((f, i) => {
          gsap.to(f.querySelector(".sway"), {
            rotation: i % 2 ? 4 : -4, duration: 2.5 + i * 0.4,
            repeat: -1, yoyo: true, ease: "sine.inOut", transformOrigin: "50% 100%",
          });
          gsap.to(f.querySelectorAll(".bud"), {
            scale: 1.12, duration: 1.2 + i * 0.2, repeat: -1, yoyo: true,
            ease: "sine.inOut", stagger: 0.1, transformOrigin: "50% 100%",
          });
        });
        grass.forEach((p, i) =>
          gsap.to(p, { skewX: i % 2 ? 2 : -2, duration: 3 + i * 0.1, repeat: -1, yoyo: true, ease: "sine.inOut" })
        );
      });
    }, root);
  }, []);

  useLayoutEffect(() => {
    play();
    return () => ctx.current?.revert();
  }, [play]);

  return (
    <div className="app" ref={root}>
      <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMax meet">
        <defs>
          <linearGradient id="g" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#1a7a3a" />
            <stop offset="1" stopColor="#3fe27a" />
          </linearGradient>
          <radialGradient id="p">
            <stop offset="0" stopColor="#fff" />
            <stop offset=".35" stopColor="#6cf" />
            <stop offset="1" stopColor="#a5f" stopOpacity=".7" />
          </radialGradient>
          <radialGradient id="h">
            <stop offset="0" stopColor="#2cf" stopOpacity=".85" />
            <stop offset="1" stopColor="#2cf" stopOpacity="0" />
          </radialGradient>
          <filter id="f" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g>
          {stars.filter((s) => !s.spark).map((s, i) => (
            <circle key={i} className="star" cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} opacity={s.o} />
          ))}
        </g>
        <g filter="url(#f)">
          {stars.filter((s) => s.spark).map((s, i) => (
            <g key={i} transform={`translate(${s.cx} ${s.cy})`}>
              <path
                className="spark"
                d="M0 -7 L1.4 -1.4 L7 0 L1.4 1.4 L0 7 L-1.4 1.4 L-7 0 L-1.4 -1.4Z"
                fill={s.fill}
              />
            </g>
          ))}
        </g>

        <g transform="translate(28 0)">
          <g>
            {BLADES.map((b, i) => (
              <path key={i} className="blade" d={bladePath(b)} fill="url(#g)" opacity=".85" filter="url(#f)" />
            ))}
          </g>

          <g>
            {SEEDS.map((d, i) => (
              <g key={i} transform={`translate(${d.x} ${d.y}) rotate(${d.a})`}>
                <ellipse className="seed" rx="6.5" ry="10.5" fill="none" stroke={d.c} strokeWidth="1.6" />
              </g>
            ))}
          </g>

          <g fill="none" strokeLinecap="round" filter="url(#f)">
            {TOPS.map(([x, y, c], i) => (
              <path key={i} className="stem" d={stemPath(x, y)} stroke={c} strokeWidth="4" />
            ))}
          </g>

          <g>
            {TOPS.map(([x, y], i) => {
              const sz = i === 2 ? 1.15 : 1 - Math.abs(i - 2) * 0.08;
              return (
                <g key={i} className={`flower flower-${i}`} transform={`translate(${x} ${y}) scale(${sz})`}>
                  <circle className="halo" r="85" fill="url(#h)" />
                  <g className="sway" filter="url(#f)">
                    {WIDE.map((a) => (
                      <g key={a} transform={`rotate(${a}) translate(0 ${a === 180 ? -8 : 0})`}>
                        <g className="petal">
                          <ellipse className="petal-fill" cy="-26" rx="12" ry="28"
                            fill="url(#p)" fillOpacity=".45" stroke="#7ff" strokeWidth="1.4" />
                        </g>
                      </g>
                    ))}
                    {NARROW.map((a) => (
                      <g key={a} transform={`rotate(${a})`}>
                        <g className="petal">
                          <ellipse className="petal-fill" cy="-30" rx="5" ry="24"
                            fill="url(#p)" fillOpacity=".65" stroke="#fff" strokeWidth="1" />
                        </g>
                      </g>
                    ))}
                    <g className="buds">
                      {BUDS.map(([a, len]) => (
                        <g key={a} transform={`rotate(${a})`}>
                          <g className="bud">
                            <line y2={-len} stroke="#9ef" strokeWidth="1" opacity=".8" />
                            <ellipse cy={-len - 7} rx="3.5" ry="8" fill="#ff5fa2" stroke="#fff" strokeWidth=".8" />
                            <circle cy={-len - 13} r="2" fill="#fff" />
                          </g>
                        </g>
                      ))}
                      <circle r="4" fill="#fff" />
                    </g>
                  </g>
                </g>
              );
            })}
          </g>
        </g>
      </svg>
    </div>
  );
}