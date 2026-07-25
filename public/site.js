/* ============================================================
   原石航路 サイト共通スクリプト（デザイン home_10 由来）
   ・全ページで読み込む（src/app/layout.tsx）
   ・テーマ / ビュー / ログイン状態は <body> の data 属性が持つ:
       data-theme: light | dark   … localStorage("theme") と同期
       data-view : reader | writer … localStorage("gsk_view") と同期
       data-auth : guest | login   … サーバー（layout.tsx）が出力
   ・auth_toggle.js（開発用ログイン切替）は削除済み
   ============================================================ */


/* ===================== js/menu.js ===================== */
/* ==========================================================
   ハンバーガーメニュー開閉
   header は fetch で後から挿入されるため、
   document への委譲でタイミング問題を回避
========================================================== */

(() => {
    "use strict";

    document.addEventListener("click", (e) => {
        const open = e.target.closest(".nav_menu_open");
        if (open) {
            e.preventDefault();
            document.querySelector(".sub_nav")?.classList.add("is_open");
            return;
        }

        const close = e.target.closest(".nav_menu_close");
        if (close) {
            close.closest(".sub_nav")?.classList.remove("is_open");
            return;
        }

        // パネル外（オーバーレイ）クリックで閉じる
        const sub = e.target.closest(".sub_nav");
        if (sub && e.target === sub) {
            sub.classList.remove("is_open");
        }
    });

    // Esc で閉じる
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            document.querySelector(".sub_nav.is_open")?.classList.remove("is_open");
        }
    });
})();


/* ===================== トグル（元: thema_toggle.js / writer_toggle.js / view_switch.js） ===================== */
(() => {
    "use strict";

    // 旧サイトからの localStorage キーを継続利用（利用者の設定を引き継ぐ）
    const THEME_KEY = "theme";
    const VIEW_KEY = "gsk_view";

    function save(key, value) {
        try { localStorage.setItem(key, value); } catch { /* private mode 等 */ }
    }

    document.addEventListener("click", (e) => {
        // ダークモード / ライトモード切替
        const theme = e.target.closest("#theme-toggle");
        if (theme) {
            const dark = document.body.dataset.theme === "dark";
            document.body.dataset.theme = dark ? "light" : "dark";
            theme.setAttribute("aria-checked", String(!dark));
            save(THEME_KEY, document.body.dataset.theme);
            return;
        }

        // 書き手 / 読み手切替
        const writer = e.target.closest("#writer-toggle");
        if (writer) {
            const isWriter = document.body.dataset.view === "writer";
            document.body.dataset.view = isWriter ? "reader" : "writer";
            writer.setAttribute("aria-checked", String(!isWriter));
            save(VIEW_KEY, document.body.dataset.view);
            return;
        }

        // data-set-view（「作品を投稿する」等。リンク遷移は妨げない）
        const el = e.target.closest("[data-set-view]");
        if (el) {
            document.body.dataset.view = el.dataset.setView;
            save(VIEW_KEY, el.dataset.setView);
        }
    });

    // トグルの aria 初期値
    function syncAria() {
        document.querySelector("#theme-toggle")
            ?.setAttribute("aria-checked", String(document.body.dataset.theme === "dark"));
        document.querySelector("#writer-toggle")
            ?.setAttribute("aria-checked", String(document.body.dataset.view === "writer"));
    }

    // 保存済みのテーマ / ビューを body に適用する。
    // React によるレイアウト再描画やページ内スクリプトが body の
    // data 属性をサーバー初期値（light / reader）へ戻してしまっても、
    // MutationObserver が検知して即座に保存値へ復元する（全ページ共通の保険）。
    function applySaved() {
        let changed = false;
        try {
            const t = localStorage.getItem(THEME_KEY);
            if ((t === "dark" || t === "light") && document.body.dataset.theme !== t) {
                document.body.dataset.theme = t;
                changed = true;
            }
            const v = localStorage.getItem(VIEW_KEY);
            if ((v === "reader" || v === "writer") && document.body.dataset.view !== v) {
                document.body.dataset.view = v;
                changed = true;
            }
        } catch { /* private mode 等 */ }
        if (changed || true) syncAria();
    }

    function start() {
        applySaved();
        new MutationObserver(applySaved).observe(document.body, {
            attributes: true,
            attributeFilter: ["data-theme", "data-view"],
        });
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start, { once: true });
    } else {
        start();
    }
})();


