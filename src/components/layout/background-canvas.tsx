/**
 * サイト共通の背景キャンバス（デザイン home_10 の div.bg）
 * ライト: 紙テクスチャ（paper.js） / ダーク: 装丁アニメーション（binding.js）
 * 描画は public/site.js が担当。全ページで layout.tsx から表示する。
 * トップページはページ全体に敷き（absolute）、他ページはビューポート固定
 * （globals.css の調整ルールを参照）。
 */
export default function BackgroundCanvas() {
    return (
        <div className="bg">
            <canvas id="bg-paper" className="light"></canvas>
            <canvas id="bg-binding" className="dark"></canvas>
        </div>
    );
}
