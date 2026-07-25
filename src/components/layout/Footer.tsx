/**
 * サイト共通フッター（デザイン home_10 の components/footer.html 由来）
 * 全ページで使い回す（トップページ含む）
 */
// 旧フッター互換のため user prop を受け取るが使用しない
export default function Footer(_legacyProps: { user?: unknown } = {}) {
    return (
        <footer>
            <div className="f_brand">
                <p className="f_logo"><img src="/home/img/logo/dark_mode.svg" alt="原石航路" /></p>
                <p className="f_copy_text">
                    原石航路は、書き手と読み手をつなぐ場所。<br />あなたの物語が、誰かの心を照らします。
                </p>
                <div className="f_actions">
                    <a className="f_post oct_fill" href="/post" data-set-view="writer">作品を投稿する</a>
                    <a className="f_find oct_line" href="/search">作品を探す</a>
                </div>
            </div>
            <nav>
                <div>
                    <h2>はじめての方へ</h2>
                    <ul>
                        <li><a href="/about">原石航路とは</a></li>
                        <li><a href="/guide">投稿ガイド</a></li>
                        <li><a href="/faq">よくある質問</a></li>
                    </ul>
                </div>
                <div>
                    <h2>サポート</h2>
                    <ul>
                        <li><a href="/help">ヘルプ・FAQ</a></li>
                        <li><a href="/contact">お問い合わせ</a></li>
                        <li><a href="/feedback">ご意見・ご要望</a></li>
                    </ul>
                </div>
                <div>
                    <h2>規約・ガイドライン</h2>
                    <ul>
                        <li><a href="/terms">利用規約</a></li>
                        <li><a href="/privacy">プライバシーポリシー</a></li>
                        <li><a href="/guidelines">投稿ガイドライン</a></li>
                    </ul>
                </div>
                <div>
                    <h2>サービス</h2>
                    <ul>
                        <li><a href="/post" data-set-view="writer">作品を投稿する</a></li>
                        <li><a href="/search">作品を探す</a></li>
                        <li><a href="/ranking">ランキング</a></li>
                        <li><a href="/history" className="login">閲覧履歴</a></li>
                        <li><a href="/mypage" className="login">マイページ</a></li>
                    </ul>
                </div>
            </nav>
            <p className="f_copyright"><small>© 2025 原石航路 All Rights Reserved.</small></p>
        </footer>
    )
}