/* ===================== js/bg/perlin.js ===================== */
/*
 * A speed-improved perlin and simplex noise algorithms for 2D.
 *
 * Based on example code by Stefan Gustavson (stegu@itn.liu.se).
 * Optimisations by Peter Eastman (peastman@drizzle.stanford.edu).
 * Better rank ordering method by Stefan Gustavson in 2012.
 * Converted to Javascript by Joseph Gentle.
 */

(function (global) {
    var module = typeof exports === 'object' ? exports : (global.noise = {});

    function Grad(x, y, z) {
        this.x = x; this.y = y; this.z = z;
    }

    Grad.prototype.dot2 = function (x, y) {
        return this.x * x + this.y * y;
    };

    Grad.prototype.dot3 = function (x, y, z) {
        return this.x * x + this.y * y + this.z * z;
    };

    var grad3 = [new Grad(1, 1, 0), new Grad(-1, 1, 0), new Grad(1, -1, 0), new Grad(-1, -1, 0),
    new Grad(1, 0, 1), new Grad(-1, 0, 1), new Grad(1, 0, -1), new Grad(-1, 0, -1),
    new Grad(0, 1, 1), new Grad(0, -1, 1), new Grad(0, 1, -1), new Grad(0, -1, -1)];

    var p = [151, 160, 137, 91, 90, 15,
        131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23,
        190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33,
        88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166,
        77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244,
        102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196,
        135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123,
        5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42,
        223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
        129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228,
        251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107,
        49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254,
        138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180];
    // To remove the need for index wrapping, double the permutation table length
    var perm = new Array(512);
    var gradP = new Array(512);

    // This isn't a very good seeding function, but it works ok. It supports 2^16
    // different seed values. Write something better if you need more seeds.
    module.seed = function (seed) {
        if (seed > 0 && seed < 1) {
            // Scale the seed out
            seed *= 65536;
        }

        seed = Math.floor(seed);
        if (seed < 256) {
            seed |= seed << 8;
        }

        for (var i = 0; i < 256; i++) {
            var v;
            if (i & 1) {
                v = p[i] ^ (seed & 255);
            } else {
                v = p[i] ^ ((seed >> 8) & 255);
            }

            perm[i] = perm[i + 256] = v;
            gradP[i] = gradP[i + 256] = grad3[v % 12];
        }
    };

    module.seed(0);

    /*
    for(var i=0; i<256; i++) {
      perm[i] = perm[i + 256] = p[i];
      gradP[i] = gradP[i + 256] = grad3[perm[i] % 12];
    }*/

    // Skewing and unskewing factors for 2, 3, and 4 dimensions
    var F2 = 0.5 * (Math.sqrt(3) - 1);
    var G2 = (3 - Math.sqrt(3)) / 6;

    var F3 = 1 / 3;
    var G3 = 1 / 6;

    // 2D simplex noise
    module.simplex2 = function (xin, yin) {
        var n0, n1, n2; // Noise contributions from the three corners
        // Skew the input space to determine which simplex cell we're in
        var s = (xin + yin) * F2; // Hairy factor for 2D
        var i = Math.floor(xin + s);
        var j = Math.floor(yin + s);
        var t = (i + j) * G2;
        var x0 = xin - i + t; // The x,y distances from the cell origin, unskewed.
        var y0 = yin - j + t;
        // For the 2D case, the simplex shape is an equilateral triangle.
        // Determine which simplex we are in.
        var i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
        if (x0 > y0) { // lower triangle, XY order: (0,0)->(1,0)->(1,1)
            i1 = 1; j1 = 0;
        } else {    // upper triangle, YX order: (0,0)->(0,1)->(1,1)
            i1 = 0; j1 = 1;
        }
        // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
        // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
        // c = (3-sqrt(3))/6
        var x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
        var y1 = y0 - j1 + G2;
        var x2 = x0 - 1 + 2 * G2; // Offsets for last corner in (x,y) unskewed coords
        var y2 = y0 - 1 + 2 * G2;
        // Work out the hashed gradient indices of the three simplex corners
        i &= 255;
        j &= 255;
        var gi0 = gradP[i + perm[j]];
        var gi1 = gradP[i + i1 + perm[j + j1]];
        var gi2 = gradP[i + 1 + perm[j + 1]];
        // Calculate the contribution from the three corners
        var t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 < 0) {
            n0 = 0;
        } else {
            t0 *= t0;
            n0 = t0 * t0 * gi0.dot2(x0, y0);  // (x,y) of grad3 used for 2D gradient
        }
        var t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 < 0) {
            n1 = 0;
        } else {
            t1 *= t1;
            n1 = t1 * t1 * gi1.dot2(x1, y1);
        }
        var t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 < 0) {
            n2 = 0;
        } else {
            t2 *= t2;
            n2 = t2 * t2 * gi2.dot2(x2, y2);
        }
        // Add contributions from each corner to get the final noise value.
        // The result is scaled to return values in the interval [-1,1].
        return 70 * (n0 + n1 + n2);
    };

    // 3D simplex noise
    module.simplex3 = function (xin, yin, zin) {
        var n0, n1, n2, n3; // Noise contributions from the four corners

        // Skew the input space to determine which simplex cell we're in
        var s = (xin + yin + zin) * F3; // Hairy factor for 2D
        var i = Math.floor(xin + s);
        var j = Math.floor(yin + s);
        var k = Math.floor(zin + s);

        var t = (i + j + k) * G3;
        var x0 = xin - i + t; // The x,y distances from the cell origin, unskewed.
        var y0 = yin - j + t;
        var z0 = zin - k + t;

        // For the 3D case, the simplex shape is a slightly irregular tetrahedron.
        // Determine which simplex we are in.
        var i1, j1, k1; // Offsets for second corner of simplex in (i,j,k) coords
        var i2, j2, k2; // Offsets for third corner of simplex in (i,j,k) coords
        if (x0 >= y0) {
            if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
            else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
            else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
        } else {
            if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
            else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
            else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
        }
        // A step of (1,0,0) in (i,j,k) means a step of (1-c,-c,-c) in (x,y,z),
        // a step of (0,1,0) in (i,j,k) means a step of (-c,1-c,-c) in (x,y,z), and
        // a step of (0,0,1) in (i,j,k) means a step of (-c,-c,1-c) in (x,y,z), where
        // c = 1/6.
        var x1 = x0 - i1 + G3; // Offsets for second corner
        var y1 = y0 - j1 + G3;
        var z1 = z0 - k1 + G3;

        var x2 = x0 - i2 + 2 * G3; // Offsets for third corner
        var y2 = y0 - j2 + 2 * G3;
        var z2 = z0 - k2 + 2 * G3;

        var x3 = x0 - 1 + 3 * G3; // Offsets for fourth corner
        var y3 = y0 - 1 + 3 * G3;
        var z3 = z0 - 1 + 3 * G3;

        // Work out the hashed gradient indices of the four simplex corners
        i &= 255;
        j &= 255;
        k &= 255;
        var gi0 = gradP[i + perm[j + perm[k]]];
        var gi1 = gradP[i + i1 + perm[j + j1 + perm[k + k1]]];
        var gi2 = gradP[i + i2 + perm[j + j2 + perm[k + k2]]];
        var gi3 = gradP[i + 1 + perm[j + 1 + perm[k + 1]]];

        // Calculate the contribution from the four corners
        var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
        if (t0 < 0) {
            n0 = 0;
        } else {
            t0 *= t0;
            n0 = t0 * t0 * gi0.dot3(x0, y0, z0);  // (x,y) of grad3 used for 2D gradient
        }
        var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
        if (t1 < 0) {
            n1 = 0;
        } else {
            t1 *= t1;
            n1 = t1 * t1 * gi1.dot3(x1, y1, z1);
        }
        var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
        if (t2 < 0) {
            n2 = 0;
        } else {
            t2 *= t2;
            n2 = t2 * t2 * gi2.dot3(x2, y2, z2);
        }
        var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
        if (t3 < 0) {
            n3 = 0;
        } else {
            t3 *= t3;
            n3 = t3 * t3 * gi3.dot3(x3, y3, z3);
        }
        // Add contributions from each corner to get the final noise value.
        // The result is scaled to return values in the interval [-1,1].
        return 32 * (n0 + n1 + n2 + n3);

    };

    // ##### Perlin noise stuff

    function fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    function lerp(a, b, t) {
        return (1 - t) * a + t * b;
    }

    // 2D Perlin Noise
    module.perlin2 = function (x, y) {
        // Find unit grid cell containing point
        var X = Math.floor(x), Y = Math.floor(y);
        // Get relative xy coordinates of point within that cell
        x = x - X; y = y - Y;
        // Wrap the integer cells at 255 (smaller integer period can be introduced here)
        X = X & 255; Y = Y & 255;

        // Calculate noise contributions from each of the four corners
        var n00 = gradP[X + perm[Y]].dot2(x, y);
        var n01 = gradP[X + perm[Y + 1]].dot2(x, y - 1);
        var n10 = gradP[X + 1 + perm[Y]].dot2(x - 1, y);
        var n11 = gradP[X + 1 + perm[Y + 1]].dot2(x - 1, y - 1);

        // Compute the fade curve value for x
        var u = fade(x);

        // Interpolate the four results
        return lerp(
            lerp(n00, n10, u),
            lerp(n01, n11, u),
            fade(y));
    };

    // 3D Perlin Noise
    module.perlin3 = function (x, y, z) {
        // Find unit grid cell containing point
        var X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
        // Get relative xyz coordinates of point within that cell
        x = x - X; y = y - Y; z = z - Z;
        // Wrap the integer cells at 255 (smaller integer period can be introduced here)
        X = X & 255; Y = Y & 255; Z = Z & 255;

        // Calculate noise contributions from each of the eight corners
        var n000 = gradP[X + perm[Y + perm[Z]]].dot3(x, y, z);
        var n001 = gradP[X + perm[Y + perm[Z + 1]]].dot3(x, y, z - 1);
        var n010 = gradP[X + perm[Y + 1 + perm[Z]]].dot3(x, y - 1, z);
        var n011 = gradP[X + perm[Y + 1 + perm[Z + 1]]].dot3(x, y - 1, z - 1);
        var n100 = gradP[X + 1 + perm[Y + perm[Z]]].dot3(x - 1, y, z);
        var n101 = gradP[X + 1 + perm[Y + perm[Z + 1]]].dot3(x - 1, y, z - 1);
        var n110 = gradP[X + 1 + perm[Y + 1 + perm[Z]]].dot3(x - 1, y - 1, z);
        var n111 = gradP[X + 1 + perm[Y + 1 + perm[Z + 1]]].dot3(x - 1, y - 1, z - 1);

        // Compute the fade curve value for x, y, z
        var u = fade(x);
        var v = fade(y);
        var w = fade(z);

        // Interpolate
        return lerp(
            lerp(
                lerp(n000, n100, u),
                lerp(n001, n101, u), w),
            lerp(
                lerp(n010, n110, u),
                lerp(n011, n111, u), w),
            v);
    };

})(this);

/* ===================== js/bg/canvas_resize.js ===================== */
(() => {
    "use strict";

    class CanvasResize {

        constructor(canvas, onResize = null) {

            if (!(canvas instanceof HTMLCanvasElement)) {
                throw new Error("CanvasResize: canvas element is required.");
            }

            this.canvas = canvas;
            this.parent = canvas.parentElement;

            if (!this.parent) {
                throw new Error("CanvasResize: canvas has no parent.");
            }

            this.ctx = canvas.getContext("2d");

            this.width = 0;
            this.height = 0;
            this.dpr = 1;

            this.onResize = onResize;

            this.resize = this.resize.bind(this);

            this.observer = new ResizeObserver(this.resize);
            this.observer.observe(this.parent);

            window.addEventListener(
                "resize",
                this.resize,
                { passive: true }
            );

            this.resize();
        }

        resize() {

            this.dpr = window.devicePixelRatio || 1;

            const width = this.parent.clientWidth;
            const height = this.parent.clientHeight;

            if (
                width === this.width &&
                height === this.height &&
                this.dpr === (this._lastDpr ?? this.dpr)
            ) {
                return;
            }

            this.width = width;
            this.height = height;
            this._lastDpr = this.dpr;

            this.canvas.style.width = width + "px";
            this.canvas.style.height = height + "px";

            this.canvas.width = Math.ceil(width * this.dpr);
            this.canvas.height = Math.ceil(height * this.dpr);

            this.ctx.setTransform(
                this.dpr,
                0,
                0,
                this.dpr,
                0,
                0
            );

            if (typeof this.onResize === "function") {
                this.onResize(
                    this.width,
                    this.height,
                    this.dpr
                );
            }
        }

        destroy() {

            this.observer.disconnect();

            window.removeEventListener(
                "resize",
                this.resize
            );
        }

    }

    window.CanvasResize = CanvasResize;

})();

/* ===================== js/bg/paper.js（ライトモード背景） ===================== */
(() => {
    "use strict";

    const canvas = document.getElementById("bg-paper");
    if (!canvas) return; // 念のためのガード（layout が常に描画する）
    const ctx = canvas.getContext("2d", { alpha: false });

    noise.seed(Math.random());

    const CONFIG = {
        tileSize: 512,

        base: {
            r: 247,
            g: 247,
            b: 240,
        },

        angle: 30 * Math.PI / 180,

        warpScale: 0.004,
        warpStrength: 4,

        macroScale: 0.003,
        mediumScale: 0.012,
        fineScale: 0.065,

        macroStrength: 6.0,
        mediumStrength: 3.2,
        fineStrength: 1.6,

        fiberScaleX: 0.006,
        fiberScaleY: 0.055,
        fiberStrength: 2.0,

        grain: 2.2,
        colorVariance: 0.8
    };

    const tile = document.createElement("canvas");
    tile.width = CONFIG.tileSize;
    tile.height = CONFIG.tileSize;

    const tctx = tile.getContext("2d", {
        alpha: false
    });

    //----------------------------------------------------
    // pseudo random
    //----------------------------------------------------

    let seed = (Math.random() * 2147483647) | 0;

    function rand() {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
    }

    //----------------------------------------------------
    // utils
    //----------------------------------------------------

    function clamp(v) {
        return v < 0 ? 0 : v > 255 ? 255 : v;
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    //----------------------------------------------------
    // fractal noise
    //----------------------------------------------------

    function fbm(x, y) {

        let value = 0;
        let amp = 0.5;
        let freq = 1;

        for (let i = 0; i < 4; i++) {

            value += amp * noise.perlin2(
                x * freq,
                y * freq
            );

            freq *= 2;
            amp *= 0.5;
        }

        return value;
    }

    //----------------------------------------------------
    // domain warp
    //----------------------------------------------------

    function warp(x, y) {

        const dx =
            noise.perlin2(
                x * CONFIG.warpScale,
                y * CONFIG.warpScale
            ) * CONFIG.warpStrength;

        const dy =
            noise.perlin2(
                (x + 200) * CONFIG.warpScale,
                (y + 200) * CONFIG.warpScale
            ) * CONFIG.warpStrength;

        return {
            x: x + dx,
            y: y + dy
        };
    }

    //----------------------------------------------------
    // generate paper texture
    //----------------------------------------------------

    function generateTexture() {

        const image =
            tctx.createImageData(
                CONFIG.tileSize,
                CONFIG.tileSize
            );

        const data = image.data;

        const cos = Math.cos(CONFIG.angle);
        const sin = Math.sin(CONFIG.angle);

        for (let y = 0; y < CONFIG.tileSize; y++) {

            for (let x = 0; x < CONFIG.tileSize; x++) {

                const p = warp(x, y);

                const nx = p.x;
                const ny = p.y;

                //------------------------------------
                // macro paper cloud
                //------------------------------------

                const macro =
                    fbm(
                        nx * CONFIG.macroScale,
                        ny * CONFIG.macroScale
                    );

                //------------------------------------
                // medium texture
                //------------------------------------

                const medium =
                    fbm(
                        nx * CONFIG.mediumScale,
                        ny * CONFIG.mediumScale
                    );

                //------------------------------------
                // fine grain
                //------------------------------------

                const fine =
                    fbm(
                        nx * CONFIG.fineScale,
                        ny * CONFIG.fineScale
                    );

                //------------------------------------
                // paper direction (30°)
                //------------------------------------

                const rx =
                    nx * cos -
                    ny * sin;

                const ry =
                    nx * sin +
                    ny * cos;

                const fiber =
                    noise.perlin2(
                        rx * CONFIG.fiberScaleX,
                        ry * CONFIG.fiberScaleY
                    );

                //------------------------------------
                // random grain
                //------------------------------------

                const grain =
                    (rand() - 0.5) *
                    CONFIG.grain;

                //------------------------------------
                // very small paper speckles
                //------------------------------------

                let speckle = 0;

                if (rand() < 0.003) {

                    speckle =
                        rand() < 0.5
                            ? -5
                            : 4;
                }

                //------------------------------------
                // light value
                //------------------------------------

                const light =
                    macro * CONFIG.macroStrength +
                    medium * CONFIG.mediumStrength +
                    fine * CONFIG.fineStrength +
                    fiber * CONFIG.fiberStrength +
                    grain +
                    speckle;

                //------------------------------------
                // subtle color shift
                //------------------------------------

                const warm =
                    medium *
                    CONFIG.colorVariance;

                const r =
                    CONFIG.base.r +
                    light +
                    warm * 0.8;

                const g =
                    CONFIG.base.g +
                    light +
                    warm * 0.2;

                const b =
                    CONFIG.base.b +
                    light -
                    warm * 0.6;

                const i =
                    (y * CONFIG.tileSize + x) * 4;

                data[i] = clamp(r);
                data[i + 1] = clamp(g);
                data[i + 2] = clamp(b);
                data[i + 3] = 255;
            }
        }

        tctx.putImageData(image, 0, 0);
        tctx.save();

        tctx.strokeStyle = "rgba(255,255,250,0.025)";
        tctx.lineWidth = 0.35;
        tctx.lineCap = "round";

        for (let i = 0; i < 1800; i++) {

            const x = rand() * CONFIG.tileSize;
            const y = rand() * CONFIG.tileSize;

            const length =
                lerp(2, 7, rand());

            const angle =
                CONFIG.angle +
                (rand() - 0.5) *
                (10 * Math.PI / 180);

            tctx.beginPath();

            tctx.moveTo(x, y);

            tctx.lineTo(
                x + Math.cos(angle) * length,
                y + Math.sin(angle) * length
            );

            tctx.stroke();
        }

        tctx.restore();
    }

    //--------------------------------------------------
    // draw
    //--------------------------------------------------

    let pattern = null;

    function draw() {

        if (!pattern) {
            pattern = ctx.createPattern(
                tile,
                "repeat"
            );
        }

        ctx.setTransform(1, 0, 0, 1, 0, 0);

        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        ctx.fillStyle = pattern;

        ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );
    }

    //--------------------------------------------------
    // init
    //--------------------------------------------------

    generateTexture();

    pattern = ctx.createPattern(
        tile,
        "repeat"
    );

    const canvasResize =
        new CanvasResize(
            canvas,
            draw
        );
})();

/* ===================== js/bg/binding.js（ダークモード背景） ===================== */
(function (global) {
    "use strict";

    /* ==========================================================
     * Default Options
     * ========================================================== */

    const DEFAULTS = {

        baseColor: "#151d18",

        seed: 8427,

        textureSize: 512,

        dprCap: 1.5

    };

    /* ==========================================================
     * Utility
     * ========================================================== */

    function clamp(v, min, max) {

        return v < min ? min : (v > max ? max : v);

    }

    function lerp(a, b, t) {

        return a + (b - a) * t;

    }

    function smoothstep(a, b, x) {

        x = clamp((x - a) / (b - a), 0, 1);

        return x * x * (3 - 2 * x);

    }

    function hexToRgb(hex) {

        hex = hex.replace("#", "");

        if (hex.length === 3) {

            hex = hex.replace(/(.)/g, "$1$1");

        }

        return [

            parseInt(hex.substr(0, 2), 16),

            parseInt(hex.substr(2, 2), 16),

            parseInt(hex.substr(4, 2), 16)

        ];

    }

    /* ==========================================================
     * Seed Hash
     * ========================================================== */

    function hash(x, y, seed) {

        let h =
            Math.imul(x, 374761393) +
            Math.imul(y, 668265263) +
            Math.imul(seed, 2147483647);

        h = (h ^ (h >> 13)) * 1274126177;

        return ((h ^ (h >> 16)) >>> 0) / 4294967295;

    }

    /* ==========================================================
     * Ridged Perlin
     * ========================================================== */

    function ridged(x, y) {

        let sum = 0;

        let amp = 0.55;

        let freq = 1;

        for (let i = 0; i < 4; i++) {

            let n = noise.perlin2(

                x * freq,

                y * freq

            );

            n = 1 - Math.abs(n);

            n *= n;

            sum += n * amp;

            amp *= 0.5;

            freq *= 2;

        }

        return sum;

    }

    /* ==========================================================
     * Weak Domain Warp
     * ========================================================== */

    function warpedRidged(x, y) {

        const warp = 1.15;

        const ox =

            noise.perlin2(

                x * 0.32 + 15.4,

                y * 0.32 + 91.7

            ) * warp;

        const oy =

            noise.perlin2(

                x * 0.32 - 53.8,

                y * 0.32 + 24.1

            ) * warp;

        return ridged(

            x + ox,

            y + oy

        );

    }

    /* ==========================================================
     * Weak Cell Noise
     * ========================================================== */

    function cellNoise(x, y, seed) {

        const s = 18;

        const gx = Math.floor(x / s);

        const gy = Math.floor(y / s);

        let nearest = 9999;

        for (let yy = -1; yy <= 1; yy++) {

            for (let xx = -1; xx <= 1; xx++) {

                const cx = gx + xx;

                const cy = gy + yy;

                const px =

                    (cx +

                        hash(cx, cy, seed))

                    * s;

                const py =

                    (cy +

                        hash(cy, cx, seed + 99))

                    * s;

                const dx = px - x;

                const dy = py - y;

                const d = Math.sqrt(

                    dx * dx +

                    dy * dy

                );

                if (d < nearest) {

                    nearest = d;

                }

            }

        }

        return smoothstep(

            0,

            s * 0.9,

            nearest

        );

    }

    /* ==========================================================
     * Height Map
     * ========================================================== */

    function buildHeightMap(size, seed) {

        const map = new Float32Array(size * size);

        for (let y = 0; y < size; y++) {

            for (let x = 0; x < size; x++) {

                const i = y * size + x;

                /*
                 * Large geological forms
                 */

                const lx = x / 130;
                const ly = y / 130;

                /*
                 * Medium relief
                 */

                const mx = x / 42;
                const my = y / 42;

                /*
                 * Crystal scale
                 */

                const sx = x / 7;
                const sy = y / 7;

                /*
                 * Base fractured surface
                 */

                let h =
                    warpedRidged(lx, ly) * 0.62;

                /*
                 * Medium undulation
                 */

                h +=
                    noise.perlin2(mx + 37.2, my - 18.5)
                    * 0.14;

                /*
                 * Secondary ridges
                 */

                h +=
                    warpedRidged(
                        mx * 1.7 + 9,
                        my * 1.7 - 4
                    ) * 0.10;

                /*
                 * Weak cellular breakup
                 */

                h -=
                    cellNoise(x, y, seed)
                    * 0.045;

                /*
                 * Fine crystalline grain
                 */

                h +=
                    noise.perlin2(
                        sx,
                        sy
                    ) * 0.020;

                h +=
                    noise.perlin2(
                        sx * 2.1 + 83,
                        sy * 2.1 - 29
                    ) * 0.010;

                /*
                 * Tiny random mineral variation
                 */

                h +=
                    (hash(x, y, seed) - 0.5)
                    * 0.008;

                /*
                 * Compress extremes
                 * (avoids CG-looking peaks)
                 */

                h = Math.tanh(h * 1.35);

                map[i] = h;

            }

        }

        return map;

    }

    /* ==========================================================
     * Vesicles
     * ========================================================== */

    function addVesicles(map, size, seed) {

        const count = 180;

        for (let n = 0; n < count; n++) {

            const cx = hash(n, 13, seed) * size;
            const cy = hash(n, 41, seed) * size;

            const r = 0.8 + hash(n, 87, seed) * 2.5;

            const minX = Math.max(0, Math.floor(cx - r - 1));
            const maxX = Math.min(size - 1, Math.ceil(cx + r + 1));

            const minY = Math.max(0, Math.floor(cy - r - 1));
            const maxY = Math.min(size - 1, Math.ceil(cy + r + 1));

            for (let y = minY; y <= maxY; y++) {

                for (let x = minX; x <= maxX; x++) {

                    const dx = x - cx;
                    const dy = y - cy;

                    const d = Math.sqrt(dx * dx + dy * dy);

                    if (d < r) {

                        const t = 1 - d / r;

                        map[y * size + x] -= t * 0.10;

                    }

                }

            }

        }

    }

    /* ==========================================================
     * Surface Scratches
     * ========================================================== */

    function addScratches(map, size, seed) {

        const count = 70;

        for (let i = 0; i < count; i++) {

            let x = hash(i, 111, seed) * size;
            let y = hash(i, 222, seed) * size;

            const angle =
                (-18 + hash(i, 333, seed) * 36)
                * Math.PI / 180;

            const length =
                18 +
                hash(i, 444, seed) * 55;

            const dx = Math.cos(angle);
            const dy = Math.sin(angle);

            for (let s = 0; s < length; s++) {

                const px = Math.round(x + dx * s);
                const py = Math.round(y + dy * s);

                if (
                    px < 0 ||
                    py < 0 ||
                    px >= size ||
                    py >= size
                ) continue;

                map[py * size + px] -= 0.035;

            }

        }

    }

    /* ==========================================================
     * Prepare Height Map
     * ========================================================== */

    function prepareHeightMap(options) {

        const size = options.textureSize;

        const map = buildHeightMap(
            size,
            options.seed
        );

        addVesicles(
            map,
            size,
            options.seed
        );

        addScratches(
            map,
            size,
            options.seed
        );

        return map;

    }

    /* ==========================================================
     * Build Texture
     * ========================================================== */

    function buildTexture(options) {

        const size = options.textureSize;

        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext("2d", {
            alpha: false
        });

        const image = ctx.createImageData(size, size);

        const height = prepareHeightMap(options);

        const rgb = hexToRgb(options.baseColor);

        const lightX = -0.95;
        const lightY = 0.18;
        const ambient = 0.72;

        for (let y = 1; y < size - 1; y++) {

            for (let x = 1; x < size - 1; x++) {

                const i = y * size + x;

                const dx =
                    height[i + 1] -
                    height[i - 1];

                const dy =
                    height[i + size] -
                    height[i - size];

                /*
                 * Horizontal basalt lighting.
                 * Shadows extend gently sideways instead of vertically.
                 */

                let shade =
                    ambient
                    - dx * lightX * 0.85
                    - dy * lightY * 0.35;

                /*
                 * Increase local contrast slightly.
                 */

                shade =
                    Math.pow(
                        clamp(shade, 0, 1),
                        0.84 /* 調整: 0.92 → 0.84（局所コントラスト強化） */
                    );

                /*
                 * Tiny crystal sparkle.
                 */

                shade +=
                    noise.perlin2(
                        x * 0.42 + 17,
                        y * 0.42 - 11
                    ) * 0.012;

                shade = clamp(shade, 0, 1);

                const p = i * 4;

                image.data[p] =
                    clamp(
                        rgb[0] + (shade - 0.5) * 34, /* 調整: 20 → 34（明暗差を強調） */
                        0,
                        255
                    );

                image.data[p + 1] =
                    clamp(
                        rgb[1] + (shade - 0.5) * 36, /* 調整: 21 → 36 */
                        0,
                        255
                    );

                image.data[p + 2] =
                    clamp(
                        rgb[2] + (shade - 0.5) * 38, /* 調整: 22 → 38 */
                        0,
                        255
                    );

                image.data[p + 3] = 255;

            }

        }

        ctx.putImageData(image, 0, 0);

        return canvas;

    }

    /* ==========================================================
     * Render
     * ========================================================== */

    function render(canvas, texture, options) {

        const rect = canvas.getBoundingClientRect();

        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d", {
            alpha: false
        });

        ctx.clearRect(0, 0, width, height);

        ctx.imageSmoothingEnabled = true;

        if ("imageSmoothingQuality" in ctx) {
            ctx.imageSmoothingQuality = "high";
        }

        ctx.drawImage(
            texture,
            0,
            0,
            texture.width,
            texture.height,
            0,
            0,
            width,
            height
        );

    }

    /* ==========================================================
     * Mount
     * ========================================================== */

    function mount(canvas, userOptions) {

        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new TypeError(
                "BasaltBackground.mount expects a canvas."
            );
        }

        const options = Object.assign(
            {},
            DEFAULTS,
            userOptions || {}
        );

        /*
         * Generate only once.
         * The texture itself is independent of viewport size.
         */
        let texture = buildTexture(options);

        /*
         * Prevent duplicate redraws.
         */
        let queued = false;

        function redraw() {

            if (queued) return;

            queued = true;

            requestAnimationFrame(() => {

                queued = false;

                render(
                    canvas,
                    texture,
                    options
                );

            });

        }

        /*
         * Canvas size management.
         * redraw() is automatically called whenever the canvas size changes.
         */
        const canvasResize = new CanvasResize(
            canvas,
            redraw
        );

        return {

            redraw,

            regenerate() {

                texture = buildTexture(options);

                redraw();

            },

            destroy() {

                canvasResize.destroy();

            }

        };

    }

    /* ==========================================================
     * Export
     * ========================================================== */

    global.BasaltBackground = {

        mount

    };

    /* ==========================================================
     * Auto Mount
     * ========================================================== */

    function autoMount() {

        const canvas =
            document.getElementById("bg-binding");

        if (!canvas) return;

        if (global.__basaltBackground) {

            global.__basaltBackground.destroy();

        }

        global.__basaltBackground =
            mount(
                canvas,
                global.BASALT_OPTIONS || {}
            );

    }

    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            autoMount,
            {
                once: true
            }
        );

    } else {

        autoMount();

    }

})(window);